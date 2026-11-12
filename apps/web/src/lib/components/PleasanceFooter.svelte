<script lang="ts">
  import { LINKS } from '@app/shared/app';
  import { auth } from '#lib/auth.svelte.ts';
  import AppDock from '#lib/components/AppDock.svelte';
  import { setTestMode, testMode } from '#lib/feedback.svelte.ts';
  import { setLocale, t } from '#lib/i18n.ts';
  import { page } from '$app/state';

  const other = $derived(page.data.locale === 'de' ? 'en' : 'de');
</script>

<footer>
  <!-- Sender and wordmark link to pleasance.org, the band below is the app dock -->
  <div class="sender">
    <a href="https://pleasance.org">
      <span class="by">{t().madeBy}</span>
      <span class="wordmark" role="img" aria-label="Pleasance"></span>
    </a>
    <AppDock />
  </div>
  <div class="settings">
    <a href={LINKS.imprint}>{t().imprint}</a>
    <a href={LINKS.privacy}>{t().privacy}</a>
    <a href={LINKS.repo}>{t().sourceCode}</a>
    {#if auth.user}
      <label title={t().testModeHint}>
        <input type="checkbox" checked={testMode.on} onchange={(e) => setTestMode(e.currentTarget.checked)} />
        {t().testMode}
      </label>
    {/if}
    <button type="button" lang={other} onclick={() => setLocale(other)}>{t().otherLanguage}</button>
  </div>
</footer>

<style>
  footer {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    align-items: center;
    justify-content: space-between;
    padding: 1.125rem 1.5rem;
    border-top: 1px solid var(--border);
    color: var(--muted);
    font-size: 0.8125rem;
  }
  /* Two columns, so the band sits under the wordmark, outside the link */
  .sender {
    display: inline-grid;
    grid-template-columns: auto 99px;
    gap: 5px 0.5rem;
    transform: translateY(4px);
  }
  .sender > a {
    display: grid;
    grid-column: 1 / 3;
    grid-template-columns: subgrid;
    align-items: end;
    text-decoration: none;
  }
  .sender > :global(.dock) {
    grid-column: 2;
  }
  .by {
    font-family: var(--font-display);
    font-size: 0.875rem;
    font-weight: 650;
    font-stretch: 80%;
    line-height: 1;
    transform: translateY(1px);
  }
  .wordmark {
    width: 99px;
    height: 11px;
    background: currentColor;
    mask: url('/pleasance-wordmark.svg') left center / contain no-repeat;
  }
  .settings {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem 1rem;
    align-items: center;
  }
  label {
    display: inline-flex;
    gap: 0.375rem;
    align-items: center;
    cursor: pointer;
  }
  input {
    margin: 0;
    accent-color: var(--accent);
  }
  button {
    padding: 0.25rem 0;
    border: none;
    background: none;
    color: inherit;
    font: inherit;
    text-decoration: underline;
    text-underline-offset: 0.2em;
    cursor: pointer;
  }
</style>
