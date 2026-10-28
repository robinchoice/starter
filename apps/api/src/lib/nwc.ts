import { toMsats } from '@app/shared/payments';
import { NWCClient } from '@getalby/sdk/nwc';
import { INVOICE_MINUTES, type InvoiceState, type LightningBackend } from './lightning';

// Alby Hub (or any NIP-47 wallet) over Nostr Wallet Connect. Both sides only
// connect out to the relay in NWC_URL. Give the connection only make_invoice
// and lookup_invoice, then the app can receive but never spend.
export function nwcBackend(): LightningBackend {
  // env.ts refuses to start without NWC_URL
  const client = new NWCClient({ nostrWalletConnectUrl: process.env.NWC_URL! });

  return {
    name: 'nwc',
    async createInvoice(amount, memo) {
      const tx = await client.makeInvoice({ amount: toMsats(amount), description: memo, expiry: INVOICE_MINUTES * 60 });
      return {
        id: tx.payment_hash,
        bolt11: tx.invoice,
        paymentHash: tx.payment_hash,
        expiresAt: new Date(tx.expires_at * 1000),
      };
    },
    async invoiceState(id): Promise<InvoiceState> {
      const tx = await client.lookupInvoice({ payment_hash: id });
      if (tx.state === 'settled') return 'paid';
      if (tx.state === 'failed' || tx.expires_at * 1000 < Date.now()) return 'expired';
      return 'pending';
    },
  };
}
