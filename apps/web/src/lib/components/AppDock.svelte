<script lang="ts">
  // The colour band under the Pleasance wordmark. Hovering it pops up the other
  // Pleasance apps like the macOS Dock (DESIGN.md, "Absender"). The list comes from
  // pleasance.org on first use, without cookies or referrer.
  import { APP_BAND, LINKS } from '@app/shared/app';
  import { bandColor, GLOW } from '@app/shared/band';
  import { type PleasanceApp, pleasanceAppsSchema } from '@app/shared/schemas';
  import { tick } from 'svelte';
  import { backOut } from 'svelte/easing';
  import { type DockSlot, dockLayout } from '#lib/dock.ts';
  import { t } from '#lib/i18n.ts';

  type Slot = { app: PleasanceApp | null; stage: number };

  // Icons sit this far above the band, clear of the wordmark. The list starts
  // ABOVE px up, so the wordmark beneath stays clickable while the dock is open.
  const LIFT = 26;
  const ABOVE = 20;
  const GAP = 6;
  // Free spots are smaller than apps
  const FREE = 0.6;

  let apps = $state<PleasanceApp[]>();
  let request: Promise<void> | undefined;
  let open = $state(false);
  let pointer = $state<number | null>(null);
  let hot = $state(-1);
  let launching = $state(-1);
  let row = $state<DockSlot[]>([]);
  let rootLeft = $state(0);
  let root: HTMLElement;
  let button: HTMLButtonElement;
  let links: HTMLAnchorElement[] = $state([]);
  let closeTimer: ReturnType<typeof setTimeout> | undefined;

  const middle = (app: PleasanceApp) => (app.band.from + app.band.to) / 2;
  // Seven places in band order. A place holds the apps whose section centres
  // on it, a place without one shows as a free spot.
  const slots = $derived.by((): Slot[] => {
    if (!apps) return [];
    const list = apps;
    return [1, 2, 3, 4, 5, 6, 7].flatMap((stage): Slot[] => {
      const here = list.filter((app) => Math.round(middle(app)) === stage).sort((a, b) => middle(a) - middle(b));
      return here.length > 0 ? here.map((app) => ({ app, stage })) : [{ app: null, stage }];
    });
  });
  const isCurrent = (app: PleasanceApp) => new URL(app.url).origin === location.origin;

  function load() {
    request ??= fetch(LINKS.pleasanceApps, { credentials: 'omit', referrerPolicy: 'no-referrer' })
      .then((response) => response.json())
      .then((json: unknown) => {
        const parsed = pleasanceAppsSchema.safeParse(json);
        if (!parsed.success) throw parsed.error;
        apps = parsed.data.apps;
      })
      // The next hover tries again
      .catch(() => {
        request = undefined;
      });
    return request;
  }

  function place() {
    const touch = matchMedia('(pointer: coarse)').matches;
    const base = touch ? 40 : 34;
    const r = root.getBoundingClientRect();
    rootLeft = r.left;
    row = dockLayout({
      sizes: slots.map((slot) => (slot.app ? base : base * FREE)),
      gap: GAP,
      grow: touch ? 0.45 : 0.75,
      reach: 2.5,
      center: r.left + r.width / 2,
      pointer,
      min: 8,
      max: document.documentElement.clientWidth - 8,
    });
  }

  // Set while the dock should be open, so a slow first load cannot open it
  // after the pointer has already left
  let wanted = false;
  async function show() {
    clearTimeout(closeTimer);
    wanted = true;
    await load();
    if (!wanted || open || slots.length === 0) return;
    pointer = null;
    place();
    open = true;
  }
  function close() {
    clearTimeout(closeTimer);
    // Focus on an icon that is about to vanish goes back to the band
    if (open && root.contains(document.activeElement) && document.activeElement !== button) button.focus();
    wanted = false;
    open = false;
    pointer = null;
    hot = -1;
  }
  const closeSoon = () => {
    clearTimeout(closeTimer);
    closeTimer = setTimeout(close, 300);
  };

  // Index of the icon under the point, only over the icons themselves, not over
  // the band or the gap above it
  function hit(x: number, y: number) {
    const bottom = root.getBoundingClientRect().top - LIFT;
    return row.findIndex(
      (slot) =>
        y <= bottom + 4 &&
        y >= bottom - slot.size - 4 &&
        x >= slot.left - GAP / 2 &&
        x <= slot.left + slot.size + GAP / 2,
    );
  }
  function track(event: PointerEvent) {
    if (!open) return;
    pointer = event.clientX;
    place();
    hot = hit(event.clientX, event.clientY);
  }

  // Mouse: hovering opens, leaving closes after a moment
  function enter(event: PointerEvent) {
    if (event.pointerType === 'mouse') void show();
  }
  function leave(event: PointerEvent) {
    if (event.pointerType === 'mouse') closeSoon();
  }

  // Touch: tapping the band opens, sliding onto an icon and lifting opens that app
  let dragging = false;
  // The click that follows a tap must not reopen what the tap closed
  let tapped = false;
  async function press(event: PointerEvent) {
    if (event.pointerType === 'mouse') return;
    event.preventDefault();
    tapped = true;
    if (open) return close();
    button.setPointerCapture(event.pointerId);
    dragging = true;
    await show();
  }
  function release(event: PointerEvent) {
    if (!dragging) return;
    dragging = false;
    const index = hit(event.clientX, event.clientY);
    const app = slots[index]?.app;
    if (!app || isCurrent(app)) return;
    launching = index;
    location.assign(app.url);
  }
  function cancel() {
    dragging = false;
    tapped = false;
  }
  function click() {
    if (tapped) tapped = false;
    else void show();
  }

  // Keyboard: Enter or the arrows open, arrows walk the apps, Escape closes
  const appLinks = () => links.filter(Boolean);
  async function keyOnBand(event: KeyboardEvent) {
    if (event.key === 'Escape') return close();
    if (!['Enter', ' ', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    await show();
    await tick();
    const all = appLinks();
    const start = Math.max(
      0,
      all.findIndex((link) => link.getAttribute('aria-current') === 'page'),
    );
    const step = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0;
    all[Math.min(all.length - 1, Math.max(0, start + step))]?.focus();
  }
  function keyInDock(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      close();
      button.focus();
      return;
    }
    const all = appLinks();
    const i = all.indexOf(document.activeElement as HTMLAnchorElement);
    if (i < 0) return;
    const next = event.key === 'ArrowLeft' ? i - 1 : event.key === 'ArrowRight' ? i + 1 : -1;
    if (next < 0 || next >= all.length) return;
    event.preventDefault();
    all[next]?.focus();
  }
  function focusIcon(index: number) {
    const slot = row[index];
    if (!slot) return;
    pointer = slot.left + slot.size / 2;
    place();
    hot = index;
  }
  function blur(event: FocusEvent) {
    if (!root.contains(event.relatedTarget as Node | null)) close();
  }

  // Taps outside close the dock on touch screens
  $effect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!root.contains(event.target as Node)) close();
    };
    const resize = () => place();
    document.addEventListener('pointerdown', outside);
    addEventListener('resize', resize);
    return () => {
      document.removeEventListener('pointerdown', outside);
      removeEventListener('resize', resize);
    };
  });

  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Pops out of the band, the icons nearest to the marker first
  function pop(_node: Element, { delay }: { delay: number }) {
    return {
      delay: reduced() ? 0 : delay,
      duration: reduced() ? 0 : 320,
      easing: backOut,
      css: (k: number) => `opacity: ${Math.min(1, k * 2)}; transform: translateY(${(1 - k) * 14}px) scale(${0.4 + 0.6 * k})`,
    };
  }
  const markerStage = (APP_BAND.from + APP_BAND.to) / 2;

  const first = $derived(row[0]);
  const last = $derived(row.at(-1));
  const rowLeft = $derived(first ? first.left - rootLeft - 12 : 0);
  const rowWidth = $derived(first && last ? last.left + last.size - first.left + 24 : 0);
  const label = $derived.by(() => {
    const slot = slots[hot];
    const at = row[hot];
    if (!slot || !at) return null;
    const note = slot.app ? (isCurrent(slot.app) ? t().youAreHere : slot.app.desktop ? t().desktopApp : '') : '';
    return { name: slot.app?.name ?? t().freeSpot, note, x: at.left - rootLeft + at.size / 2, y: LIFT - ABOVE + at.size + 8 };
  });
