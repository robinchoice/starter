<script lang="ts">
  import { onMount } from 'svelte';
  import { APP_NAME } from '@app/shared';
  import { auth, checkAuth } from '$lib/auth.svelte';
  import Button from '$lib/components/Button.svelte';

  onMount(checkAuth);
</script>

<main>
  <h1>{APP_NAME}</h1>
  <p>Ein Satz dazu, was dieser Prototyp kann.</p>
  {#if auth.user}
    <Button href="/dashboard">Zur App</Button>
  {:else}
    <Button href="/login">Einloggen</Button>
  {/if}
</main>

<style>
  main {
    max-width: 640px;
    margin: 0 auto;
    padding: 6rem 1.5rem;
  }
  h1 {
    margin: 0 0 0.5rem;
    font-size: 2.5rem;
  }
  p {
    margin: 0 0 2rem;
    color: var(--muted);
  }
</style>
