import type { Database } from '@app/db';
import { payments } from '@app/db/schema';
import type { Payment } from '@app/shared/schemas';
import { and, desc, eq } from 'drizzle-orm';
import { captureException } from '../monitoring';
import { lightning } from './lightning';

type PaymentRow = typeof payments.$inferSelect;

export const toPayment = (row: PaymentRow): Payment => ({
  id: row.id,
  product: row.product,
  sats: row.sats,
  invoice: row.invoice,
  status: row.status,
  expiresAt: row.expiresAt.toISOString(),
  paidAt: row.paidAt?.toISOString() ?? null,
});

// Asks the backend about a pending payment and stores the answer. Only one
// caller gets `moved` back from the conditional update: an app that unlocks
// more than the row (credits, a mail) does it there.
export async function refreshPayment(db: Database, row: PaymentRow): Promise<PaymentRow> {
  const backend = lightning();
  if (row.status !== 'pending' || backend?.name !== row.backend) return row;
  const state = await backend.invoiceState(row.invoiceId);
  if (state === 'pending') return row;
  const [moved] = await db
    .update(payments)
    .set({ status: state, paidAt: state === 'paid' ? new Date() : null })
    .where(and(eq(payments.id, row.id), eq(payments.status, 'pending')))
    .returning();
  if (moved) return moved;
  const [current] = await db.select().from(payments).where(eq(payments.id, row.id));
  return current!;
}

// For the worker: every pending invoice, newest first, as the browser may be
// closed long before. Only the backend may call one expired, a paid one stays
// pending while it can't be reached. Several workers may ask twice, the update
// above stays correct. Stops between invoices once `signal` aborts.
export async function refreshPending(db: Database, signal?: AbortSignal) {
  const pending = await db
    .select()
    .from(payments)
    .where(eq(payments.status, 'pending'))
    .orderBy(desc(payments.createdAt))
    .limit(100);
  let paid = 0;
  for (const row of pending) {
    if (signal?.aborted) break;
    // One invoice the backend can't answer must not hold up the others
    const current = await refreshPayment(db, row).catch((err) => {
      console.error(`[worker] Payment ${row.id}:`, err);
      captureException(err);
      return row;
    });
    if (current.status === 'paid') paid++;
  }
  return paid;
}
