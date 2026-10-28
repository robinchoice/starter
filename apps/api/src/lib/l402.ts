import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import type { Database } from '@app/db';
import { serverSecrets } from '@app/db/schema';
import { APP_NAME } from '@app/shared/app';
import type { Sats } from '@app/shared/payments';
import { eq } from 'drizzle-orm';
import { createMiddleware } from 'hono/factory';
import { generateToken } from '../middleware/auth';
import type { AppEnv } from '../types';
import { t } from './i18n';
import { lightning } from './lightning';
import { clientIp, rateLimit, tooManyRequests } from './rate-limit';

// L402 (bLIP-0026) for agents that pay per call (README, „Zahlungen“). A 402
// carries an invoice and a macaroon bound to its payment hash. The agent pays
// and sends `Authorization: L402 <macaroon>:<preimage>`; sha256(preimage) is
// the proof of payment, no call to the backend. Each token buys one call.
//
// Macaroons in the binary V2 format of libmacaroons, as Aperture issues them,
// so lnget and Lightning Agent Tools read them. The identifier is version 0,
// the payment hash and a random token id.
const TOKEN_MINUTES = 60;

// Field types of the format. A caveat with a verification id (4) is third-party.
const Field = { End: 0, Location: 1, Identifier: 2, Signature: 6 } as const;
type FieldType = (typeof Field)[keyof typeof Field];

type Macaroon = { identifier: Buffer; caveats: string[]; signature: Buffer };

const hmac = (key: Buffer, data: Buffer | string) => createHmac('sha256', key).update(data).digest();

// As MakeKey in Go's macaroon package, so Aperture would accept the same root key
const derive = (rootKey: Buffer) => hmac(Buffer.from('macaroons-key-generator'), rootKey);

function sign(rootKey: Buffer, identifier: Buffer, caveats: string[]) {
  return caveats.reduce((signature, caveat) => hmac(signature, caveat), hmac(derive(rootKey), identifier));
}

function varint(value: number) {
  const bytes: number[] = [];
  for (; value >= 0x80; value = Math.floor(value / 0x80)) bytes.push((value % 0x80) | 0x80);
  bytes.push(value);
  return Buffer.from(bytes);
}

const field = (type: FieldType, data: Buffer) => Buffer.concat([Buffer.from([type]), varint(data.length), data]);
const END = Buffer.from([Field.End]);

export function encodeMacaroon({ identifier, caveats, signature }: Macaroon) {
  return Buffer.concat([
    Buffer.from([2]),
    field(Field.Identifier, identifier),
    END,
    ...caveats.flatMap((caveat) => [field(Field.Identifier, Buffer.from(caveat)), END]),
    END,
    field(Field.Signature, signature),
  ]).toString('base64');
}

// Null for anything that isn't a V2 macaroon with first-party caveats only
export function decodeMacaroon(base64: string): Macaroon | null {
  const bytes = Buffer.from(base64, 'base64');
  let at = 0;
  const next = () => {
    const type = bytes[at++];
    if (type === undefined) throw new Error('truncated');
    if (type === Field.End) return { type, data: Buffer.alloc(0) };
    let length = 0;
    for (let shift = 1; ; shift *= 0x80) {
      const byte = bytes[at++];
      if (byte === undefined || shift > 2 ** 28) throw new Error('truncated');
      length += (byte & 0x7f) * shift;
      if (byte < 0x80) break;
    }
    if (at + length > bytes.length) throw new Error('truncated');
    const data = bytes.subarray(at, at + length);
    at += length;
    return { type, data };
  };
  try {
    if (bytes[at++] !== 2) return null;
    let part = next();
    if (part.type === Field.Location) part = next();
    if (part.type !== Field.Identifier) return null;
    const identifier = part.data;
    if (next().type !== Field.End) return null;
    const caveats: string[] = [];
    for (part = next(); part.type !== Field.End; part = next()) {
      if (part.type === Field.Location) part = next();
      if (part.type !== Field.Identifier) return null;
      caveats.push(part.data.toString());
      // A verification id means a third-party caveat, which we can't discharge
      if (next().type !== Field.End) return null;
    }
    const signature = next();
    if (signature.type !== Field.Signature || at !== bytes.length) return null;
    return { identifier, caveats, signature: signature.data };
  } catch {
    return null;
  }
}

