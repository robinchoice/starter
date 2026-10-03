import { Hono } from 'hono';
import { deleteCookie, setCookie } from 'hono/cookie';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { magicLinks, sessions, users } from '@app/db';
import { magicLinkSchema, safeNextPath, updateMeSchema, verifySchema } from '@app/shared';
import { currentUser, generateToken, hashToken, requireAuth, sessionToken, SESSION_COOKIE } from '../middleware/auth';
import { clientIp, rateLimit, tooManyRequests } from '../lib/rate-limit';
import { sendMagicLinkEmail } from '../lib/mail';
import { validJson } from '../lib/validate';
import type { AppEnv } from '../types';

const MINUTE = 60 * 1000;
const SESSION_DAYS = 30;
const mailsPerAddress = rateLimit(5, 60 * MINUTE);
const mailsPerIp = rateLimit(20, 60 * MINUTE);

const userColumns = { id: users.id, email: users.email, name: users.name };

export const authRoutes = new Hono<AppEnv>()
  .post('/magic-link', validJson(magicLinkSchema), async (c) => {
    const { email, next } = c.req.valid('json');
    if (!mailsPerIp.hit(clientIp(c)) || !mailsPerAddress.hit(email)) return tooManyRequests(c);

    const token = generateToken();
    await c.get('db').insert(magicLinks).values({
      email,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + 15 * MINUTE),
    });
    await sendMagicLinkEmail(email, token, safeNextPath(next));
    return c.json({ ok: true });
  })

  .post('/verify', validJson(verifySchema), async (c) => {
    const db = c.get('db');

    // Marking the link as used in the same statement keeps it single-use
    // even when two requests race.
    const [link] = await db
      .update(magicLinks)
      .set({ usedAt: new Date() })
      .where(
        and(
          eq(magicLinks.tokenHash, hashToken(c.req.valid('json').token)),
          isNull(magicLinks.usedAt),
          gt(magicLinks.expiresAt, new Date()),
        ),
      )
      .returning({ email: magicLinks.email });
    if (!link) return c.json({ error: 'Der Link ist abgelaufen oder wurde schon benutzt.' }, 400);

    // The first login creates the account. The no-op update lets RETURNING
    // yield existing users too.
    const [user] = await db
      .insert(users)
      .values({ email: link.email, name: link.email.split('@')[0]! })
      .onConflictDoUpdate({ target: users.email, set: { email: link.email } })
      .returning(userColumns);

    const token = generateToken();
    await db.insert(sessions).values({
      userId: user!.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + SESSION_DAYS * 24 * 60 * MINUTE),
    });
    setCookie(c, SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: 'Lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: SESSION_DAYS * 24 * 60 * 60,
    });
    return c.json({ user });
  })

  .post('/logout', async (c) => {
    const token = sessionToken(c);
    if (token) await c.get('db').delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
    deleteCookie(c, SESSION_COOKIE, { path: '/' });
    return c.json({ ok: true });
  })

  .get('/me', async (c) => c.json({ user: await currentUser(c) }))

  .patch('/me', requireAuth, validJson(updateMeSchema), async (c) => {
    const [user] = await c
      .get('db')
      .update(users)
      .set({ name: c.req.valid('json').name, updatedAt: new Date() })
      .where(eq(users.id, c.get('user').id))
      .returning(userColumns);
    return c.json({ user });
  });
