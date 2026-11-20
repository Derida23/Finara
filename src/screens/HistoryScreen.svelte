<script lang="ts">
  import { onMount, untrack } from "svelte";
  import type { Expense } from "../../shared/expense";
  import ExpenseRow from "../components/ExpenseRow.svelte";
  import MonthPicker from "../components/MonthPicker.svelte";
  import Toast, { type ToastData } from "../components/Toast.svelte";
  import { ApiError, createExpense } from "../lib/api";
  import { dayHeading, formatRupiah, toLocalDate } from "../lib/format";
  import { store } from "../lib/store.svelte";
  import { groupByDay, sumAmounts } from "../lib/summary";
  import EditSheet from "./EditSheet.svelte";

  const today = toLocalDate(new Date());
  const currentMonth = today.slice(0, 7);

  let month = $state(currentMonth);
  let editing = $state<Expense | null>(null);
  let toast = $state<ToastData | null>(null);

  const data = $derived(store.month(month));
  const groups = $derived(groupByDay(data.expenses));
  const total = $derived(sumAmounts(data.expenses));

  onMount(() => {
    void store.refreshCategories();
  });

  // Only `month` drives this; the refresh itself writes to the store this screen reads.
  $effect(() => {
    const selected = month;
    untrack(() => void store.refreshMonth(selected));
  });

  const showToast = (message: string, actionLabel?: string, onAction?: () => void) => {
    toast = { id: Date.now(), message, actionLabel, onAction };
  };

  // Undoing a delete re-sends the same id, which the API treats as a fresh insert.
  const restore = async (expense: Expense) => {
    toast = null;
    try {
      const { id, date, amount, category, method, note, createdAt } = expense;
      store.upsert(await createExpense({ id, date, amount, category, method, note, createdAt }));
      showToast("Pengeluaran dikembalikan");
    } catch (error) {
      if (!(error instanceof ApiError && error.status === 401)) {
        showToast("Gagal mengembalikan.", "Coba lagi", () => void restore(expense));
      }
    }
  };

  const onDeleted = (expense: Expense) => {
    editing = null;
    showToast("Pengeluaran dihapus", "Batalkan", () => void restore(expense));
  };
</script>

<main class="history">
  <MonthPicker bind:month max={currentMonth} />

  <div class="ledger">
    {#if data.status === "loading"}
      <p class="hint">Memuat…</p>
    {:else if data.status === "error"}
      <p class="hint error">
        Gagal memuat data.
        <button type="button" class="text-button" onclick={() => store.refreshMonth(month)}
          >Coba lagi</button
        >
      </p>
    {:else if groups.length === 0}
      <p class="hint">Belum ada pengeluaran di bulan ini.</p>
    {:else}
      <p class="month-total">
        <strong>{formatRupiah(total)}</strong>
        <span>· {data.expenses.length} transaksi</span>
      </p>
      {#each groups as group (group.date)}
        <section class="day">
          <h2>
            <span>{dayHeading(group.date, today)}</span>
            <span class="day-total">{formatRupiah(group.total)}</span>
          </h2>
          <ul>
            {#each group.expenses as expense (expense.id)}
              <li>
                <ExpenseRow
                  {expense}
                  variant="ledger"
                  showMethod
                  onSelect={(selected) => (editing = selected)}
                />
              </li>
            {/each}
          </ul>
        </section>
      {/each}
    {/if}
  </div>
</main>

{#if editing}
  {#key editing.id}
    <EditSheet
      expense={editing}
      {today}
      onClose={() => (editing = null)}
      onSaved={() => {
        editing = null;
        showToast("Perubahan disimpan");
      }}
      {onDeleted}
    />
  {/key}
{/if}

{#if toast}
  {#key toast.id}
    <Toast {toast} onDismiss={() => (toast = null)} />
  {/key}
{/if}

<style>
  .history {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  /* A ledger page: blue rules every 32px and a double red margin line. Every block below is a
     whole number of rules high, so the writing always sits on the lines. */
  .ledger {
    padding: 32px 14px 32px 52px;
    border-radius: 4px;
    background-color: var(--paper);
    background-image:
      linear-gradient(
        90deg,
        transparent 38px,
        #e4a3a3 38px 39px,
        transparent 39px 42px,
        #e4a3a3 42px 43px,
        transparent 43px
      ),
      repeating-linear-gradient(transparent 0 31px, #bccde3 31px 32px), var(--noise);
    box-shadow: var(--paper-stack);
    line-height: 32px;
  }

  .ledger p,
  .ledger h2 {
    margin: 0;
    line-height: 32px;
  }

  /* Flex, not inline text: two fonts on one inline line make the line box 1px taller than a rule. */
  .month-total {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 0.35em;
    font-family: var(--font-mono);
  }

  .month-total span {
    color: var(--color-muted);
    font-family: system-ui, sans-serif;
    font-size: 0.95rem;
  }

  /* One empty rule between days. */
  .day {
    margin-top: 32px;
  }

  .day h2 {
    display: flex;
    justify-content: space-between;
    color: var(--ink);
    font-size: 0.95rem;
  }

  .day-total {
    font-family: var(--font-mono);
  }

  .day ul {
    margin: 0;
    padding: 0;
    list-style: none;
  }
</style>
