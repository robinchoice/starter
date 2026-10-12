import { type Database, users } from '@app/db';
import { eq } from 'drizzle-orm';

// Prototypes stay closed until Robin opens them (README, „Registrierung öffnen“):
// existing accounts log in, new ones only for SIGNUP_ALLOWLIST until SIGNUP_OPEN=true.
// Read on every call, so the tests can switch it.
export async function mayLogIn(db: Database, email: string) {
  if (process.env.SIGNUP_OPEN === 'true') return true;
  const allowlist = (process.env.SIGNUP_ALLOWLIST ?? '').split(',').map((entry) => entry.trim().toLowerCase());
  if (allowlist.includes(email)) return true;
  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
  return !!user;
}
