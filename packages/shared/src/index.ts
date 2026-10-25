import { z } from 'zod';
import type { Band } from './band';

export * from './band';
export * from './messages';
export * from './monitoring';

// The one place to rename a new project. API mails and web titles read it.
export const APP_NAME = 'Starter';

// Bundle ID and Android package of the app, the same as appId in
// apps/mobile/lib/config.dart. The API names it for passkeys in the app.
export const APP_ID = 'org.pleasance.starter';

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
  // In ADMIN_EMAILS, may invite testers and send updates
  admin: boolean;
  // Since when the account gets update mails, as ISO date; null = off
  updatesSince: string | null;
};

// Custom error messages are keys of messages.ts, the API translates them.
const email = z.string().trim().toLowerCase().pipe(z.email('invalidEmail'));

export const magicLinkSchema = z.object({
  email,
  // Page to return to after login, see safeNextPath
  next: z.string().max(2000).optional(),
  // The unticked checkbox under the form. Counts once the link is opened, so
  // it is a double opt-in.
  updates: z.boolean().optional(),
});

export const verifySchema = z.object({
  token: z.string().min(1).max(200),
  // The web logs in with a cookie, the CLI sends false and takes the token
  cookie: z.boolean().optional(),
});

// An ALTCHA challenge as the API hands it out, for the solvers in tests and CLI.
// Loose, so fields the signature covers stay in place; verifySolution checks them.
export const altchaChallengeSchema = z.looseObject({
  parameters: z.looseObject({
    algorithm: z.string(),
    nonce: z.string(),
    salt: z.string(),
    cost: z.number(),
    keyLength: z.number(),
    keyPrefix: z.string(),
  }),
  signature: z.string().exactOptional(),
});

export const loginCodeSchema = z.object({ email, updates: z.boolean().optional() });

export const inviteSchema = z.object({ email });

export const verifyCodeSchema = z.object({
  email,
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'codeDigits'),
  // The web logs in with a cookie, app and CLI take the token from the answer
  cookie: z.boolean().optional(),
});

// WebAuthn's JSON as @simplewebauthn/browser and the app's passkeys package hand
// it over, @simplewebauthn/server checks the signatures. The server reads no
// client extensions, so they are dropped.
const passkeyCredential = {
  id: z.string().min(1).max(1400),
  rawId: z.string(),
  type: z.literal('public-key'),
  authenticatorAttachment: z.enum(['cross-platform', 'platform']).exactOptional(),
  clientExtensionResults: z.object({}),
};

export const passkeyRegisterSchema = z.object({
  response: z.object({
    ...passkeyCredential,
    response: z.object({
      clientDataJSON: z.string(),
      attestationObject: z.string(),
      authenticatorData: z.string().exactOptional(),
      transports: z.array(z.string()).exactOptional(),
      publicKeyAlgorithm: z.number().exactOptional(),
      publicKey: z.string().exactOptional(),
    }),
  }),
});

// cookie as in verifyCodeSchema
export const passkeyLoginSchema = z.object({
  response: z.object({
    ...passkeyCredential,
    response: z.object({
      clientDataJSON: z.string(),
      authenticatorData: z.string(),
      signature: z.string(),
      userHandle: z.string().exactOptional(),
    }),
  }),
  cookie: z.boolean().optional(),
});

export type Passkey = {
  id: string;
  // Synced by a password manager, else bound to one device
  backedUp: boolean;
  createdAt: string;
  lastUsedAt: string | null;
};

export const updateMeSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  // Update mails on or off, see the settings page
  updates: z.boolean().optional(),
});

// Update mails (README, „Update-Mails“): title and features per language.
// Drafts may be incomplete, sending needs both languages, see updateComplete.
const updateText = z.object({
  title: z.string().trim().max(200),
  features: z.array(z.string().trim().max(500)).max(20),
});

export const updateContentSchema = z.object({ de: updateText, en: updateText });

export type UpdateContent = z.infer<typeof updateContentSchema>;

export const updateComplete = (content: UpdateContent) =>
  Object.values(content).every((text) => text.title && text.features.some(Boolean));

export const saveUpdateSchema = z.object({
  content: updateContentSchema,
  // PNG or JPEG up to about 2 MB, null removes it, missing keeps it
  image: z.base64().max(2_800_000).nullable().optional(),
});

export type UpdateSummary = {
  id: string;
  // File name in updates/ for drafts written by agents
  slug: string | null;
  content: UpdateContent;
  hasImage: boolean;
  createdAt: string;
  sentAt: string | null;
  // Deliveries of a sent update
  sent: number;
  failed: number;
  pending: number;
};

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
    return url.origin === 'http://localhost' && !url.pathname.startsWith('//')
      ? url.pathname + url.search + url.hash
      : null;
  } catch {
    return null;
  }
}
