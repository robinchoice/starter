import { payments } from '@app/db/schema';
import { PRODUCTS, productIds, sats } from '@app/shared/payments';
import { createPaymentSchema } from '@app/shared/schemas';
import { and, desc, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { createMiddleware } from 'hono/factory';
import { z } from 'zod';
import { btcpaySignatureValid } from '../lib/btcpay';
import { t } from '../lib/i18n';
import { l402 } from '../lib/l402';
import { lightning } from '../lib/lightning';
import { refreshPayment, toPayment } from '../lib/payments';
import { clientIp, rateLimit, tooManyRequests } from '../lib/rate-limit';
import { validJson } from '../lib/validate';
import { requireAuth } from '../middleware/auth';
import type { AppEnv } from '../types';

const invoicesPerUser = rateLimit('payments-per-user', 20, 60 * 60 * 1000);
const webhooksPerIp = rateLimit('payments-webhook', 600, 60 * 60 * 1000);

const paymentsOn = createMiddleware<AppEnv>(async (c, next) => {
  if (!lightning()) return c.json({ error: t(c).paymentsOff }, 404);
  await next();
});

const webhookSchema = z.object({ type: z.string(), invoiceId: z.string() });

// Checkout for people (README, „Zahlungen“): the web shows the invoice as QR
// code and asks GET /:id until it is paid, the worker catches the rest.
export const paymentRoutes = new Hono<AppEnv>()
  .use(paymentsOn)
  // An example of a paid API for agents, a project charges its own routes the same way
  .get('/l402-demo', l402('demo', sats(10)), (c) => c.json({ message: t(c).l402DemoPaid }))
  // BTCPay announces settled invoices here (Store › Webhooks, secret in
  // BTCPAY_WEBHOOK_SECRET). The state still comes from the API, not the body.
  .post('/btcpay', async (c) => {
    const secret = process.env.BTCPAY_WEBHOOK_SECRET;
    if (lightning()?.name !== 'btcpay' || !secret) return c.json({ error: t(c).notFound }, 404);
    if (!(await webhooksPerIp.hit(c, clientIp(c)))) return tooManyRequests(c);
    const body = await c.req.text();
    if (!btcpaySignatureValid(body, c.req.header('btcpay-sig'), secret)) {
      return c.json({ error: t(c).invalidInput }, 401);
    }
    const event = webhookSchema.safeParse(JSON.parse(body));
    if (event.success) {
      const [row] = await c
        .get('db')
        .select()
        .from(payments)
        .where(and(eq(payments.backend, 'btcpay'), eq(payments.invoiceId, event.data.invoiceId)));
      if (row) await refreshPayment(c.get('db'), row);
    }
    return c.json({ ok: true });
  })
  .get('/', requireAuth, async (c) => {
    const db = c.get('db');
    const userId = c.get('user').id;
    const rows = await db
      .select()
      .from(payments)
      .where(eq(payments.userId, userId))
      .orderBy(desc(payments.createdAt))
      .limit(50);
    const paid = await db
      .selectDistinct({ product: payments.product })
      .from(payments)
      .where(and(eq(payments.userId, userId), eq(payments.status, 'paid')));
    return c.json({
      products: productIds.map((id) => ({ id, sats: PRODUCTS[id].sats })),
      unlocked: productIds.filter((id) => paid.some((row) => row.product === id)),
      payments: rows.map(toPayment),
    });
  })
  .post('/', requireAuth, validJson(createPaymentSchema), async (c) => {
    const user = c.get('user');
    if (!(await invoicesPerUser.hit(c, user.id))) return tooManyRequests(c);
    const { product } = c.req.valid('json');
    const backend = lightning()!;
    const amount = PRODUCTS[product].sats;
    const invoice = await backend.createInvoice(amount, t(c).productNames[product]);
    const [row] = await c
      .get('db')
      .insert(payments)
      .values({
        userId: user.id,
        product,
        sats: amount,
        backend: backend.name,
        invoiceId: invoice.id,
        invoice: invoice.bolt11,
        expiresAt: invoice.expiresAt,
      })
      .returning();
    return c.json({ payment: toPayment(row!) }, 201);
  })
  .get('/:id', requireAuth, async (c) => {
    const id = c.req.param('id');
    if (!z.uuid().safeParse(id).success) return c.json({ error: t(c).notFound }, 404);
    const [row] = await c
      .get('db')
      .select()
      .from(payments)
      .where(and(eq(payments.id, id), eq(payments.userId, c.get('user').id)));
    if (!row) return c.json({ error: t(c).notFound }, 404);
    return c.json({ payment: toPayment(await refreshPayment(c.get('db'), row)) });
  });
