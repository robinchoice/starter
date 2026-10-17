import wordmark from '../apps/web/static/pleasance-wordmark.svg';
import design from '../DESIGN.md' with { type: 'text' };
import { bandColor, DEEP, GLOW } from '../packages/shared/src/band.ts';

// Rows of the markdown table in DESIGN.md whose header starts with the given cell
function table(first) {
  const lines = design.split('\n');
  const start = lines.findIndex((l) => l.startsWith(`| ${first} |`));
  const rows = [];
  for (const line of lines.slice(start + 2)) {
    if (!line.startsWith('|')) break;
    rows.push(
      line
        .split('|')
        .slice(1, -1)
        .map((cell) => cell.trim().replaceAll('`', '')),
    );
  }
  return rows;
}
const num = (s) => Number(s.replace(',', '.'));

const STAGES = table('Stufe').map(([, color, theme]) => [color, theme]);
const PRODUCTS = table('Produkt').map(([name, stage, section, , , sign]) => {
  const [from, to] = section.split('–').map(num);
  return { name, stage: Number(stage), from, to, sign };
});

// Signs from the product table, drawn with the family pen: stroke 9 on the 100 grid, round ends,
// content between 22 and 78. Dots are filled circles. Products without a drawing get a dot.
const SIGNS = {
  'Route mit Ziel': '<path d="M30 76 V60 Q30 50 40 50 H60 Q70 50 70 40 V38"/><circle cx="70" cy="27" r="7"/>',
  Welle: '<path d="M22 50 C28 30 36 30 41 50 S54 70 59 50 S72 30 78 50"/>',
  Spieß: '<path d="M50 22 V78"/><path d="M36 32 H64 L57 66 H43 Z"/>',
  'Blitz im Rahmen': '<rect x="24" y="24" width="52" height="52" rx="12"/><path d="M54 33 L43 51 H57 L46 68"/>',
  'zwei Ringe': '<path d="M39 34 a16 16 0 1 0 0.01 0 M61 34 a16 16 0 1 0 0.01 0"/>',
  'zwei Punkte mit Brücke':
    '<path d="M28 52 Q50 16 72 52"/><circle cx="29" cy="70" r="7"/><circle cx="71" cy="70" r="7"/>',
  Blatt: '<path d="M34 24 H55 L68 37 V76 H34 Z"/><path d="M55 24 V37 H68"/>',
  'R mit Bein': '<path d="M30 74 V26 H52 Q72 26 72 43 Q72 60 52 60 H30 M52 60 L72 74"/>',
  'Ring mit Kern': '<path d="M50 25 a25 25 0 1 0 0.01 0"/><circle cx="50" cy="50" r="7.5"/>',
  Leuchtturm:
    '<path d="M40 77 L45 44 H55 L60 77"/><path d="M42 44 H58"/><path d="M24 26 L33 29 M76 26 L67 29"/><circle cx="50" cy="31" r="6.5"/>',
  'Dreieck aus drei Knoten':
    '<path d="M50 28 L29 69 H71 Z"/><circle cx="50" cy="28" r="7"/><circle cx="29" cy="69" r="7"/><circle cx="71" cy="69" r="7"/>',
  Sternbild:
    '<path d="M28 66 L44 38 L61 50 L73 28"/><circle cx="28" cy="66" r="7"/><circle cx="44" cy="38" r="7"/><circle cx="61" cy="50" r="7"/><circle cx="73" cy="28" r="7"/>',
  neu: '<circle cx="50" cy="50" r="6.5"/>',
};

const STACK = [
  [
    'Client',
    [
      ['SvelteKit', 'Web, Seiten hinter dem Login unter routes/(app)'],
      ['Flutter', 'optional in apps/mobile: Riverpod, go_router, flutter_map mit OSM'],
    ],
  ],
  [
    'Server',
    [
      ['Bun + Hono', 'API unter /api/v1, requireAuth, validJson mit zod'],
      ['Drizzle', 'Schema in packages/db, Migration beim API-Start'],
      ['zod', 'Schemas in packages/shared für API und Web'],
    ],
  ],
  [
    'Daten',
    [
      ['Postgres', 'auch die Rate-Limit-Zähler für alle Instanzen'],
      ['SMTP', 'sendMail, ohne SMTP_HOST steht der Link im API-Log'],
    ],
  ],
  [
    'Betrieb',
    [
      ['GitHub Actions', 'check, test mit Browser-Test, build, arm64-Images'],
      ['GHCR', 'privat, VPS 1 zieht mit vps1-ghcr-pull'],
      ['Coolify auf VPS 1', 'baut nichts, zieht nur, Domain am Service web'],
    ],
  ],
  [
    'Aufsicht',
    [
      ['GlitchTip', 'SENTRY_DSN, eigenes Projekt für die App'],
      ['Uptime Kuma', 'HTTP-Monitor auf /api/health'],
      ['advisory-alarm', 'neue Software in vps1/advisory-alarm'],
    ],
  ],
];
const BUILTIN = [
  'Deutsch und Englisch, Umschalter im Footer',
  'Login per Magic Link (Web) oder Code (App)',
  'Rate-Limit in Postgres',
  'Security-Header mit CSP',
  'GlitchTip',
  'Healthcheck mit DB-Prüfung',
  'CI mit Browser-Test',
  'Secret-Scan mit gitleaks',
  'Dependabot',
  'Coolify-Deploy',
  'PleasanceFooter mit Signatur',
];

