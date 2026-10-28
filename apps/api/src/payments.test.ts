import { afterAll, afterEach, beforeAll, expect, spyOn, test } from 'bun:test';
import { createHash, createHmac } from 'node:crypto';
import { createDb, migrateDb } from '@app/db';
import { payments, users } from '@app/db/schema';
import { messages } from '@app/shared/messages';
import { paymentSchema, paymentsSchema } from '@app/shared/schemas';
import { fetchWithL402 } from '@getalby/lightning-tools/402/l402';
import { eq } from 'drizzle-orm';
import fc from 'fast-check';
import { z } from 'zod';
import { createApp } from './app';
import { decodeMacaroon, encodeMacaroon, mintToken, verifyToken } from './lib/l402';
import { FAKE_PAY_MS, fakePreimage } from './lib/lightning';
import { issueSession } from './lib/login';
import { refreshPending } from './lib/payments';
import { read } from './testing';

const db = createDb(process.env.DATABASE_URL);
const app = createApp(db);
spyOn(console, 'log').mockImplementation(() => {});
let server: ReturnType<typeof Bun.serve>;

beforeAll(async () => {
  await migrateDb(process.env.DATABASE_URL);
  server = Bun.serve({ port: 0, fetch: app.fetch });
});
afterAll(async () => {
  await server.stop(true);
  await db.$client.end();
});
afterEach(() => {
  for (const name of ['PAYMENTS_BACKEND', 'BTCPAY_URL', 'BTCPAY_STORE_ID', 'BTCPAY_API_KEY', 'BTCPAY_WEBHOOK_SECRET']) {
    delete process.env[name];
  }
});

const de = messages.de;
const one = z.object({ payment: paymentSchema });
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function logIn() {
  const email = `pay-${crypto.randomUUID()}@example.com`;
  const [user] = await db.insert(users).values({ email, name: 'Lena' }).returning({ id: users.id });
  return { id: user!.id, token: await issueSession(db, user!.id) };
}

