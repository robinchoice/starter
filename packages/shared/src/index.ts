import { z } from 'zod';

// The one place to rename a new project. API mails and web titles read it.
export const APP_NAME = 'Starter';

export type User = {
  id: string;
  email: string;
  name: string;
};

const email = z.string().trim().toLowerCase().pipe(z.email());

export const magicLinkSchema = z.object({
  email,
  // Page to return to after login, see safeNextPath
  next: z.string().max(2000).optional(),
});

export const verifySchema = z.object({
  token: z.string().min(1).max(200),
});

export const updateMeSchema = z.object({
  name: z.string().trim().min(1).max(255),
});

// A path on this site to return to after login. Anything that would resolve to
// another origin (//host, /\host, or tabs and newlines that browsers strip) is
// dropped, so a crafted link can't redirect elsewhere.
export function safeNextPath(value: string | null | undefined): string | null {
  if (!value?.startsWith('/')) return null;
  try {
    const url = new URL(value, 'http://localhost');
    return url.origin === 'http://localhost' ? url.pathname + url.search + url.hash : null;
  } catch {
    return null;
  }
}
