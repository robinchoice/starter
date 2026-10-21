import { execFileSync } from 'node:child_process';
import { expect, type Page } from '@playwright/test';

const apiDirectory = new URL('../../api/', import.meta.url);

export async function logIn(page: Page, email = `e2e-${crypto.randomUUID()}@example.com`) {
  const link = execFileSync('bun', ['src/login-link.ts', email], {
    cwd: apiDirectory,
    env: { ...process.env, APP_URL: 'http://localhost' },
    encoding: 'utf8',
  }).trim();
  const { pathname, search } = new URL(link);
  await page.goto(`${pathname}${search}`);
  await expect(page).toHaveURL(/\/dashboard$/);
  return email;
}

export function loginCode(email: string) {
  return execFileSync(
    'bun',
    [
      '--eval',
      `import { createDb } from '@app/db';
       import { issueLoginCode } from './src/lib/login';
       const db = createDb(process.env.DATABASE_URL);
       const code = await issueLoginCode(db, process.argv[1]);
       await db.$client.end();
       console.log(code);`,
      email,
    ],
    { cwd: apiDirectory, env: process.env, encoding: 'utf8' },
  ).trim();
}