const call = (token: string, path: string, body?: unknown) =>
  app.request(`/api/v1/payments${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: body === undefined ? null : JSON.stringify(body),
  });

test('payments are off without PAYMENTS_BACKEND', async () => {
  const { token } = await logIn();
  const res = await call(token, '');
  expect(res.status).toBe(404);
  expect(await res.json()).toEqual({ error: de.paymentsOff });
  expect((await app.request('/api/v1/payments/l402-demo')).status).toBe(404);
});

test('checkout: the server sets the price, the paid invoice unlocks the product for its buyer only', async () => {
  process.env.PAYMENTS_BACKEND = 'fake';
  const buyer = await logIn();
  const other = await logIn();

  expect((await call(buyer.token, '', { product: 'gold' })).status).toBe(400);
  const created = await read(call(buyer.token, '', { product: 'demo', sats: 1 }), one);
  expect(created.payment).toMatchObject({ product: 'demo', sats: 21, status: 'pending', paidAt: null });
  expect(created.payment.invoice).toStartWith('lnfake1');

  expect((await call(other.token, `/${created.payment.id}`)).status).toBe(404);
  expect((await call(buyer.token, '/not-a-uuid')).status).toBe(404);
  expect((await read(call(buyer.token, ''), paymentsSchema)).unlocked).toEqual([]);

  await wait(FAKE_PAY_MS);
  const paid = await read(call(buyer.token, `/${created.payment.id}`), one);
  expect(paid.payment.status).toBe('paid');
  expect(paid.payment.paidAt).not.toBeNull();
  const list = await read(call(buyer.token, ''), paymentsSchema);
  expect(list.unlocked).toEqual(['demo']);
  expect(list.products).toEqual([{ id: 'demo', sats: 21 }]);
  expect((await read(call(other.token, ''), paymentsSchema)).unlocked).toEqual([]);
});

test('the worker unlocks what was paid after the checkout was closed', async () => {
  process.env.PAYMENTS_BACKEND = 'fake';
  const buyer = await logIn();
  const { payment } = await read(call(buyer.token, '', { product: 'demo' }), one);
  await wait(FAKE_PAY_MS);
  expect(await refreshPending(db)).toBeGreaterThanOrEqual(1);
  const [row] = await db.select().from(payments).where(eq(payments.id, payment.id));
  expect(row?.status).toBe('paid');

  // Paid in time, but the worker was down for hours: only the backend decides
  const late = new Date(Date.now() - 3 * 60 * 60_000);
  const [stale] = await db
    .insert(payments)
    .values({
      ...row!,
      id: undefined,
      invoiceId: `${late.getTime()}-late`,
      expiresAt: late,
      status: 'pending',
      paidAt: null,
    })
    .returning();
  await refreshPending(db);
  const [unlocked] = await db.select().from(payments).where(eq(payments.id, stale!.id));
  expect(unlocked?.status).toBe('paid');
});

test("an agent pays the L402 demo with Alby's client, each token buys one call", async () => {
  process.env.PAYMENTS_BACKEND = 'fake';
  const url = `${server.url.origin}/api/v1/payments/l402-demo`;
  const paid: string[] = [];
  const wallet = {
    async payInvoice({ invoice }: { invoice: string }) {
      paid.push(invoice);
      return { preimage: fakePreimage(invoice) };
    },
  };

  const first = await fetchWithL402(url, {}, { wallet });
  expect(first.status).toBe(200);
  expect(await first.json()).toEqual({ message: de.l402DemoPaid });
  expect(paid).toHaveLength(1);

  // The same token again is a second call: pay again
  const again = await fetchWithL402(url, {}, { wallet, credentials: first.payment!.credentials });
  expect(again.status).toBe(402);
  expect(await again.json()).toMatchObject({ error: de.paymentRequired, sats: 10 });
  expect(again.headers.get('www-authenticate')).toMatch(/^L402 macaroon="[^"]+", invoice="lnfake1[^"]+"$/);
});

test('L402 refuses tokens it did not issue and preimages of other invoices', async () => {
  process.env.PAYMENTS_BACKEND = 'fake';
  const challenge = await app.request('/api/v1/payments/l402-demo');
  expect(challenge.status).toBe(402);
  const { macaroon, invoice } = z.object({ macaroon: z.string(), invoice: z.string() }).parse(await challenge.json());
  const demo = (authorization: string) => app.request('/api/v1/payments/l402-demo', { headers: { authorization } });

  // A self-made invoice: its preimage matches its own hash, but our key never signed that
  const preimage = Buffer.alloc(32, 1);
  const forged = mintToken(Buffer.alloc(32, 2), createHash('sha256').update(preimage).digest('hex'), 'demo');
  expect((await demo(`L402 ${forged}:${preimage.toString('hex')}`)).status).toBe(402);
  expect((await demo(`L402 ${macaroon}:${'00'.repeat(32)}`)).status).toBe(402);
  expect((await demo(`L402 ${macaroon}:${fakePreimage(invoice)}`)).status).toBe(200);
});

test('macaroons survive encoding, and any changed byte breaks the token', () => {
  const rootKey = Buffer.alloc(32, 7);
  const preimage = Buffer.alloc(32, 9);
  const hash = createHash('sha256').update(preimage).digest('hex');
  const now = Date.now();

  fc.assert(
    fc.property(
      fc.uint8Array({ minLength: 1, maxLength: 300 }),
      fc.array(fc.string({ maxLength: 200 })),
      fc.uint8Array({ minLength: 32, maxLength: 32 }),
      (identifier, caveats, signature) => {
        const macaroon = { identifier: Buffer.from(identifier), caveats, signature: Buffer.from(signature) };
        expect(decodeMacaroon(encodeMacaroon(macaroon))).toEqual(macaroon);
      },
    ),
  );

  const token = Buffer.from(mintToken(rootKey, hash, 'demo', now), 'base64');
  const header = (bytes: Buffer) => `L402 ${bytes.toString('base64')}:${preimage.toString('hex')}`;
  expect(verifyToken(rootKey, header(token), 'demo', now)).toBe(hash);
  expect(verifyToken(rootKey, header(token), 'other', now)).toBeNull();
  expect(verifyToken(rootKey, header(token), 'demo', now + 61 * 60_000)).toBeNull();
  fc.assert(
    fc.property(fc.nat({ max: token.length - 1 }), fc.integer({ min: 1, max: 255 }), (at, flip) => {
      const changed = Buffer.from(token);
      changed[at]! ^= flip;
      expect(verifyToken(rootKey, header(changed), 'demo', now)).toBeNull();
    }),
  );
});

// The example invoice of BOLT 11
const BOLT11 =
  'lnbc2500u1pvjluezsp5zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zygspp5qqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqypqdq5xysxxatsyp3k7enxv4jsxqzpu9qrsgquk0rl77nj30yxdy8j9vdx85fkpmdla2087ne0xh8nhedh8w27kyke0lp53ut353s06fv3qfegext0eh0ymjpf39tuven09sam30g4vgpfna3rh';

// BTCPay's Greenfield API as far as the backend uses it, with answers shaped like its docs
function fakeBtcpay() {
  const requests: { method: string; path: string; auth: string | null; body: unknown }[] = [];
  let status = 'New';
  const greenfield = Bun.serve({
    port: 0,
    async fetch(req) {
      const { pathname } = new URL(req.url);
      requests.push({
        method: req.method,
        path: pathname,
        auth: req.headers.get('authorization'),
        body: req.method === 'POST' ? await req.json() : null,
      });
      const invoice = { id: 'Inv1', status, expirationTime: Math.floor(Date.now() / 1000) + 900 };
      if (pathname === '/api/v1/stores/Store1/invoices') return Response.json(invoice);
      if (pathname === '/api/v1/stores/Store1/invoices/Inv1') return Response.json(invoice);
      if (pathname === '/api/v1/stores/Store1/invoices/Inv1/payment-methods') {
        return Response.json([
          { paymentMethodId: 'BTC-CHAIN', destination: 'bcrt1qexample' },
          { paymentMethodId: 'BTC-LN', destination: BOLT11 },
        ]);
      }
      return new Response('not found', { status: 404 });
    },
  });
  process.env.PAYMENTS_BACKEND = 'btcpay';
  process.env.BTCPAY_URL = greenfield.url.origin;
  process.env.BTCPAY_STORE_ID = 'Store1';
  process.env.BTCPAY_API_KEY = 'key1';
  process.env.BTCPAY_WEBHOOK_SECRET = 'hook-secret';
  return { requests, settle: () => (status = 'Settled'), stop: () => greenfield.stop(true) };
}

test('BTCPay: a Lightning-only invoice in sats, unlocked by a signed webhook', async () => {
  const btcpay = fakeBtcpay();
  try {
    const buyer = await logIn();
    const { payment } = await read(call(buyer.token, '', { product: 'demo' }), one);
    expect(payment).toMatchObject({ invoice: BOLT11, status: 'pending' });
    expect(btcpay.requests[0]).toMatchObject({
      method: 'POST',
      auth: 'token key1',
      body: { amount: '21', currency: 'SATS', checkout: { paymentMethods: ['BTC-LN'] } },
    });

    btcpay.settle();
    const body = JSON.stringify({ type: 'InvoiceSettled', invoiceId: 'Inv1', storeId: 'Store1' });
    const hook = (signature: string) =>
      app.request('/api/v1/payments/btcpay', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'btcpay-sig': signature },
        body,
      });
    expect((await hook('sha256=00')).status).toBe(401);
    const [before] = await db.select().from(payments).where(eq(payments.id, payment.id));
    expect(before?.status).toBe('pending');

    expect((await hook(`sha256=${createHmac('sha256', 'hook-secret').update(body).digest('hex')}`)).status).toBe(200);
    const [after] = await db.select().from(payments).where(eq(payments.id, payment.id));
    expect(after?.status).toBe('paid');
  } finally {
    btcpay.stop();
  }
});

test('BTCPay invoices give L402 the payment hash from the BOLT11 invoice', async () => {
  const btcpay = fakeBtcpay();
  try {
    const res = await app.request('/api/v1/payments/l402-demo');
    expect(res.status).toBe(402);
    const { macaroon } = z.object({ macaroon: z.string() }).parse(await res.json());
    expect(decodeMacaroon(macaroon)?.identifier.subarray(2, 34).toString('hex')).toBe(
      '0001020304050607080900010203040506070809000102030405060708090102',
    );
  } finally {
    btcpay.stop();
  }
});
