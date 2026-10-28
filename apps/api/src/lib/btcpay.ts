import { createHmac, timingSafeEqual } from 'node:crypto';
import { Invoice as Bolt11 } from '@getalby/lightning-tools/bolt11';
import { z } from 'zod';
import { INVOICE_MINUTES, type InvoiceState, type LightningBackend } from './lightning';

// BTCPay Server over its Greenfield API, Lightning only. The API key needs
// btcpay.store.cancreateinvoice and btcpay.store.canviewinvoices for the store.
const invoiceSchema = z.object({
  id: z.string(),
  status: z.enum(['New', 'Processing', 'Expired', 'Invalid', 'Settled']),
  expirationTime: z.number(),
});

// Lightning is BTC-LN since BTCPay 2
const paymentMethodsSchema = z.array(z.object({ paymentMethodId: z.string(), destination: z.string() }));

export function btcpayBackend(): LightningBackend {
  const base = `${process.env.BTCPAY_URL?.replace(/\/+$/, '')}/api/v1/stores/${process.env.BTCPAY_STORE_ID}/invoices`;

  async function call<T extends z.ZodType>(path: string, schema: T, body?: unknown): Promise<z.output<T>> {
    const res = await fetch(base + path, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { authorization: `token ${process.env.BTCPAY_API_KEY}`, 'content-type': 'application/json' },
      body: body === undefined ? null : JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`BTCPay ${path || '/'}: ${res.status} ${await res.text()}`);
    return schema.parse(await res.json());
  }

  return {
    name: 'btcpay',
    async createInvoice(amount, memo) {
      const invoice = await call('', invoiceSchema, {
        amount: String(amount),
        currency: 'SATS',
        metadata: { itemDesc: memo },
        checkout: { paymentMethods: ['BTC-LN'], expirationMinutes: INVOICE_MINUTES, lazyPaymentMethods: false },
      });
      const methods = await call(`/${invoice.id}/payment-methods`, paymentMethodsSchema);
      const bolt11 = methods.find((method) => method.paymentMethodId === 'BTC-LN')?.destination;
      if (!bolt11) throw new Error(`BTCPay invoice ${invoice.id} has no Lightning invoice, is Lightning set up?`);
      return {
        id: invoice.id,
        bolt11,
        paymentHash: new Bolt11({ pr: bolt11 }).paymentHash,
        expiresAt: new Date(invoice.expirationTime * 1000),
      };
    },
    async invoiceState(id): Promise<InvoiceState> {
      const { status } = await call(`/${encodeURIComponent(id)}`, invoiceSchema);
      return status === 'Settled' ? 'paid' : status === 'Expired' || status === 'Invalid' ? 'expired' : 'pending';
    },
  };
}

// BTCPay signs each webhook: header BTCPay-Sig = sha256=HMAC-SHA256(secret, body)
export function btcpaySignatureValid(body: string, header: string | undefined, secret: string) {
  const expected = Buffer.from(`sha256=${createHmac('sha256', secret).update(body).digest('hex')}`);
  const given = Buffer.from(header ?? '');
  return given.length === expected.length && timingSafeEqual(given, expected);
}
