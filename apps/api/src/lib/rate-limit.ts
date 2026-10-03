import type { Context } from 'hono';

// Fixed-window counters kept in memory. A single API process serves all
// requests; a restart resets the counters.
export function rateLimit(limit: number, windowMs: number) {
  const windows = new Map<string, { count: number; resetAt: number }>();
  let nextSweep = 0;

  function current(key: string) {
    const now = Date.now();
    if (now >= nextSweep) {
      for (const [k, w] of windows) if (w.resetAt <= now) windows.delete(k);
      nextSweep = now + windowMs;
    }
    const w = windows.get(key);
    return w && w.resetAt > now ? w : undefined;
  }

  return {
    // Counts `amount` hits for `key`; false once it goes over the limit.
    hit(key: string, amount = 1) {
      const w = current(key);
      if (w) return (w.count += amount) <= limit;
      windows.set(key, { count: amount, resetAt: Date.now() + windowMs });
      return amount <= limit;
    },
    // Takes hits back, e.g. once a counted attempt turned out to be valid.
    undo(key: string, amount = 1) {
      const w = current(key);
      if (w) w.count = Math.max(0, w.count - amount);
    },
  };
}

// The reverse proxy in front of the web app sets X-Forwarded-For and the web
// app passes it through. Its last entry is the address the proxy saw.
export function clientIp(c: Context) {
  return c.req.header('x-forwarded-for')?.split(',').at(-1)?.trim() || 'unknown';
}

export function tooManyRequests(c: Context) {
  return c.json({ error: 'Zu viele Versuche — bitte später erneut probieren' }, 429);
}