export function mintToken(rootKey: Buffer, paymentHash: string, service: string, now = Date.now()) {
  const identifier = Buffer.concat([
    Buffer.alloc(2),
    Buffer.from(paymentHash, 'hex'),
    crypto.getRandomValues(Buffer.alloc(32)),
  ]);
  const validUntil = Math.floor(now / 1000) + TOKEN_MINUTES * 60;
  const caveats = [`services=${service}:0`, `${service}_valid_until=${validUntil}`];
  return encodeMacaroon({ identifier, caveats, signature: sign(rootKey, identifier, caveats) });
}

// The payment hash of a valid, paid token for `service`, else null. Holders
// may add caveats; every one must hold, unknown ones fail.
export function verifyToken(rootKey: Buffer, header: string, service: string, now = Date.now()) {
  const match = header.match(/^(?:L402|LSAT) ([A-Za-z0-9+/=_-]+):([0-9a-fA-F]{64})$/);
  const macaroon = match ? decodeMacaroon(match[1]!) : null;
  if (!match || !macaroon || macaroon.identifier.length !== 66 || macaroon.identifier.readUInt16BE(0) !== 0)
    return null;
  const expected = sign(rootKey, macaroon.identifier, macaroon.caveats);
  if (macaroon.signature.length !== 32 || !timingSafeEqual(expected, macaroon.signature)) return null;

  const paymentHash = macaroon.identifier.subarray(2, 34).toString('hex');
  const preimage = Buffer.from(match[2]!, 'hex');
  if (createHash('sha256').update(preimage).digest('hex') !== paymentHash) return null;

  const satisfied = macaroon.caveats.every((caveat) => {
    const [key = '', value = ''] = caveat.split('=', 2);
    if (key === 'services') return value.split(',').some((entry) => entry.split(':')[0] === service);
    if (key === `${service}_valid_until`) return Number(value) * 1000 > now;
    return false;
  });
  return satisfied ? paymentHash : null;
}

let rootKey: Buffer | undefined;

// Shared by all instances like the ALTCHA key in lib/altcha.ts
async function l402Key(db: Database) {
  if (rootKey) return rootKey;
  await db.insert(serverSecrets).values({ name: 'l402', value: generateToken() }).onConflictDoNothing();
  const [row] = await db.select().from(serverSecrets).where(eq(serverSecrets.name, 'l402'));
  rootKey = Buffer.from(row!.value, 'hex');
  return rootKey;
}

// Each payment hash counts once, the window outlasts the token
const redeemed = rateLimit('l402-redeemed', 1, TOKEN_MINUTES * 60_000);
// Every challenge creates an invoice on the node
const challenges = rateLimit('l402-challenge', 120, 60 * 60_000);

// Charges `price` per call of the routes behind it. `service` names the
// route in the token, so a token for one route doesn't open another.
export function l402(service: string, price: Sats) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const backend = lightning();
    if (!backend) return c.json({ error: t(c).paymentsOff }, 404);
    const key = await l402Key(c.get('db'));
    const header = c.req.header('authorization');
    const paymentHash = header ? verifyToken(key, header, service) : null;
    if (paymentHash && (await redeemed.hit(c, paymentHash))) return next();

    if (!(await challenges.hit(c, clientIp(c)))) return tooManyRequests(c);
    const invoice = await backend.createInvoice(price, `${APP_NAME}: ${service}`);
    const macaroon = mintToken(key, invoice.paymentHash, service);
    c.header('www-authenticate', `L402 macaroon="${macaroon}", invoice="${invoice.bolt11}"`);
    c.header('cache-control', 'no-store');
    return c.json({ error: t(c).paymentRequired, sats: price, invoice: invoice.bolt11, macaroon }, 402);
  });
}