</script>

<div
  class="dock"
  class:open
  bind:this={root}
  role="presentation"
  style:--glow={bandColor(markerStage, GLOW)}
  onpointerenter={enter}
  onpointerleave={leave}
  onpointermove={track}
  onfocusout={blur}
>
  <button
    bind:this={button}
    type="button"
    aria-label={t().pleasanceTools}
    aria-expanded={open}
    aria-controls="pleasance-apps"
    onclick={click}
    onpointerdown={press}
    onpointerup={release}
    onpointercancel={cancel}
    onkeydown={keyOnBand}
  >
    <span class="band"><span
        class="marker"
        style:left="{((APP_BAND.from - 1) / 6) * 100}%"
        style:width="{((APP_BAND.to - APP_BAND.from) / 6) * 100}%"
      ></span></span>
  </button>
  {#if open}
    <ul id="pleasance-apps" aria-label={t().pleasanceTools} style:left="{rowLeft}px" style:width="{rowWidth}px">
      {#each slots as slot, i (slot.app?.url ?? `free-${slot.stage}`)}
        {@const at = row[i]}
        {#if at}
          <li
            class:free={!slot.app}
            style:left="{at.left - rootLeft - rowLeft}px"
            style:width="{at.size}px"
            style:height="{at.size}px"
            style:--free={bandColor(slot.stage, GLOW)}
            aria-hidden={slot.app ? undefined : 'true'}
            in:pop|global={{ delay: Math.abs(slot.stage - markerStage) * 28 }}
          >
            {#if slot.app}
              {@const app = slot.app}
              <a
                bind:this={links[i]}
                class:launching={launching === i}
                href={app.url}
                aria-current={isCurrent(app) ? 'page' : undefined}
                onfocus={() => focusIcon(i)}
                onkeydown={keyInDock}
                onclick={() => (launching = i)}
              >
                <img src={app.icon} alt="" width="40" height="40" referrerpolicy="no-referrer" />
                <span class="name">{app.name}{app.desktop ? `, ${t().desktopApp}` : ''}</span>
                {#if isCurrent(app)}<span class="running"></span>{/if}
              </a>
            {/if}
          </li>
        {/if}
      {/each}
      {#if label}
        <li class="label" aria-hidden="true" style:left="{label.x - rowLeft}px" style:bottom="{label.y}px">
          {label.name}{#if label.note}<small>{label.note}</small>{/if}
        </li>
      {/if}
    </ul>
  {/if}
</div>

<style>
  .dock {
    position: relative;
    width: 99px;
    height: 2px;
  }
  /* The band shows 2 px, the button around it gives fingers 24 px */
  button {
    position: absolute;
    inset: -11px 0;
    padding: 0;
    border: none;
    background: none;
    cursor: pointer;
    touch-action: none;
  }
  button:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
    border-radius: 4px;
  }
  .band {
    position: absolute;
    inset: 11px 0;
    border-radius: 1px;
    background: linear-gradient(rgb(255 255 255 / 0.6), rgb(255 255 255 / 0.6)), var(--spectrum);
    transition: inset 0.12s ease, background 0.12s;
  }
  .marker {
    position: absolute;
    top: -1px;
    bottom: -1px;
    min-width: 6px;
    border-radius: 2px;
    background: var(--gradient);
    transition: top 0.12s, bottom 0.12s, box-shadow 0.12s;
  }
  .open .band {
    inset: 9.5px 0;
    border-radius: 3px;
    background: linear-gradient(rgb(255 255 255 / 0.25), rgb(255 255 255 / 0.25)), var(--spectrum);
  }
  .open .marker {
    top: -2px;
    bottom: -2px;
    border-radius: 4px;
    box-shadow: 0 0 0 1.5px #fff, 0 0 10px 1px var(--glow);
    animation: flare 0.5s ease-out;
  }
  @keyframes flare {
    40% {
      filter: brightness(1.5);
    }
  }
  /* No background. The list starts above the wordmark (ABOVE) and holds the
     icons; crossing the wordmark between band and icons takes less than the
     300 ms before the dock closes. */
  ul {
    position: absolute;
    bottom: calc(1px + 20px);
    z-index: 20;
    height: 70px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  li {
    position: absolute;
    /* LIFT - ABOVE */
    bottom: 6px;
    transform-origin: 50% 100%;
  }
  li.free {
    border: 1.5px dashed var(--free);
    border-radius: 22.5%;
    background: rgb(255 255 255 / 0.35);
  }
  a {
    display: block;
    width: 100%;
    height: 100%;
    border-radius: 22.5%;
  }
  a:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 3px;
  }
  img {
    display: block;
    width: 100%;
    height: 100%;
    filter: drop-shadow(0 3px 6px rgb(0 0 0 / 0.28)) drop-shadow(0 1px 1px rgb(0 0 0 / 0.2));
    -webkit-user-drag: none;
    user-select: none;
  }
  .name {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
  /* Like a running app in the Dock */
  .running {
    position: absolute;
    left: 50%;
    bottom: -8px;
    width: 4px;
    height: 4px;
    margin-left: -2px;
    border-radius: 50%;
    background: var(--text);
  }
  .launching {
    animation: launch 0.55s cubic-bezier(0.3, 0, 0.4, 1) 3;
  }
  @keyframes launch {
    45% {
      translate: 0 -18px;
    }
  }
  .label {
    transform: translateX(-50%);
    padding: 3px 10px;
    border-radius: 6px;
    background: rgb(36 36 40 / 0.86);
    box-shadow: 0 4px 12px rgb(0 0 0 / 0.2);
    color: #fff;
    font-size: 13px;
    line-height: 1.35;
    white-space: nowrap;
    pointer-events: none;
  }
  .label small {
    margin-left: 6px;
    color: #b9b9c2;
    font-size: 11px;
  }
  .label::after {
    content: '';
    position: absolute;
    left: 50%;
    bottom: -5px;
    margin-left: -5px;
    border: 5px solid transparent;
    border-bottom: 0;
    border-top-color: rgb(36 36 40 / 0.86);
  }
  @media (prefers-reduced-motion: reduce) {
    .launching,
    .open .marker {
      animation: none;
    }
  }
</style>
