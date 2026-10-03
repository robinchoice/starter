<script lang="ts">
  import { APP_NAME } from '@app/shared';
  import Toasts from '$lib/components/Toasts.svelte';

  let { children } = $props();
</script>

<svelte:head>
  <title>{APP_NAME}</title>
</svelte:head>

{@render children()}
<Toasts />

<style>
  :global(:root) {
    color-scheme: light;
    --bg: #f7f7f5;
    --surface: #fff;
    --border: #e2e2dd;
    --text: #1a1a1a;
    --muted: #6b6b66;
    --accent: #1a1a1a;
    --accent-text: #fff;
    --error: #b42318;
    --radius: 8px;
  }
  :global(*) {
    box-sizing: border-box;
  }
  :global(body) {
    margin: 0;
    background: var(--bg);
    color: var(--text);
    font-family: system-ui, sans-serif;
    line-height: 1.5;
  }
  :global(a) {
    color: inherit;
  }
</style>
