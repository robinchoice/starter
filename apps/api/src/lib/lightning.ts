import { createHash } from 'node:crypto';
import type { Sats } from '@app/shared/payments';
import { btcpayBackend } from './btcpay';
import { nwcBackend } from './nwc';

// The Lightning node behind checkout and L402 (README, „Zahlungen“), chosen
// by PAYMENTS_BACKEND. Empty = payments off, the routes answer 404.
export type Invoice = {
  // The backend's id, for invoiceState
  id: string;
  bolt11: string;
  paymentHash: string;
  expiresAt: Date;
};

export type InvoiceState = 'pending' | 'paid' | 'expired';

export type LightningBackend = {
  name: 'btcpay' | 'nwc' | 'fake';
  createInvoice(amount: Sats, memo: string): Promise<Invoice>;
  invoiceState(id: string): Promise<InvoiceState>;
};

export const INVOICE_MINUTES = 15;

// Fake money for tests and dev, refused in production by env.ts. Stateless,
// so API and worker agree: the id holds the creation time, the preimage
// follows from the id, and every invoice pays itself after FAKE_PAY_MS like a
// quick customer. fakePreimage stands in for a wallet that paid it.
export const FAKE_PAY_MS = 2000;
const FAKE_PREFIX = 'lnfake1';

export function fakePreimage(bolt11: string) {
  const id = bolt11.slice(FAKE_PREFIX.length).split('_')[0]!;
  return createHash('sha256').update(`fake-preimage:${id}`).digest('hex');
}

const fakeBackend: LightningBackend = {
  name: 'fake',
  async createInvoice(amount) {
    const id = `${Date.now()}-${crypto.randomUUID()}`;
    const bolt11 = `${FAKE_PREFIX}${id}_${amount}sat`;
    const paymentHash = createHash('sha256')
      .update(Buffer.from(fakePreimage(bolt11), 'hex'))
      .digest('hex');
    return { id, bolt11, paymentHash, expiresAt: new Date(Date.now() + INVOICE_MINUTES * 60_000) };
  },
  async invoiceState(id) {
    const created = Number(id.split('-')[0]);
    if (Date.now() >= created + FAKE_PAY_MS) return 'paid';
    return 'pending';
  },
};

let current: { key: string; backend: LightningBackend } | undefined;

// One backend per process, the NWC client keeps its relay connection. Built
// again when the env changes, as the tests do.
export function lightning(): LightningBackend | null {
  const name = process.env.PAYMENTS_BACKEND || '';
  const key = [name, process.env.BTCPAY_URL, process.env.BTCPAY_STORE_ID, process.env.NWC_URL].join('|');
  if (current?.key === key) return current.backend;
  const backend =
    name === 'btcpay' ? btcpayBackend() : name === 'nwc' ? nwcBackend() : name === 'fake' ? fakeBackend : null;
  if (backend) current = { key, backend };
  return backend;
}
