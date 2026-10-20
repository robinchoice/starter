import { type Database, loginCodes, magicLinks, sessions, users } from '@app/db';
import type { Context } from 'hono';
import { generateToken, hashToken, sessionExpiry, setSessionCookie, toUser, userColumns } from '../middleware/auth';
import type { AppEnv } from '../types';
import { locale, t } from './i18n';
import { mayLogIn } from './signup';
import { consentNow } from './updates';

const MINUTE = 60 * 1000;
const grantExpiry = () => new Date(Date.now() + 15 * MINUTE);

const defaultName = (email: string) => email.split('@')[0]!;

export function createAccount(db: Database, email: string) {
  return db
    .insert(users)
    .values({ email, name: defaultName(email) })
    .onConflictDoNothing();
}

export async function issueMagicLink(db: Database, email: string, updatesOptIn = false) {
  const token = generateToken();
  await db.insert(magicLinks).values({ email, tokenHash: hashToken(token), updatesOptIn, expiresAt: grantExpiry() });
  return token;
}

export async function issueLoginCode(db: Database, email: string, updatesOptIn = false) {
  const code = String(crypto.getRandomValues(new Uint32Array(1))[0]! % 1_000_000).padStart(6, '0');
  await db.insert(loginCodes).values({ email, codeHash: hashToken(code), updatesOptIn, expiresAt: grantExpiry() });
  return code;
}

export async function issueSession(db: Database, userId: string) {
  const token = generateToken();
  await db.insert(sessions).values({ userId, tokenHash: hashToken(token), expiresAt: sessionExpiry() });
  return token;
}

// The end of every login: link, code and passkey. Checks access again before
// creating an account or session, since it may have been withdrawn since the
// grant. Every login refreshes the language of the update mails. A ticked
// opt-in switches them on, an unticked one leaves them. Passkeys only exist
// for existing accounts. The web asks for the cookie, so its script never sees
// the token; the app takes the token from the answer and sends it as a bearer.
export async function respondWithSession(c: Context<AppEnv>, email: string, updates: boolean, cookie = false) {
  const db = c.get('db');
  if (!(await mayLogIn(db, email))) return c.json({ error: t(c).signupClosed }, 403);
  const [user] = await db
    .insert(users)
    .values({ email, name: defaultName(email), locale: locale(c), updatesConsentAt: updates ? new Date() : null })
    .onConflictDoUpdate({
      target: users.email,
      set: { locale: locale(c), ...(updates && { updatesConsentAt: consentNow }) },
    })
    .returning(userColumns);

  const token = await issueSession(db, user!.id);
  if (!cookie) return c.json({ user: toUser(user!), token });
  setSessionCookie(c, token);
  return c.json({ user: toUser(user!) });
}
