import { z } from 'zod';

// The code reads process.env where it needs a value, so the tests can switch
// them. The entry points import this first: a missing or malformed variable
// stops the boot instead of the first request. Empty counts as unset, as in
// .env.example. A new variable with a required value or a format goes here.
const unset = z.literal('');
const number = z.string().regex(/^\d+$/);

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  APP_URL: z.url(),
  PORT: number.or(unset).exactOptional(),
  WORKER_PORT: number.or(unset).exactOptional(),
  SMTP_PORT: number.or(unset).exactOptional(),
  UPDATE_MAIL_INTERVAL_MS: number.or(unset).exactOptional(),
  MIN_BUILD_IOS: number.or(unset).exactOptional(),
  MIN_BUILD_ANDROID: number.or(unset).exactOptional(),
  SIGNUP_OPEN: z.enum(['true', 'false']).or(unset).exactOptional(),
  SENTRY_DSN: z.url().or(unset).exactOptional(),
  // README, „Zahlungen“. Empty = off.
  PAYMENTS_BACKEND: z.enum(['btcpay', 'nwc', 'fake']).or(unset).exactOptional(),
  BTCPAY_URL: z.url().or(unset).exactOptional(),
  NWC_URL: z.string().startsWith('nostr+walletconnect://').or(unset).exactOptional(),
});

declare module 'bun' {
  interface Env extends z.infer<typeof envSchema> {}
}

const result = envSchema.safeParse(process.env);
if (!result.success) throw new Error(`Invalid environment:\n${z.prettifyError(result.error)}`);

// Each backend needs its address and key, fake money only outside production
const needs = { btcpay: ['BTCPAY_URL', 'BTCPAY_STORE_ID', 'BTCPAY_API_KEY'], nwc: ['NWC_URL'], fake: [] } as const;
const backend = process.env.PAYMENTS_BACKEND;
if (backend) {
  const missing = needs[backend].filter((name) => !process.env[name]);
  if (missing.length) throw new Error(`PAYMENTS_BACKEND=${backend} needs ${missing.join(', ')}`);
  if (backend === 'fake' && process.env.NODE_ENV === 'production') {
    throw new Error('PAYMENTS_BACKEND=fake is for tests and dev only');
  }
}