// [title, who, what, waits for Robin]
const FLOW = [
  ['Slug', 'Robin + Agent', 'Ein Wort, gilt für Repo, Ressourcen, DB und Bundle-ID', false],
  ['Mockups', 'Robin gibt frei', '2–3 statische Richtungen in /tmp, Desktop und Handy, mit Empfehlung', true],
  ['Repo', 'Agent', 'gh repo create --template robinchoice/starter --public, AGENTS.md ausfüllen', false],
  ['Farbe & Zeichen', 'Agent', 'Stufe, Ausschnitt in APP_BAND, Zeile in DESIGN.md', false],
  ['Bauen', 'Agent', 'Freigegebenes Mockup als Vorlage, Texte DE und EN', false],
  ['Prüfen', 'Agent', 'bun run check && bun run test && bun run build', false],
  ['Commit', 'Agent', 'Mit Pfaden, signiert, nur eigene Änderungen', false],
  ['Push', 'Agent', 'Fertig heißt gepusht. Vorher git fetch und Neues einarbeiten', false],
  ['CI', 'GitHub Actions', 'Prüft, scannt nach Secrets und baut arm64-Images nach GHCR', false],
  ['Deploy', 'Coolify', 'Zieht die Images. Agent wartet mit gh run watch, prüft /api/health', false],
  ['Aufsicht', 'automatisch', 'GlitchTip, Uptime Kuma, advisory-alarm, infra.md nachziehen', false],
];

const RULES = {
  Gestaltung: [
    [
      'Verlauf immer von unten links nach oben rechts',
      'Verlauf nur, wo gehandelt wird: Hauptbutton, aktiver Tab, Fortschritt',
      'Text auf Verlauf in #17171A',
      'deep-Töne für Text, Links und dünne Linien auf hellem Grund',
      'Zeichen einfarbig in 20 px prüfen',
      'Absender „ein Werkzeug von“ mit Signatur im Footer',
    ],
    [
      'Verlauf als Seitenhintergrund, in Fließtext oder auf mehr als einer Fläche pro Bereich',
      'Weiße Schrift auf Verläufen',
      'Kacheln, deren ganze Fläche Verlauf ist',
      'Schriften oder Tracker von Dritten beim Seitenaufruf',
      'Farbband, Stufen oder Themen nach außen benennen',
      'Esoterische Symbolik',
    ],
  ],
  Code: [
    [
      'Jeder sichtbare Text auf Deutsch und Englisch in messages.ts',
      'Fehler als { error } in der Sprache des Clients',
      'rateLimit für alles, was Mails schickt oder Geheimnisse prüft',
      'Externe Quellen in die CSP eintragen',
      'LLM mit Fremdtext: ohne Tools, Text abgegrenzt, Antwort mit Schema',
      'Erkenntnisse, die für alle gelten, im Starter nachziehen',
      'AGENTS.md mit Zweck & Links, Checks, Deploy, Fallen',
    ],
    [
      'Vorzeitige Abstraktionen',
      'Error-Handling für Fälle, die nicht eintreten können',
      'Feature-Flags oder Kompatibilitäts-Shims',
      'Ungefragte READMEs, Kommentare oder Typ-Annotationen',
      'Vom Stack abweichen ohne Rückfrage',
      'Geld, Rechte, Mails oder Löschungen allein auf ein Modellurteil',
    ],
  ],
  Git: [
    [
      'Zu Beginn git status --short lesen, Vorhandenes gehört anderen',
      'Mit Pfaden stagen und committen',
      'Vor dem Commit git diff HEAD -- <dateien> lesen',
      'Nach grünen Checks selbst pushen, in khala und ai-engineering vorher fragen',
      'Nach dem Push CI und Deploy abwarten, Live-URL prüfen',
      'Eigene Hashes im Abschluss nennen',
    ],
    [
      'git add -A, git add ., git commit -a',
      'stash, reset --hard, clean, checkout auf fremde Dateien',
      'Signatur oder Hooks abschalten',
      '--force auf main',
      'PRs in Repos ohne Mitarbeiter',
    ],
  ],
};

