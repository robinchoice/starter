import './env';
import './monitoring';
import { setTimeout as sleep } from 'node:timers/promises';
import { createDb } from '@app/db';
import { sql } from 'drizzle-orm';
import { lightning } from './lib/lightning';
import { refreshPending } from './lib/payments';
import { deliverNext } from './lib/updates';
import { captureException } from './monitoring';

// Background role next to the API, service worker in docker-compose.prod.yml.
// Sends update mails one by one, Proton's SMTP limits the rate, and with
// PAYMENTS_BACKEND checks pending Lightning invoices. The jobs are
// rows in Postgres, so a restart loses nothing and several workers share them.
// The API migrates the database, compose starts the worker after it.
const db = createDb(process.env.DATABASE_URL);
const interval = Number(process.env.UPDATE_MAIL_INTERVAL_MS || 6000);
const port = Number(process.env.WORKER_PORT || 3001);
const stop = new AbortController();

function shutdown() {
  stop.abort();
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

const server = Bun.serve({
  port,
  async fetch(req) {
    if (new URL(req.url).pathname !== '/health') return new Response('Not found', { status: 404 });
    await db.execute(sql`select 1`);
    return Response.json({ status: 'ok' });
  },
});
console.log(`[worker] Sending update mails every ${interval} ms, health on port ${port}`);

async function mails() {
  while (!stop.signal.aborted) {
    const result = await deliverNext(db, interval).catch((err) => {
      console.error('[worker] Delivery crashed:', err);
      captureException(err);
      return 'failed' as const;
    });
    // Nothing due: look again soon. The pace and retries are kept in deliverNext.
    const pause = { idle: 10_000, wait: interval, sent: interval, skipped: 0, failed: interval }[result];
    await sleep(pause, undefined, { signal: stop.signal }).catch(() => {});
  }
}

// Unlocks what was paid while nobody kept the checkout open
async function payments() {
  if (!lightning()) return;
  console.log('[worker] Checking pending payments every 30 s');
  while (!stop.signal.aborted) {
    await refreshPending(db, stop.signal).catch((err) => {
      console.error('[worker] Payment check crashed:', err);
      captureException(err);
    });
    await sleep(30_000, undefined, { signal: stop.signal }).catch(() => {});
  }
}

await Promise.all([mails(), payments()]);

await server.stop();
await db.$client.end();
process.exit(0);
