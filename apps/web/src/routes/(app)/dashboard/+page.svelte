<script lang="ts">
  import { auth, updateName } from '$lib/auth.svelte';
  import Button from '$lib/components/Button.svelte';
  import Input from '$lib/components/Input.svelte';
  import { t } from '$lib/i18n';
  import { toast } from '$lib/toast.svelte';

  let name = $state(auth.user?.name ?? '');
  let saving = $state(false);

  async function save(e: SubmitEvent) {
    e.preventDefault();
    saving = true;
    try {
      await updateName(name);
      toast(t().saved);
    } catch {
      // The API client already shows the error as a toast
    } finally {
      saving = false;
    }
  }
</script>

<h1>{t().hello(auth.user?.name ?? '')}</h1>
<p>{t().prototypeStarts}</p>

<form onsubmit={save}>
  <Input label={t().displayName} bind:value={name} required />
  <Button type="submit" loading={saving}>{t().save}</Button>
</form>

<style>
  form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    max-width: 360px;
  }
</style>
