import { LIVE } from '@app/shared';
import { expect, test } from '@playwright/test';
import postgres from 'postgres';
import { logIn } from './login';

const sql = postgres(process.env.DATABASE_URL!, { connection: { timezone: 'UTC' }, onnotice: () => {} });
test.afterAll(() => sql.end());

// Console errors fail the test, CSP violations of the screenshot included
let errors: string[] = [];
test.beforeEach(({ page }) => {
  errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));
});
test.afterEach(() => expect(errors).toEqual([]));

const reports = (email: string) => sql`select f.kind, f.message, f.screenshot, f.context
  from feedback f join users u on u.id = f.user_id where u.email = ${email} order by f.created_at`;

test('the test mode default follows the release state', async ({ page }) => {
  await logIn(page);
  await expect(page.getByRole('checkbox', { name: 'Testmodus' })).toBeChecked({ checked: !LIVE });
});

test('the bug button sends a marked screenshot of the page', async ({ page }) => {
  const email = await logIn(page);
  await page.getByRole('checkbox', { name: 'Testmodus' }).check();
  await page.getByRole('button', { name: 'Fehler melden' }).click();

  const panel = page.getByRole('dialog', { name: 'Fehler melden' });
  await expect(panel.getByRole('img', { name: 'Screenshot' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Fehler melden' })).toBeHidden();

  await panel.getByRole('button', { name: 'Stelle markieren' }).click();
  const box = (await page.locator('.mark img').boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.4, { steps: 5 });
  await page.mouse.up();
  await page.getByRole('button', { name: 'Fertig' }).click();

  await panel.getByRole('textbox').fill('Speichern hängt');
  await panel.getByRole('button', { name: 'Senden' }).click();
  await expect(page.getByText('Danke! Wir melden uns per Mail.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Fehler melden' })).toBeVisible();

  const [report] = await reports(email);
  expect(report).toMatchObject({ kind: 'bug', message: 'Speichern hängt' });
  expect([...report!.screenshot.subarray(0, 3)]).toEqual([0xff, 0xd8, 0xff]);
  expect(report!.context).toMatchObject({ platform: 'web', page: '/dashboard', locale: 'de' });
});

test('the header takes ideas without a screenshot', async ({ page }) => {
  const email = await logIn(page);
  await page.getByRole('button', { name: 'Feedback geben' }).click();

  const panel = page.getByRole('dialog', { name: 'Feedback geben' });
  await expect(panel.getByRole('img')).toHaveCount(0);
  await panel.getByRole('textbox').fill('Ein dunkler Modus wäre schön');
  await panel.getByRole('button', { name: 'Senden' }).click();
  await expect(page.getByText('Danke! Wir melden uns per Mail.')).toBeVisible();

  const [report] = await reports(email);
  expect(report).toMatchObject({ kind: 'idea', screenshot: null });
});

test('the test mode switch in the footer hides the bug button', async ({ page }) => {
  await logIn(page);
  const testMode = page.getByRole('checkbox', { name: 'Testmodus' });
  await testMode.check();
  await expect(page.getByRole('button', { name: 'Fehler melden' })).toBeVisible();

  await testMode.uncheck();
  await expect(page.getByRole('button', { name: 'Fehler melden' })).toBeHidden();
  await page.reload();
  await expect(testMode).not.toBeChecked();
  await expect(page.getByRole('button', { name: 'Fehler melden' })).toBeHidden();

  await testMode.check();
  await expect(page.getByRole('button', { name: 'Fehler melden' })).toBeVisible();
  await page.reload();
  await expect(testMode).toBeChecked();
  await expect(page.getByRole('button', { name: 'Fehler melden' })).toBeVisible();
});

const brokenPreferences: [string, string][] = [
  ['broken', 'broken'],
  ['"false"', '{"x":"bad","y":20}'],
  ['0', '{"x":1e999,"y":20}'],
  ['null', '[]'],
];
for (const [mode, position] of brokenPreferences) {
  test(`invalid feedback preferences recover: ${mode}, ${position}`, async ({ page }) => {
    await page.addInitScript(
      ({ mode, position }) => {
        localStorage.setItem('test-mode', mode);
        localStorage.setItem('feedback-button', position);
      },
      { mode, position },
    );
    await logIn(page);
    const testMode = page.getByRole('checkbox', { name: 'Testmodus' });
    await expect(testMode).toBeChecked({ checked: !LIVE });
    await testMode.check();
    const bug = page.getByRole('button', { name: 'Fehler melden' });
    await expect(bug).toBeVisible();
    const box = (await bug.boundingBox())!;
    const viewport = page.viewportSize()!;
    expect(box.x).toBeCloseTo(viewport.width - box.width - 16, 0);
    expect(box.y).toBeCloseTo(viewport.height * 0.62, 0);
  });
}

test('the bug button keeps its saved position after moving and reloading', async ({ page }) => {
  await page.addInitScript(() => {
    if (localStorage.getItem('feedback-button') !== null) return;
    localStorage.setItem('test-mode', 'true');
    localStorage.setItem('feedback-button', JSON.stringify({ x: 80, y: 140 }));
  });
  await logIn(page);
  const bug = page.getByRole('button', { name: 'Fehler melden' });
  await expect(bug).toBeVisible();
  const box = (await bug.boundingBox())!;
  expect(box.x).toBe(80);
  expect(box.y).toBe(140);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 30, box.y + box.height / 2 + 40, { steps: 5 });
  await page.mouse.up();
  await page.reload();
  await expect(bug).toBeVisible();
  const moved = (await bug.boundingBox())!;
  expect(moved.x).toBeCloseTo(110, 0);
  expect(moved.y).toBeCloseTo(180, 0);
});
