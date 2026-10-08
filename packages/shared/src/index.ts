import { z } from 'zod';
import type { Band } from './band';

export * from './band';
export * from './messages';

// The one place to rename a new project. API mails and web titles read it.
export const APP_NAME = 'Starter';

// Section of the family colour band for this product, see DESIGN.md. The
// starter shows the whole band until a project picks its own.
export const APP_BAND: Band = { from: 1, to: 7 };

// True once the project is live as 1.0 (README, "Live als 1.0"). From then on
// the bug button waits for the test mode switch, see testMode in the web's feedback.svelte.ts.
export const LIVE = false;

export type User = {
  id: string;
  email: string;
  name: string;
};

// Custom error messages are keys of messages.ts, the API translates them.
const email = z.string().trim().toLowerCase().pipe(z.email('invalidEmail'));

export const magicLinkSchema = z.object({
  email,
  // Page to return to after login, see safeNextPath
  next: z.string().max(2000).optional(),
});

export const verifySchema = z.object({
  token: z.string().min(1).max(200),
});

export const loginCodeSchema = z.object({ email });

export const verifyCodeSchema = z.object({
  email,
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'codeDigits'),
});

export const updateMeSchema = z.object({
  name: z.string().trim().min(1).max(255),
});

// What web and app send along with feedback. The API adds its own version.
export const feedbackContextSchema = z.object({
  platform: z.enum(['web', 'ios', 'android']),
  page: z.string().max(500),
  // App build; the web runs the same commit as the API
  version: z.string().max(100).optional(),
  device: z.string().max(300),
  viewport: z.string().max(50),
  locale: z.string().max(10),
  // Failed API calls as "METHOD /path → status", newest first
  errors: z.array(z.string().max(300)).max(5),
});

export type FeedbackContext = z.infer<typeof feedbackContextSchema>;

export const feedbackSchema = z.object({
  kind: z.enum(['bug', 'idea']),
  message: z.string().trim().min(5, 'feedbackTooShort').max(5000),
  // PNG or JPEG, up to about 5 MB
  screenshot: z.base64().max(7_000_000).optional(),
  context: feedbackContextSchema,
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
