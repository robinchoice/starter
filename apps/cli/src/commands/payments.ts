import { productIds } from '@app/shared/payments';
import { paymentSchema, paymentsSchema } from '@app/shared/schemas';
import { z } from 'zod';
import { type Command, EXIT, Failure, str } from '../command';
import { SLUG } from '../config';

// The checkout of /checkout (README, „Zahlungen“): lists products and own
// payments, --buy creates an invoice to pay with any Lightning wallet.
export const payments: Command = {
  help: (m) => [[`payments [--buy ${productIds.join('|')}]`, m.cliPaymentsHelp]],
  options: { buy: { type: 'string' } },
  async run({ values, m, api, session }) {
    const buy = str(values.buy);
    const product = productIds.find((id) => id === buy);
    if (buy !== undefined && !product) {
      throw new Failure(m.cliBadOptions(`--buy ${productIds.join('|')}`, SLUG), EXIT.usage);
    }
    if (!session) throw new Failure(m.notLoggedIn, EXIT.loggedOut);

    if (product) {
      const { payment } = await api.post('/payments', z.object({ payment: paymentSchema }), { product });
      return {
        data: { payment },
        text: [`${m.productNames[payment.product]}: ${m.sats(payment.sats)}`, payment.invoice].join('\n'),
      };
    }
    const overview = await api.get('/payments', paymentsSchema);
    return {
      data: overview,
      text: [
        ...overview.products.map(
          (item) =>
            `${m.productNames[item.id]}: ${m.sats(item.sats)}${overview.unlocked.includes(item.id) ? ` · ${m.unlocked}` : ''}`,
        ),
        ...overview.payments.map(
          (payment) =>
            `${payment.id}  ${m.productNames[payment.product]}  ${m.sats(payment.sats)}  ${m.paymentStatus[payment.status]}`,
        ),
      ].join('\n'),
    };
  },
};
