import { type Challenge, solveChallenge } from 'altcha-lib';
import { deriveKey } from 'altcha-lib/algorithms/pbkdf2';
import type { createApp } from './app';

// What the ALTCHA widget sends once it has solved a challenge of the API
export async function altchaPayload(app: ReturnType<typeof createApp>) {
  const challenge = (await (await app.request('/api/v1/altcha')).json()) as Challenge;
  const solution = await solveChallenge({ challenge, deriveKey });
  return btoa(JSON.stringify({ challenge, solution }));
}