const $ = (id) => document.getElementById(id);
const pct = (p) => ((p - 1) / 6) * 100;
const fmt = (n) => n.toFixed(2).replace('.', ',');

const stops = (band, tones) => [band.from, (band.from + band.to) / 2, band.to].map((p) => bandColor(p, tones));
const gradient = (band) => `linear-gradient(45deg, ${stops(band, GLOW).join(', ')})`;

function luminance(hex) {
  const [r, g, b] = [1, 3, 5]
    .map((k) => Number.parseInt(hex.slice(k, k + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a, b) {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}

let tileId = 0;
function tile(band, sign, size) {
  const id = `t${tileId++}`;
  const [a, m, b] = stops(band, GLOW);
  return `<svg width="${size}" height="${size}" viewBox="0 0 100 100" aria-hidden="true">
    <defs><linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="22" y1="78" x2="78" y2="22">
    <stop offset="0" stop-color="${a}"/><stop offset=".5" stop-color="${m}"/><stop offset="1" stop-color="${b}"/>
    </linearGradient></defs><rect width="100" height="100" rx="24" fill="#121117"/>
    <g fill="none" stroke="url(#${id})" stroke-width="9" stroke-linecap="round" stroke-linejoin="round">
    ${(SIGNS[sign] ?? SIGNS.neu).replaceAll('<circle', `<circle fill="url(#${id})" stroke="none"`)}</g></svg>`;
}

const root = document.documentElement.style;
root.setProperty('--spectrum', `linear-gradient(90deg, ${GLOW.join(', ')})`);
root.setProperty('--spectrum-deep', `linear-gradient(90deg, ${DEEP.join(', ')})`);

// Product wall
$('stages').innerHTML = STAGES.map(([color], i) => {
  const shift = i === 0 ? 0 : i === 6 ? -100 : -50;
  return `<span class="stage" style="left:${pct(i + 1)}%;transform:translateX(${shift}%)">${i + 1}<span class="stage-name"> · ${color}</span></span>`;
}).join('');
$('lanes').innerHTML = PRODUCTS.map(
  (p, i) => `<button type="button" class="lane" data-i="${i}"
    style="left:${pct(p.from)}%;width:${pct(p.to) - pct(p.from)}%;top:${(i % 4) * 44}px">
    <span class="lane-bar" style="background:${gradient(p)}"></span>
    <span class="lane-label">${tile(p, p.sign, 20)} ${p.name}</span></button>`,
).join('');
const cards = PRODUCTS.map(
  (p, i) => `<button type="button" class="card" data-i="${i}">${tile(p, p.sign, 56)}
    <span class="card-name display">${p.name}</span>
    <span class="mini"><i class="mini-mark" style="left:${pct(p.from)}%;width:${pct(p.to) - pct(p.from)}%;background:${gradient(p)}"></i></span>
    <span class="card-meta">Stufe ${p.stage} · ${fmt(p.from)}–${fmt(p.to)}</span></button>`,
).join('');
$('wall').innerHTML = `${cards}<button type="button" class="card new" id="new">
  <span class="plus">+</span><span>Neuer Prototyp</span></button>`;

// Naming, see naming.md
let area = 'pleasance';
function derive(slug) {
  const domain = area === 'pleasance' ? 'pleasance.org' : 'diespaetzles.lol';
  const bucket = area === 'pleasance' ? 'pleasance' : 'diespaetzles';
  return {
    Code: [
      ['GitHub-Repo', `robinchoice/${slug}`],
      ['Lokaler Ordner', `~/dev/${slug}`],
      ['Bundle-ID', `org.pleasance.${slug}`],
      ['Datenbank', slug],
    ],
    Betrieb: [
      ['Domain', `${slug}.${domain}`],
      ['API', `${slug}.${domain}/api`],
      ['Healthcheck', '/api/health'],
      ['Coolify-Projekt', `${area}-${slug}`],
      ['Coolify-Ressource', slug],
      ['Images', `ghcr.io/robinchoice/${slug}-web, -api`],
    ],
    Zugänge: [
      ['Deploy-Key', `github-deploy-${slug}`],
      ['CI-Token', `ci-${slug}`],
      ['Actions-Secrets', 'COOLIFY_TOKEN, COOLIFY_UUID'],
      ['S3-Bucket', `${bucket}-${slug}`],
    ],
  };
}
function renderNames() {
  const slug = $('slug').value;
  const ok = /^[a-z][a-z0-9]*$/.test(slug);
  let problem = 'Nur ASCII-Kleinbuchstaben und Ziffern';
  if (!slug) problem = 'Slug fehlt';
  else if (slug.includes('-')) problem = 'Kein Bindestrich, ein Wort';
  else if (/[A-Z]/.test(slug)) problem = 'Nur Kleinbuchstaben';
  else if (/^[0-9]/.test(slug)) problem = 'Muss mit einem Buchstaben beginnen';
  $('valid').className = `valid ${ok ? 'ok' : 'bad'}`;
  $('valid').textContent = ok ? '✓ gültiger Slug' : `✕ ${problem}`;
  const shown = ok ? slug : slug.toLowerCase().replace(/[^a-z0-9]/g, '') || 'slug';
  $('names').innerHTML = Object.entries(derive(shown))
    .map(
      ([group, rows]) => `<div class="ng ${ok ? '' : 'dim'}"><h3 class="display">${group}</h3>
        ${rows.map(([k, v]) => `<div class="row"><span class="row-key">${k}</span><code class="row-value">${v}</code></div>`).join('')}</div>`,
    )
    .join('');
}
$('slug').addEventListener('input', renderNames);
for (const b of document.querySelectorAll('#area button')) {
  b.addEventListener('click', () => {
    area = b.dataset.a;
    for (const x of document.querySelectorAll('#area button')) x.setAttribute('aria-pressed', x === b);
    renderNames();
  });
}

// Colour workbench
let current = null;
$('ticks').innerHTML = STAGES.map((_, i) => {
  const shift = i === 0 ? 'none' : i === 6 ? 'translateX(-100%)' : 'translateX(-50%)';
  return `<span style="left:${pct(i + 1)}%;transform:${shift}">${i + 1}</span>`;
}).join('');
$('blanes').innerHTML = PRODUCTS.map(
  (p, i) => `<button type="button" data-i="${i}" title="${p.name}"
    style="left:${pct(p.from)}%;width:${pct(p.to) - pct(p.from)}%;top:${(i % 4) * 18}px">
    <i style="background:${gradient(p)}"></i><em>${p.name}</em></button>`,
).join('');

function preview(band, light) {
  const g = gradient(band);
  const name = current ? current.name : $('slug').value || 'Neu';
  const link = light
    ? `<p class="prev-text">Fließtext mit <a href="#farbe" style="color:${stops(band, DEEP)[1]}">Link in deep</a>.</p>`
    : '';
  const signature = `background:linear-gradient(rgb(${light ? '255 255 255 / .6' : '0 0 0 / .55'}),
    rgb(${light ? '255 255 255 / .6' : '0 0 0 / .55'})), var(--spectrum);position:relative`;
  return `<div class="prev-head">${tile(band, current ? current.sign : 'neu', 40)}<b class="prev-name">${name}</b></div>
    <div class="tabs" style="--g:${g}"><span class="tab on">Heute</span><span class="tab">Verlauf</span><span class="tab">Konto</span></div>
    ${link}<button type="button" class="btn" style="background:${g}">Speichern</button>
    <div class="bar"><i class="bar-fill" style="background:${g}"></i></div>
    <div style="display:flex;gap:.5rem;align-items:baseline;font-size:13px;opacity:.85">
      <span class="by">ein Werkzeug von</span>
      <span class="sig"><img src="${wordmark}" alt="" style="${light ? '' : 'filter:none'}"/>
      <span style="${signature}"><i style="position:absolute;top:-1px;height:4px;border-radius:2px;min-width:6px;
        left:${pct(band.from)}%;width:${pct(band.to) - pct(band.from)}%;background:${g}"></i></span></span></div>`;
}

function renderBand() {
  let from = Number($('from').value);
  let to = Number($('to').value);
  if (to <= from) {
    to = Math.min(7, from + 0.05);
    from = to - 0.05;
    $('to').value = to;
  }
  const band = { from, to };
  $('sel').style.left = `${pct(from)}%`;
  $('sel').style.width = `${pct(to) - pct(from)}%`;
  $('pdark').innerHTML = preview(band, false);
  $('plight').innerHTML = preview(band, true);

  const width = to - from;
  const widthOk = width > 0.3 - 1e-9 && width < 1 + 1e-9;
  const own = Math.ceil(from - 1e-9);
  const hasStage = own <= to + 1e-9;
  const stage = current ? current.stage : own;
  const others = PRODUCTS.filter((p) => p !== current && p.from < to - 1e-9 && from < p.to - 1e-9);
  const glow = stops(band, GLOW);
  const deep = stops(band, DEEP);
  const min = (list, fn) => Math.min(...list.map(fn)).toFixed(1);
  const facts = [
    [widthOk ? '' : 'err', 'Breite', `${fmt(width)} Stufen ${widthOk ? '✓' : '✕ 0,3–1,0'}`],
    [
      hasStage ? '' : 'warn',
      'Stufe',
      hasStage || current
        ? `${stage} · ${STAGES[stage - 1][0]} · ${STAGES[stage - 1][1]}${hasStage ? '' : ', Ton nicht enthalten'}`
        : 'enthält keinen Stufenton',
    ],
    [others.length ? 'warn' : '', 'Überdeckt', others.length ? others.map((p) => p.name).join(', ') : 'nichts ✓'],
    ['', 'glow auf #0E0D12', `≥ ${min(glow, (c) => contrast(c, '#0E0D12'))}:1`],
    ['', '#17171A auf glow', `≥ ${min(glow, (c) => contrast('#17171A', c))}:1`],
    ['', 'deep auf Paper', `≥ ${min(deep, (c) => contrast(c, '#F4F4F1'))}:1`],
  ];
  $('facts').innerHTML = facts.map(([c, k, v]) => `<div class="fact ${c}"><span>${k}</span><b>${v}</b></div>`).join('');
  const r = (n) => Number(n.toFixed(2));
  $('snip').innerHTML = `<i>// packages/shared/src/index.ts</i>
export const APP_BAND: Band = { from: ${r(from)}, to: ${r(to)} };
<i>// apps/mobile/lib/config.dart</i>
const appBand = Band(${r(from)}, ${r(to)});
<i>// glow</i> ${glow.join(' ')}
<i>// deep</i> ${deep.join(' ')}`;
}

function load(product) {
  current = product;
  $('from').value = product.from;
  $('to').value = product.to;
  renderBand();
}
for (const input of [$('from'), $('to')]) {
  input.addEventListener('input', () => {
    current = null;
    renderBand();
  });
}
$('slug').addEventListener('input', () => {
  current = null;
  renderBand();
});
for (const b of document.querySelectorAll('[data-i]')) {
  b.addEventListener('click', () => {
    load(PRODUCTS[b.dataset.i]);
    $('farbe').scrollIntoView({ behavior: 'smooth' });
  });
}
$('new').addEventListener('click', () => {
  current = null;
  $('slug').select();
  $('namen').scrollIntoView({ behavior: 'smooth' });
  renderBand();
});

// Flow, stack, rules
$('flow').innerHTML = FLOW.map(
  ([title, who, what, gate], i) =>
    `<div class="step ${gate ? 'gate' : ''}"><b class="step-title">${i + 1} · ${title}</b>${who}<br>${what}</div>`,
).join('');
$('layers').innerHTML = STACK.map(
  ([layer, items]) => `<div class="layer"><b>${layer}</b><div class="items">
    ${items.map(([name, note]) => `<div class="item"><b>${name}</b>${note}</div>`).join('')}</div></div>`,
).join('');
$('builtin').innerHTML = BUILTIN.map((b) => `<span>${b}</span>`).join('');
$('rtabs').innerHTML = Object.keys(RULES)
  .map((k, i) => `<button type="button" aria-pressed="${i === 0}">${k}</button>`)
  .join('');
function renderRules(key) {
  const [yes, no] = RULES[key];
  const list = (items) => `<ul>${items.map((x) => `<li>${x.replace(/</g, '&lt;')}</li>`).join('')}</ul>`;
  $('rules').innerHTML = `<div class="rcol"><h3 class="display">So</h3>${list(yes)}</div>
    <div class="rcol no"><h3 class="display">Nicht so</h3>${list(no)}</div>`;
  for (const b of $('rtabs').children) b.setAttribute('aria-pressed', b.textContent === key);
}
for (const b of $('rtabs').children) b.addEventListener('click', () => renderRules(b.textContent));

const links = [...document.querySelectorAll('nav a')];
const observer = new IntersectionObserver(
  (entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      for (const a of links) a.classList.toggle('on', a.getAttribute('href') === `#${e.target.id}`);
    }
  },
  { rootMargin: '-30% 0px -60% 0px' },
);
for (const s of document.querySelectorAll('section')) observer.observe(s);

renderNames();
renderBand();
renderRules('Gestaltung');
