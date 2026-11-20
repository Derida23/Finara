<script lang="ts">
  import { onMount, untrack } from "svelte";
  import MonthPicker from "../components/MonthPicker.svelte";
  import { formatRupiah, toLocalDate } from "../lib/format";
  import { store } from "../lib/store.svelte";
  import { summarizeMonth } from "../lib/summary";

  const today = toLocalDate(new Date());
  const currentMonth = today.slice(0, 7);

  let month = $state(currentMonth);

  const data = $derived(store.month(month));
  const summary = $derived(summarizeMonth(data.expenses, store.categories, month, today));
  const remaining = $derived(summary.budget - summary.total);

  onMount(() => {
    void store.refreshCategories();
  });

  // Only `month` drives this; the refresh itself writes to the store this screen reads.
  $effect(() => {
    const selected = month;
    untrack(() => void store.refreshMonth(selected));
  });

  const percent = (part: number, whole: number): number => {
    return whole === 0 ? 0 : Math.min(100, (part / whole) * 100);
  };
</script>

<main class="summary">
  <MonthPicker bind:month max={currentMonth} />

  {#if data.status === "loading"}
    <p class="hint">Memuat…</p>
  {:else if data.status === "error"}
    <p class="hint error">
      Gagal memuat data.
      <button type="button" class="text-button" onclick={() => store.refreshMonth(month)}
        >Coba lagi</button
      >
    </p>
  {:else}
    <section class="overview">
      <p class="label">{month === currentMonth ? "Total bulan ini" : "Total pengeluaran"}</p>
      <p class="big">{formatRupiah(summary.total)}</p>
      <p class="meta">
        {summary.count} transaksi · rata-rata per hari {formatRupiah(summary.dailyAverage)}
      </p>
      {#if summary.budget > 0}
        <div class="tube" aria-hidden="true">
          <span
            class="liquid"
            class:over={remaining < 0}
            style:width={`${percent(summary.total, summary.budget)}%`}
          ></span>
        </div>
        <p class="remaining" class:over={remaining < 0}>
          {remaining >= 0
            ? `Sisa budget ${formatRupiah(remaining)}`
            : `Lewat budget ${formatRupiah(-remaining)}`}
          <span class="meta">dari {formatRupiah(summary.budget)}</span>
        </p>
      {/if}
    </section>

    {#if summary.categories.length === 0}
      <p class="hint">Belum ada pengeluaran di bulan ini.</p>
    {:else}
      <section class="breakdown" aria-labelledby="breakdown-title">
        <h2 id="breakdown-title">Per kategori</h2>
        <ul>
          {#each summary.categories as row (row.name)}
            <li>
              <div class="row-head">
                <span>{row.name}</span>
                <strong>{formatRupiah(row.spent)}</strong>
              </div>
              {#if row.budget > 0}
                <div class="tube" aria-hidden="true">
                  <span
                    class="liquid"
                    class:over={row.spent > row.budget}
                    style:width={`${percent(row.spent, row.budget)}%`}
                  ></span>
                </div>
                <small class:error-text={row.spent > row.budget}>
                  {formatRupiah(row.spent)} dari {formatRupiah(row.budget)}
                </small>
              {:else}
                <div class="tube" aria-hidden="true">
                  <span class="liquid share" style:width={`${row.share * 100}%`}></span>
                </div>
                <small>{Math.round(row.share * 100)}% dari total</small>
              {/if}
            </li>
          {/each}
        </ul>
      </section>
    {/if}
  {/if}
</main>

<style>
  .summary {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  /* Passbook cover: dark green leather, stitched edge, gold-stamped lettering. */
  .overview {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 24px 22px;
    border-radius: 16px;
    background-color: #2c4a3b;
    background-image:
      radial-gradient(120% 90% at 25% 15%, rgb(255 255 255 / 0.1), transparent 60%),
      radial-gradient(circle at 80% 90%, rgb(0 0 0 / 0.3), transparent 55%), var(--noise), var(--noise);
    color: #f1e7cf;
    outline: 2px dashed rgb(241 231 207 / 0.45);
    outline-offset: -10px;
    box-shadow:
      0 10px 22px rgb(0 0 0 / 0.3),
      inset 0 1px 0 rgb(255 255 255 / 0.12),
      inset 0 -2px 0 rgb(0 0 0 / 0.25);
  }

  .overview p {
    margin: 0;
  }

  /* Gold foil pressed into leather: dark edge above, faint highlight below. */
  .label {
    color: #d9bf78;
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-shadow:
      0 -1px 0 rgb(0 0 0 / 0.5),
      0 1px 0 rgb(255 255 255 / 0.12);
    text-transform: uppercase;
  }

  .big {
    color: #f3dd9b;
    font-family: var(--font-mono);
    font-size: 2.2rem;
    font-weight: 700;
    text-shadow:
      0 -1px 0 rgb(0 0 0 / 0.55),
      0 1px 0 rgb(255 255 255 / 0.15);
  }

  .meta {
    color: rgb(241 231 207 / 0.8);
  }

  .remaining {
    font-weight: 600;
  }

  .remaining.over {
    color: #ffb4a8;
  }

  /* Glass tube filled with liquid: green within budget, red past it, grey for a share of the total. */
  .tube {
    height: 14px;
    overflow: hidden;
    border: 1px solid #aab3ad;
    border-radius: var(--radius-pill);
    background: linear-gradient(#dfe5e1, #ffffff 45%, #d3d9d5);
    box-shadow:
      inset 0 1px 3px rgb(0 0 0 / 0.25),
      0 1px 0 rgb(255 255 255 / 0.4);
  }

  .liquid {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(#7ad4a6, #2e9a68 55%, #23744f);
    box-shadow: inset 0 2px 0 rgb(255 255 255 / 0.45);
  }

  .liquid.over {
    background: linear-gradient(#f39a8d, #c9392b 55%, #9c271c);
  }

  .liquid.share {
    background: linear-gradient(#c3cad2, #7b848e 55%, #5f6770);
  }

  /* An inside page of the passbook. */
  .breakdown {
    padding: 18px 16px 20px;
    border-radius: 4px 4px 12px 12px;
    background-color: var(--paper);
    background-image: var(--noise);
    box-shadow: var(--paper-stack);
  }

  .breakdown h2 {
    margin: 0 0 14px;
    padding-bottom: 8px;
    border-bottom: 1px solid #d6cdb9;
    color: var(--ink);
    font-size: 0.8rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .breakdown ul {
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .breakdown li {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .row-head {
    display: flex;
    justify-content: space-between;
  }

  .row-head strong {
    font-family: var(--font-mono);
  }

  small {
    color: var(--color-muted);
  }

  small.error-text {
    color: var(--color-danger);
  }
</style>
