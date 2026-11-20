<script lang="ts">
  import { onMount, untrack } from "svelte";
  import type { Expense } from "../../shared/expense";
  import ExpenseForm, { type ExpenseDraft } from "../components/ExpenseForm.svelte";
  import { ApiError, deleteExpense, updateExpense } from "../lib/api";
  import { store } from "../lib/store.svelte";

  interface Props {
    expense: Expense;
    today: string;
    onClose: () => void;
    onSaved: (expense: Expense) => void;
    onDeleted: (expense: Expense) => void;
  }

  // Single source for the slide duration: the CSS reads it through --sheet-duration.
  const SLIDE_MS = 280;

  let { expense, today, onClose, onSaved, onDeleted }: Props = $props();

  let dialog = $state<HTMLDialogElement>();
  // What to tell the parent once the slide-down has finished; plain closing by default.
  let afterClose: () => void = () => onClose();
  let isClosing = false;
  // The parent mounts a fresh sheet per expense, so copying the initial value is intended.
  let draft = $state<ExpenseDraft>(
    untrack(() => {
      const { amount, category, date, method, note } = expense;
      return { amount, category, date, method, note };
    }),
  );
  let status = $state<"idle" | "saving" | "deleting">("idle");
  let errorMessage = $state("");

  onMount(() => {
    dialog?.showModal();
  });

  // The parent unmounts the sheet as soon as it hears back, so it is told only after the
  // slide-down has finished; otherwise the animation would be cut off.
  const handleClose = () => {
    if (isClosing) {
      return;
    }
    isClosing = true;
    const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    setTimeout(afterClose, reduceMotion ? 0 : SLIDE_MS);
  };

  const closeThen = (next: () => void) => {
    afterClose = next;
    dialog?.close();
  };

  const describeError = (error: unknown): string => {
    if (error instanceof ApiError && error.code === "NETWORK") {
      return "Tidak bisa terhubung. Coba lagi.";
    }
    if (error instanceof ApiError && error.code === "NOT_FOUND") {
      return "Pengeluaran ini sudah tidak ada di spreadsheet.";
    }
    return "Gagal menyimpan. Coba lagi.";
  };

  const run = async (next: "saving" | "deleting", action: () => Promise<void>) => {
    status = next;
    errorMessage = "";
    try {
      await action();
    } catch (error) {
      if (!(error instanceof ApiError && error.status === 401)) {
        errorMessage = describeError(error);
      }
    } finally {
      status = "idle";
    }
  };

  const save = () => {
    return run("saving", async () => {
      const { amount, category, date, method, note } = draft;
      if (category === null) {
        return;
      }
      const updated = await updateExpense(expense.id, {
        amount,
        category,
        date,
        method,
        note: note.trim(),
      });
      store.replace(expense, updated);
      closeThen(() => onSaved(updated));
    });
  };

  const remove = () => {
    return run("deleting", async () => {
      await deleteExpense(expense.id);
      store.remove(expense);
      closeThen(() => onDeleted(expense));
    });
  };
</script>

<dialog
  bind:this={dialog}
  class="sheet"
  aria-labelledby="edit-title"
  style:--sheet-duration={`${SLIDE_MS}ms`}
  onclose={handleClose}
>
  <header>
    <h2 id="edit-title">Ubah pengeluaran</h2>
    <button type="button" class="text-button" onclick={() => dialog?.close()}>Tutup</button>
  </header>

  <ExpenseForm
    bind:draft
    categories={store.categories}
    categoriesStatus={store.categoriesStatus}
    onRetryCategories={store.refreshCategories}
    {today}
    submitText="Simpan perubahan"
    isSubmitting={status === "saving"}
    onSubmit={save}
  />

  {#if errorMessage}
    <p class="error-text" role="alert">{errorMessage}</p>
  {/if}

  <button type="button" class="danger-button" disabled={status !== "idle"} onclick={remove}
    >{status === "deleting" ? "Menghapus…" : "Hapus"}</button
  >
</dialog>

<style>
  /* A paper card pulled up over the screen, with the calculator lying on it.
     Closed state = below the screen; `allow-discrete` keeps it visible while it slides away. */
  .sheet {
    width: 100%;
    max-width: 480px;
    max-height: 94dvh;
    margin: auto auto 0;
    padding: 18px 16px max(16px, env(safe-area-inset-bottom));
    border: 0;
    border-radius: 18px 18px 0 0;
    background-color: var(--paper);
    background-image: var(--noise);
    color: var(--color-text);
    box-shadow: 0 -8px 24px rgb(0 0 0 / 0.3);
    transform: translateY(100%);
    transition:
      transform var(--sheet-duration) cubic-bezier(0.2, 0.8, 0.2, 1),
      overlay var(--sheet-duration) allow-discrete,
      display var(--sheet-duration) allow-discrete;
  }

  .sheet[open] {
    display: flex;
    flex-direction: column;
    gap: 14px;
    transform: translateY(0);
  }

  .sheet::backdrop {
    background-color: rgb(0 0 0 / 0);
    transition:
      background-color var(--sheet-duration) ease,
      overlay var(--sheet-duration) allow-discrete,
      display var(--sheet-duration) allow-discrete;
  }

  .sheet[open]::backdrop {
    background-color: rgb(0 0 0 / 0.45);
  }

  /* Where the opening transition starts from. */
  @starting-style {
    .sheet[open] {
      transform: translateY(100%);
    }

    .sheet[open]::backdrop {
      background-color: rgb(0 0 0 / 0);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .sheet,
    .sheet::backdrop {
      transition: none;
    }
  }

  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  h2 {
    margin: 0;
    color: var(--ink);
    font-size: 1.15rem;
  }

  .error-text {
    margin: 0;
  }
</style>
