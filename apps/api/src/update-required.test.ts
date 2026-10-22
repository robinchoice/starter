import { afterAll, afterEach, expect, test } from 'bun:test';
import { createDb } from '@app/db';
import { createApp } from './app';

const db = createDb(process.env.DATABASE_URL);
const app = createApp(db);

afterAll(() => db.$client.end());
afterEach(() => {
  delete process.env.MIN_BUILD_IOS;
});

const as = (platform: string, build: string) => ({ 'x-app-platform': platform, 'x-app-build': build });

test('asks app builds below the minimum to update, but keeps feedback open', async () => {
  process.env.MIN_BUILD_IOS = '30';
  const outdated = await app.request('/api/v1/app', { headers: { ...as('ios', '29'), 'accept-language': 'en' } });
  expect(outdated.status).toBe(426);
  expect(await outdated.json()).toEqual({
    error: 'This version of the app is too old. Please update it in the store.',
    code: 'UPDATE_REQUIRED',
  });
  // Before the login check, so a logged-out old build learns why
  expect((await app.request('/api/v1/auth/me', { headers: as('ios', '29') })).status).toBe(426);
  expect((await app.request('/api/v1/feedback', { method: 'POST', headers: as('ios', '1') })).status).toBe(401);
  expect((await app.request('/api/v1/app', { headers: as('ios', '30') })).status).toBe(200);
  expect((await app.request('/api/v1/app', { headers: as('android', '1') })).status).toBe(200);
  // Web and local builds send no headers
  expect((await app.request('/api/v1/app')).status).toBe(200);
  expect((await app.request('/api/v1/app', { headers: as('ios', '0') })).status).toBe(200);
});
