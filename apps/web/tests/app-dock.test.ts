import { type CDPSession, expect, type Locator, type Page, test } from '@playwright/test';

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

const icon = (name: string) => `https://pleasance.org/img/werkzeuge/${name}.svg`;
const musicHub = {
  name: 'Music Hub',
  url: 'https://hub.pleasance.org',
  icon: icon('musichub'),
  band: { from: 1.35, to: 2.2 },
};

// pleasance.org answers from here, the test app itself is one of the apps
async function servePleasance(page: Page, self: string, more: object[] = []) {
  const apps = [
    ...more,
    musicHub,
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

test('regression: apps.json listing a URL twice still opens the dock', async ({ page, baseURL }) => {
  await servePleasance(page, baseURL!, [{ ...musicHub, band: { from: 6.6, to: 7 } }]);
  await page.goto('/');
  await page.getByRole('button', { name: 'Werkzeuge von Pleasance' }).hover();
  const dock = page.getByRole('list', { name: 'Werkzeuge von Pleasance' });
  await expect(dock.getByRole('link', { name: 'Music Hub' })).toHaveCount(2);
});

test('regression: a page restored from the bfcache shows the dock closed', async ({ page, baseURL }) => {
  await servePleasance(page, baseURL!);
  await page.goto('/');
  const band = page.getByRole('button', { name: 'Werkzeuge von Pleasance' });
  await band.hover();
  await expect(band).toHaveAttribute('aria-expanded', 'true');
  await page.evaluate(() => dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
  await expect(band).toHaveAttribute('aria-expanded', 'false');
});

type Point = { x: number; y: number };

// Real touch input, fingers numbered in the order given
const touch = (cdp: CDPSession, type: 'touchStart' | 'touchMove' | 'touchEnd', points: Point[]) =>
  cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points.map((point, id) => ({ ...point, id })) });

async function center(target: Locator): Promise<Point> {
  const box = (await target.boundingBox())!;
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

test.describe('touch', () => {
  test.use({ hasTouch: true });

  // A finger goes down on the band, slides onto Music Hub and stays there
  async function slideToMusicHub(page: Page, baseURL: string) {
    await servePleasance(page, baseURL);
    await page.route('https://hub.pleasance.org/**', (route) =>
      route.fulfill({ contentType: 'text/html', body: 'Hub' }),
    );
    await page.goto('/');
    const band = page.getByRole('button', { name: 'Werkzeuge von Pleasance' });
    await band.scrollIntoViewIfNeeded();
    const cdp = await page.context().newCDPSession(page);
    await touch(cdp, 'touchStart', [await center(band)]);
    await expect(band).toHaveAttribute('aria-expanded', 'true');
    const hub = page.getByRole('list', { name: 'Werkzeuge von Pleasance' }).getByRole('link', { name: 'Music Hub' });
    // Twice, the row moves as the icons under the finger grow
    await touch(cdp, 'touchMove', [await center(hub)]);
    const finger = await center(hub);
    await touch(cdp, 'touchMove', [finger]);
    return { band, cdp, finger };
  }

  test('sliding from the band onto an app and lifting the finger opens it', async ({ page, baseURL }) => {
    const { cdp } = await slideToMusicHub(page, baseURL!);
    await touch(cdp, 'touchEnd', []);
    await page.waitForURL('https://hub.pleasance.org/');
  });

  test('regression: a dock closed while a finger slides opens no app when it lifts', async ({ page, baseURL }) => {
    const { band, cdp, finger } = await slideToMusicHub(page, baseURL!);
    // A second finger beside the dock closes it
    await touch(cdp, 'touchStart', [finger, { x: 20, y: 20 }]);
    await expect(band).toHaveAttribute('aria-expanded', 'false');
    await touch(cdp, 'touchEnd', []);
    await page.waitForTimeout(300);
    expect(page.url()).toBe(`${baseURL}/`);
  });
});
