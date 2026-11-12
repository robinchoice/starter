import { expect, type Page, test } from '@playwright/test';

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

// pleasance.org answers from here, the test app itself is one of the apps
async function servePleasance(page: Page, self: string) {
  const icon = (name: string) => `https://pleasance.org/img/werkzeuge/${name}.svg`;
  const apps = [
    { name: 'Music Hub', url: 'https://hub.pleasance.org', icon: icon('musichub'), band: { from: 1.35, to: 2.2 } },
    { name: 'Starter', url: self, icon: icon('starter'), band: { from: 3.85, to: 4.55 } },
    {
      name: 'Savor',
      url: 'https://savor.pleasance.org',
      icon: icon('savor'),
      band: { from: 5.5, to: 6.45 },
      desktop: true,
    },
  ];
  await page.route('https://pleasance.org/apps.json', (route) =>
    route.fulfill({ json: { apps }, headers: { 'access-control-allow-origin': '*' } }),
  );
  await page.route('https://pleasance.org/img/**', (route) =>
    route.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="24"/></svg>',
    }),
  );
}

test('the wordmark links to pleasance.org, hovering the band pops up the apps', async ({ page, baseURL }) => {
  await servePleasance(page, baseURL!);
  await page.goto('/');
  const footer = page.locator('footer');
  await expect(footer.getByRole('link', { name: 'ein Werkzeug von Pleasance' })).toHaveAttribute(
    'href',
    'https://pleasance.org',
  );
  const band = footer.getByRole('button', { name: 'Werkzeuge von Pleasance' });
  await expect(band).toHaveAttribute('aria-expanded', 'false');

  await band.hover();
  await expect(band).toHaveAttribute('aria-expanded', 'true');
  const dock = footer.getByRole('list', { name: 'Werkzeuge von Pleasance' });
  await expect(dock.getByRole('link')).toHaveCount(3);
  await expect(dock.getByRole('link', { name: 'Savor, Desktop-App' })).toHaveAttribute(
    'href',
    'https://savor.pleasance.org',
  );
  await expect(dock.getByRole('link', { name: 'Starter' })).toHaveAttribute('aria-current', 'page');

  // Like the Dock: the icon under the pointer grows
  const hub = dock.getByRole('link', { name: 'Music Hub' });
  const before = (await hub.boundingBox())!.width;
  await hub.hover();
  await expect.poll(async () => (await hub.boundingBox())!.width).toBeGreaterThan(before * 1.4);

  await page.mouse.move(600, 100);
  await expect(band).toHaveAttribute('aria-expanded', 'false');
});

test('the keyboard walks the apps and Escape closes the dock', async ({ page, baseURL }) => {
  await servePleasance(page, baseURL!);
  await page.goto('/');
  const band = page.getByRole('button', { name: 'Werkzeuge von Pleasance' });
  await band.focus();
  await page.keyboard.press('Enter');
  const dock = page.getByRole('list', { name: 'Werkzeuge von Pleasance' });
  // Starts at the current app
  await expect(dock.getByRole('link', { name: 'Starter' })).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(dock.getByRole('link', { name: 'Savor, Desktop-App' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(band).toBeFocused();
  await expect(band).toHaveAttribute('aria-expanded', 'false');
});
