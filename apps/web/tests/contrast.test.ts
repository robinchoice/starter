import { readFileSync } from 'node:fs';
import { bandColor, DEEP, GLOW } from '@app/shared/band';
import { expect, test } from '@playwright/test';

// WCAG contrast of the colour pairs the family promises in DESIGN.md. Values come
// from where they are defined: the rendered web layout, the app's brand.dart and,
// for the dark neutrals that no code defines yet, the front matter of DESIGN.md.
// Text needs 4.5:1, a focus ring 3:1.

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const v = Number.parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light! + 0.05) / (dark! + 0.05);
}

type Pair = [foreground: string, background: string, minimum: number];

// Lists every failing pair, so one run shows all of them
function failures(colors: Record<string, string>, pairs: Pair[]): string[] {
  return pairs.flatMap(([fg, bg, minimum]) => {
    // #fff becomes #ffffff
    const [a, b] = [colors[fg], colors[bg]].map((c) => c?.replace(/^#(\w)(\w)(\w)$/, '#$1$1$2$2$3$3'));
    if (!a?.match(/^#[0-9a-f]{6}$/i) || !b?.match(/^#[0-9a-f]{6}$/i)) return [`${fg} on ${bg}: not a hex colour`];
    const ratio = contrast(a, b);
    return ratio < minimum ? [`${fg} ${a} on ${bg} ${b}: ${ratio.toFixed(2)} < ${minimum}`] : [];
  });
}

// Every position of the band, as products pick any section of it
const positions = Array.from({ length: 601 }, (_, i) => 1 + i / 100);

test('web layout colours keep their contrast', async ({ page }) => {
  await page.goto('/');
  const colors = await page.evaluate(() => {
    const root = getComputedStyle(document.documentElement);
    const shell = document.querySelector('.shell');
    const names = [
      '--bg',
      '--surface',
      '--text',
      '--muted',
      '--needs',
      '--needs-bg',
      '--new',
      '--new-bg',
      '--error',
      '--error-bg',
    ];
    const tokens = Object.fromEntries(names.map((name) => [name, root.getPropertyValue(name).trim()]));
    return { ...tokens, '--accent': shell ? getComputedStyle(shell).getPropertyValue('--accent').trim() : '' };
  });
  const pairs: Pair[] = [];
  for (const bg of ['--bg', '--surface']) {
    for (const fg of ['--text', '--muted', '--needs', '--new', '--error']) pairs.push([fg, bg, 4.5]);
    pairs.push(['--accent', bg, 3]);
  }
  for (const bg of ['--needs-bg', '--new-bg', '--error-bg']) pairs.push(['--text', bg, 4.5]);
  // Deep for text and links on light ground, ink on gradient surfaces
  const band: Record<string, string> = { ...colors };
  for (const p of positions) {
    band[`deep ${p}`] = bandColor(p, DEEP);
    band[`glow ${p}`] = bandColor(p, GLOW);
    pairs.push([`deep ${p}`, '--bg', 4.5], [`deep ${p}`, '--surface', 4.5], ['--text', `glow ${p}`, 4.5]);
  }
  expect(failures(band, pairs)).toEqual([]);
});

test('app brand colours keep their contrast', () => {
  const dart = readFileSync(new URL('../../mobile/lib/core/brand.dart', import.meta.url), 'utf8');
  const colors = Object.fromEntries(
    [...dart.matchAll(/^const (\w+) = Color\(0xFF([0-9A-F]{6})\);/gm)].map(([, name, hex]) => [name, `#${hex}`]),
  );
  const pairs: Pair[] = [
    ['ink', 'paper', 4.5],
    ['muted', 'paper', 4.5],
    ['needsDeep', 'paper', 4.5],
    ['newDeep', 'paper', 4.5],
    ['errorDeep', 'paper', 4.5],
    ['ink', 'needsGlow', 4.5],
    ['ink', 'newGlow', 4.5],
    ['ink', 'errorGlow', 4.5],
  ];
  expect(failures(colors, pairs)).toEqual([]);
});

test('dark neutrals keep their contrast', () => {
  const design = readFileSync(new URL('../../../DESIGN.md', import.meta.url), 'utf8');
  const dark = design.match(/^ {2}dark: \{(.+)\}$/m)?.[1] ?? '';
  const colors: Record<string, string> = Object.fromEntries(
    [...dark.matchAll(/(\w+): "(#[0-9A-F]{6})"/g)].map(([, name, hex]) => [name, hex]),
  );
  const pairs: Pair[] = [
    ['text', 'bg', 4.5],
    ['text', 'raised', 4.5],
    ['muted', 'bg', 4.5],
    ['muted', 'raised', 4.5],
  ];
  for (const p of positions) {
    colors[`glow ${p}`] = bandColor(p, GLOW);
    pairs.push([`glow ${p}`, 'bg', 4.5]);
  }
  expect(failures(colors, pairs)).toEqual([]);
});
