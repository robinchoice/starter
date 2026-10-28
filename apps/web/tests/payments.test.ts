import { expect, test } from '@playwright/test';
import { logIn } from './login';

// Console errors fail the test, CSP violations included
let errors: string[] = [];
test.beforeEach(({ page }) => {
  errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));
});
test.afterEach(() => expect(errors).toEqual([]));

// The browser tests run with PAYMENTS_BACKEND=fake: every invoice pays itself after two seconds
test('checkout shows the invoice as QR code and unlocks the product once it is paid', async ({ page }) => {
  await logIn(page);
  await page.goto('/checkout');
  await expect(page.getByRole('heading', { name: 'Demo-Freischaltung' })).toBeVisible();
  await expect(page.getByText('21 sats')).toBeVisible();

  await page.getByRole('button', { name: 'Mit Lightning bezahlen' }).click();
  await expect(page.getByRole('img', { name: 'Scanne den Code' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'In Wallet öffnen' })).toHaveAttribute('href', /^lightning:lnfake1/);
  await expect(page.getByText('Warte auf die Zahlung')).toBeVisible();

  await expect(page.getByText('Bezahlt. Danke!')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText('Freigeschaltet')).toBeVisible();
  await page.reload();
  await expect(page.getByText('Freigeschaltet')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Mit Lightning bezahlen' })).toHaveCount(0);
});
