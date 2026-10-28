<script lang="ts">
  import type { Product } from '@app/shared/payments';
  import type { Payment, Payments } from '@app/shared/schemas';
  import { onDestroy, onMount } from 'svelte';
  import { api } from '#lib/api.ts';
  import Button from '#lib/components/Button.svelte';
  import Qr from '#lib/components/Qr.svelte';
  import { t } from '#lib/i18n.ts';
  import { toast } from '#lib/toast.svelte.ts';

  // Checkout with Lightning (README, „Zahlungen“). The API sets the price and
  // tells when the invoice is paid; the worker unlocks it if the page is closed.
  let overview = $state<Payments | null>(null);
  let payment = $state<Payment | null>(null);
  let buying = $state<Product | null>(null);
  let timer: ReturnType<typeof setTimeout> | undefined;

  const load = async () => {
    overview = await api.get<Payments>('/payments').catch(() => overview);
  };
  onMount(load);
  onDestroy(() => clearTimeout(timer));

  async function buy(product: Product) {
    buying = product;
    try {
      payment = (await api.post<{ payment: Payment }>('/payments', { product })).payment;
      poll(payment.id);
    } catch {
      // The API client already shows the error as a toast
    } finally {
      buying = null;
    }
  }

  // Asks every two seconds until the invoice is paid or expired
  function poll(id: string) {
    timer = setTimeout(async () => {
      const answer = await api.get<{ payment: Payment }>(`/payments/${id}`, true).catch(() => null);
      if (payment?.id !== id) return;
      if (answer) payment = answer.payment;
      if (payment.status === 'pending') poll(id);
      else if (payment.status === 'paid') await load();
    }, 2000);
  }

  async function copy(invoice: string) {
    await navigator.clipboard.writeText(invoice);
    toast(t().copied);
  }
</script>

<h1>{t().checkout}</h1>
<p class="intro">{t().checkoutIntro}</p>

{#if overview}
  {#each overview.products as product (product.id)}
    <section>
      <div class="row">
        <div>
          <h2>{t().productNames[product.id]}</h2>
          <p>{t().sats(product.sats)}</p>
        </div>
        {#if overview.unlocked.includes(product.id)}
          <strong class="unlocked">{t().unlocked}</strong>
        {:else if payment?.product !== product.id || payment.status === 'expired'}
          <Button loading={buying === product.id} disabled={!!buying} onclick={() => buy(product.id)}>
            {payment?.product === product.id ? t().newInvoice : t().payWithLightning}
          </Button>
        {/if}
      </div>

      {#if payment?.product === product.id}
        <div class="invoice" aria-live="polite">
          {#if payment.status === 'pending'}
            <Qr text={`lightning:${payment.invoice}`} label={t().scanToPay} />
            <div class="pay">
              <p>{t().scanToPay}</p>
              <code>{payment.invoice}</code>
              <div class="actions">
                <Button href={`lightning:${payment.invoice}`}>{t().openWallet}</Button>
                <Button variant="secondary" onclick={() => copy(payment!.invoice)}>{t().copyInvoice}</Button>
              </div>
              <p class="status">{t().paymentPending}</p>
            </div>
          {:else}
            <p class="status">{payment.status === 'paid' ? t().paymentPaid : t().paymentExpired}</p>
          {/if}
        </div>
      {/if}
    </section>
  {/each}
{/if}

<style>
  .intro {
    max-width: 560px;
    color: var(--muted);
  }
  section {
    max-width: 560px;
    margin-top: 1rem;
    padding: 1.1rem 1.2rem;
    border: 1px solid var(--border);
    border-radius: 12px;
    background: var(--surface);
  }
  h2 {
    margin: 0;
    font-size: 1.2rem;
  }
  .row {
    display: flex;
    gap: 1rem;
    align-items: center;
    justify-content: space-between;
  }
  p {
    margin: 0.2rem 0 0;
    color: var(--muted);
    font-size: 0.9rem;
  }
  .unlocked {
    color: var(--new);
  }
  .invoice {
    display: flex;
    flex-wrap: wrap;
    gap: 1.2rem;
    align-items: flex-start;
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid var(--border);
  }
  .pay {
    flex: 1 1 200px;
    min-width: 0;
  }
  code {
    display: block;
    margin-top: 0.6rem;
    overflow: hidden;
    font-size: 0.8rem;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: 0.8rem;
  }
  .status {
    margin-top: 0.8rem;
    color: var(--text);
    font-weight: 600;
  }
</style>
