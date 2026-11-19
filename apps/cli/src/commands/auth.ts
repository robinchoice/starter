import { altchaChallengeSchema, userSchema } from '@app/shared/schemas';
import { solveChallenge } from 'altcha-lib';
import { deriveKey } from 'altcha-lib/algorithms/pbkdf2';
import { z } from 'zod';
import { createClient } from '../client';
import { type Command, type Context, EXIT, Failure, str } from '../command';
import { loadSession, removeSession, type Session, SLUG, saveSession } from '../config';

const meSchema = z.object({ user: userSchema.nullable() });
const loginSchema = z.object({ user: userSchema, token: z.string() });
const okSchema = z.object({ ok: z.literal(true) });

// The logged-in account, for every command that needs one
export async function currentUser({ api, session, m }: Context) {
  const user = session && (await api.get('/auth/me', meSchema)).user;
  if (!user) throw new Failure(m.notLoggedIn, EXIT.loggedOut);
  return user;
}

// Like the app: a code by mail, after the same ALTCHA as the login form. The
// API decides whether the address may log in, so the closed sign-up holds.
async function withCode({ api, values, io, m }: Context) {
  const email = str(values.email) ?? (await io.ask(m.cliAskEmail)).trim();
  const challenge = await api.get('/altcha', altchaChallengeSchema);
  const solution = await solveChallenge({ challenge, deriveKey });
  await api.post('/auth/code', okSchema, { email, altcha: btoa(JSON.stringify({ challenge, solution })) });
  io.err(m.cliCodeSent(email));
  const code = (await io.ask(m.cliAskCode)).trim();
  return api.post('/auth/code/verify', loginSchema, { email, code });
}

// A login link from the mail or from the Kontor's login-link (README, „CLI“)
async function withLink({ api, io, m }: Context, link: string) {
  const text = link === '-' ? await io.stdin() : link;
  const token = URL.parse(text.trim())?.searchParams.get('token');
  if (!token) throw new Failure(m.linkIncomplete, EXIT.usage);
  return api.post('/auth/verify', loginSchema, { token, cookie: false });
}

// Revokes a stored token at the address it was issued for, then drops it here. If that address
// doesn't answer, the token stays on this device and the message names logout --forget.
async function revoke({ io, locale, m }: Context, stored: Session) {
  try {
    await createClient(stored.url, stored.token, locale, m).post('/auth/logout', okSchema);
  } catch (error) {
    if (error instanceof Failure) throw new Failure(`${error.message} ${m.cliForgetHint(SLUG)}`, error.exitCode);
    throw error;
  }
  await removeSession(io.env);
}

export const auth: Record<string, Command> = {
  login: {
    help: (m) => [
      ['login [--email <email>]', m.cliLoginHelp],
      ['login --link <link>|-', m.cliLinkHelp],
    ],
    options: { email: { type: 'string' }, link: { type: 'string' } },
    async run(ctx) {
      // A new login replaces the token of this device: the old one is revoked first at the address
      // it was issued for, also when --url names another, so none stays valid unseen
      const stored = await loadSession(ctx.io.env);
      if (stored) await revoke(ctx, stored);
      const link = str(ctx.values.link);
      const { user, token } = link === undefined ? await withCode(ctx) : await withLink(ctx, link);
      // A token that can't be stored is revoked, so no session stays valid without a device holding it
      try {
        await saveSession(ctx.io.env, { url: ctx.url, token });
      } catch (error) {
        await createClient(ctx.url, token, ctx.locale, ctx.m).post('/auth/logout', okSchema);
        throw error;
      }
      return { data: { user }, text: ctx.m.cliLoggedIn(user.email) };
    },
  },

  whoami: {
    help: (m) => [['whoami', m.cliWhoamiHelp]],
    async run(ctx) {
      const user = await currentUser(ctx);
      return { data: { user }, text: `${user.name} <${user.email}>${user.admin ? ' · Admin' : ''}` };
    },
  },

  logout: {
    help: (m) => [
      ['logout', m.cliLogoutHelp],
      ['logout --forget', m.cliForgetHelp],
    ],
    options: { forget: { type: 'boolean' } },
    async run(ctx) {
      // The way out when the address of the stored token no longer answers: whatever --url says,
      // the token goes from this device only and stays valid at its issuer
      const stored = ctx.values.forget === true ? await loadSession(ctx.io.env) : null;
      if (stored) {
        await removeSession(ctx.io.env);
        return { data: { ok: true, revoked: false }, text: ctx.m.cliForgotten(stored.url) };
      }
      if (ctx.session) await revoke(ctx, ctx.session);
      return { data: { ok: true }, text: ctx.m.cliLoggedOut };
    },
  },
};
