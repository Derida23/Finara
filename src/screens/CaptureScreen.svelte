<script lang="ts">
  import { onMount } from "svelte";
  import { type Expense, PaymentMethod } from "../../shared/expense";
  import ExpenseForm, { type ExpenseDraft } from "../components/ExpenseForm.svelte";
  import ExpenseRow from "../components/ExpenseRow.svelte";
  import Toast, { type ToastData } from "../components/Toast.svelte";
  import { ApiError, createExpense, createExpenseId, deleteExpense } from "../lib/api";
  import { dateLabel, formatRupiah, toLocalDate } from "../lib/format";
  import { session } from "../lib/session.svelte";
  import { store } from "../lib/store.svelte";
  import { rankCategories, sumAmounts } from "../lib/summary";

  const LAST_METHOD_KEY = "saving:last-method";

  // The screen remounts after every unlock, so "today" is fresh each time the app is opened.
  const today = toLocalDate(new Date());
  const currentMonth = today.slice(0, 7);

  const emptyDraft = (): ExpenseDraft => {
    const method = localStorage.getItem(LAST_METHOD_KEY) ?? PaymentMethod.CASH;
    return { amount: 0, category: null, date: today, method, note: "" };
  };

  let draft = $state(emptyDraft());
  // Bumped to remount the form, which also closes the note field.
  let formKey = $state(0);
  let isSaving = $state(false);
  let toast = $state<ToastData | null>(null);

  const month = $derived(store.month(currentMonth));
  const todayExpenses = $derived(month.expenses.filter((expense) => expense.date === today));
  const todayTotal = $derived(sumAmounts(todayExpenses));
  const categories = $derived(rankCategories(store.categories, month.expenses));

  onMount(() => {
    void store.refreshCategories();
    void store.refreshMonth(currentMonth);
  });

  const isUnauthorized = (error: unknown): boolean => {
    return error instanceof ApiError && error.status === 401;
  };

  const showToast = (message: string, actionLabel?: string, onAction?: () => void) => {
    toast = { id: Date.now(), message, actionLabel, onAction };
  };

  const setDraft = (next: ExpenseDraft) => {
    draft = next;
    formKey += 1;
  };

  const rememberMethod = (method: string) => {
    localStorage.setItem(LAST_METHOD_KEY, method);
  };

  const undo = async (expense: Expense) => {
    toast = null;
    try {
      await deleteExpense(expense.id);
      store.remove(expense);
      const { amount, category, date, method, note } = expense;
      setDraft({ amount, category, date, method, note });
      showToast("Dibatalkan. Isian dikembalikan supaya bisa diperbaiki.");
    } catch (error) {
      if (!isUnauthorized(error)) {
        showToast("Gagal membatalkan.", "Coba lagi", () => void undo(expense));
      }
    }
  };

  const save = async () => {
    const { amount, category, date, method, note } = draft;
    if (category === null) {
      return;
    }
    isSaving = true;
    try {
      const saved = await createExpense({
        id: createExpenseId(),
        date,
        amount,
        category,
        method,
        note: note.trim(),
        createdAt: new Date().toISOString(),
      });
      store.upsert(saved);
      setDraft(emptyDraft());
      const when = saved.date === today ? "" : ` · ${dateLabel(saved.date, today)}`;
      const message = `Tersimpan · ${formatRupiah(saved.amount)} ${saved.category}${when}`;
      showToast(message, "Batalkan", () => void undo(saved));
    } catch (error) {
      if (!isUnauthorized(error)) {
        const isOffline = error instanceof ApiError && error.code === "NETWORK";
        const reason = isOffline ? "Tidak bisa terhubung." : "Gagal menyimpan.";
        showToast(`${reason} Isian tidak hilang, coba simpan lagi.`);
      }
    } finally {
      isSaving = false;
    }
  };
</script>

<main class="capture">
  <header class="topbar">
    <div>
      <p class="label">Hari ini</p>
      <p class="total">
        {formatRupiah(todayTotal)}
        <span class="count">· {todayExpenses.length} transaksi</span>
      </p>
    </div>
    <button type="button" class="chip" onclick={session.lock}>Kunci</button>
  </header>

  {#key formKey}
    <ExpenseForm
      bind:draft
      {categories}
      categoriesStatus={store.categoriesStatus}
      onRetryCategories={store.refreshCategories}
      {today}
      submitText={`Simpan ${formatRupiah(draft.amount)}`}
      isSubmitting={isSaving}
      onSubmit={save}
      onMethodChange={rememberMethod}
    />
  {/key}

  <!-- The drop shadow sits on the wrapper because the receipt's torn-edge mask would clip it. -->
  <section class="receipt-shadow" aria-labelledby="today-title">
    <div class="receipt">
      <h2 id="today-title">Transaksi hari ini</h2>
      {#if month.status === "error"}
        <p class="hint error">
          Gagal memuat transaksi.
          <button type="button" class="text-button" onclick={() => store.refreshMonth(currentMonth)}
            >Coba lagi</button
          >
        </p>
      {:else if month.status === "ready" && todayExpenses.length === 0}
        <p class="hint">Belum ada pengeluaran hari ini.</p>
      {:else}
        <ul>
          {#each todayExpenses as expense (expense.id)}
            <li><ExpenseRow {expense} /></li>
          {/each}
        </ul>
      {/if}
    </div>
  </section>
</main>

{#if toast}
  {#key toast.id}
    <Toast {toast} onDismiss={() => (toast = null)} />
  {/key}
{/if}

<style>
  .capture {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .topbar p {
    margin: 0;
  }

  .label {
    color: var(--color-muted);
    font-size: 0.85rem;
  }

  /* Lettering pressed into the linen. */
  .total {
    font-family: var(--font-mono);
    font-weight: 700;
    font-size: 1.1rem;
    text-shadow: 0 1px 0 rgb(255 255 255 / 0.6);
  }

  .count {
    color: var(--color-muted);
    font-family: system-ui, sans-serif;
    font-weight: 400;
    font-size: 0.9rem;
  }

  .receipt-shadow {
    margin: 6px 8px 0;
    filter: drop-shadow(0 3px 4px rgb(0 0 0 / 0.18));
  }

  /* Till receipt: off-white paper, monospace print, torn zigzag bottom edge. */
  .receipt {
    --tooth: 8px;

    padding: 16px 16px calc(16px + var(--tooth));
    background-color: #fffdf8;
    background-image: var(--noise);
    font-family: var(--font-mono);
    mask: conic-gradient(from -45deg at bottom, #0000, #000 1deg 89deg, #0000 90deg) 50% /
      calc(2 * var(--tooth)) 100%;
  }

  .receipt h2 {
    margin: 0 0 4px;
    padding-bottom: 10px;
    border-bottom: 1px dashed #b9b0a1;
    font-size: 0.85rem;
    letter-spacing: 0.12em;
    text-align: center;
    text-transform: uppercase;
  }

  .receipt .hint {
    padding: 12px 0 4px;
    text-align: center;
  }

  .receipt ul {
    margin: 0;
    padding: 0;
    list-style: none;
  }
</style>
