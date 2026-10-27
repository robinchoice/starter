<script lang="ts">
  import { APP_NAME, LINKS } from '@app/shared';
  import { onMount } from 'svelte';
  import { auth, checkAuth } from '#lib/auth.svelte.ts';
  import Button from '#lib/components/Button.svelte';
  import { t } from '#lib/i18n.ts';

  // The landing page: texts in messages.ts, links in LINKS (README, "Landingpage").
  // Every <h2> is also a heading in public-pages.ts, the browser test checks it.
  onMount(checkAuth);

  const stores = Boolean(LINKS.appStore || LINKS.googlePlay);
</script>

{#snippet actions()}
  <div class="actions">
    {#if auth.user}
      <Button href="/dashboard">{t().openApp}</Button>
    {:else}
      {#if LINKS.appStore}<Button href={LINKS.appStore}>{t().appStore}</Button>{/if}
      {#if LINKS.googlePlay}<Button href={LINKS.googlePlay}>{t().googlePlay}</Button>{/if}
      <Button href="/login" variant={stores ? 'secondary' : 'primary'}>{t().logIn}</Button>
    {/if}
    <a class="source" href={LINKS.repo}>{t().sourceCode} →</a>
  </div>
{/snippet}

{#snippet cards(items: { title: string; text: string }[])}
  <div class="cards">
    {#each items as item (item.title)}
      <article>
        <h3>{item.title}</h3>
        <p>{item.text}</p>
      </article>
    {/each}
  </div>
{/snippet}

<header>
  <a class="brand" href="/"><img src="/favicon.svg" alt="" width="32" height="32" />{APP_NAME}</a>
</header>

<main>
  <section class="hero">
    <h1>{t().tagline}</h1>
    <p class="pitch">{t().pitch}</p>
    {@render actions()}
    <p class="note">{t().heroNote}</p>
  </section>

  {#if t().shots.length}
    <section class="shots" aria-label={t().shotsLabel}>
      {#each t().shots as shot (shot.src)}
        <img src={shot.src} alt={shot.alt} width={shot.width} height={shot.height} />
      {/each}
    </section>
  {/if}

  <section>
    <h2>{t().highlightsTitle}</h2>
    {@render cards(t().highlights)}
  </section>

  <section>
    <h2>{t().valuesTitle}</h2>
    {@render cards(t().values)}
  </section>

  <section class="closing">
    <h2>{t().closingTitle}</h2>
    {@render actions()}
  </section>
</main>

<style>
  header,
  main {
    max-width: 1040px;
    margin: 0 auto;
    padding: 0 1.5rem;
  }
  header {
    padding-top: 1.25rem;
  }
  .brand {
    display: inline-flex;
    gap: 0.625rem;
    align-items: center;
    font-family: var(--font-display);
    font-size: 1.375rem;
    font-weight: 750;
    font-stretch: 80%;
    text-decoration: none;
  }
  section {
    padding: 3rem 0;
  }
  .hero {
    max-width: 680px;
    padding: 4.5rem 0 3rem;
  }
  h1 {
    margin: 0 0 1rem;
    font-size: clamp(2.5rem, 7vw, 4.25rem);
    line-height: 0.98;
  }
  .pitch {
    margin: 0 0 2rem;
    color: var(--muted);
    font-size: 1.125rem;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem 1rem;
    align-items: center;
  }
  .source {
    color: var(--muted);
    font-size: 0.9375rem;
  }
  .note {
    margin: 1rem 0 0;
    color: var(--muted);
    font-size: 0.875rem;
  }
  /* Desktop and phone screenshots side by side, scrolling sideways when they overflow */
  .shots {
    display: flex;
    gap: 1rem;
    align-items: flex-start;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    padding: 0 0 0.5rem;
  }
  .shots img {
    flex: none;
    width: auto;
    max-width: calc(100vw - 3rem);
    height: auto;
    max-height: min(560px, 70dvh);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    scroll-snap-align: start;
  }
  h2 {
    margin: 0 0 1.5rem;
    font-size: clamp(1.75rem, 4vw, 2.5rem);
  }
  .cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 1rem;
  }
  article {
    padding: 1.25rem 1.375rem;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--surface);
  }
  h3 {
    margin: 0 0 0.375rem;
    font-size: 1.0625rem;
  }
  article p {
    margin: 0;
    color: var(--muted);
  }
  .closing {
    padding-bottom: 5rem;
  }
</style>
