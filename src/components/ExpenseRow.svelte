<script lang="ts">
  import type { Expense } from "../../shared/expense";
  import { formatRupiah, formatTime } from "../lib/format";

  interface Props {
    expense: Expense;
    showMethod?: boolean;
    onSelect?: (expense: Expense) => void;
    // "receipt" prints a line on the till receipt; "ledger" writes it on the ruled ledger page.
    variant?: "receipt" | "ledger";
  }

  let { expense, showMethod = false, onSelect, variant = "receipt" }: Props = $props();

  const detail = $derived(
    [showMethod ? expense.method : "", expense.note].filter((part) => part !== "").join(" · "),
  );
</script>

{#snippet content()}
  <span class="time">{formatTime(expense.createdAt)}</span>
  <span class="what">
    <strong>{expense.category}</strong>
    {#if detail}<small>{detail}</small>{/if}
  </span>
  <span class="money">{formatRupiah(expense.amount)}</span>
{/snippet}

{#if onSelect}
  <button
    type="button"
    class="row selectable"
    class:ledger={variant === "ledger"}
    onclick={() => onSelect?.(expense)}
  >
    {@render content()}
  </button>
{:else}
  <div class="row" class:ledger={variant === "ledger"}>{@render content()}</div>
{/if}

<style>
  /* One printed line of a receipt: dashed rule, monospace time and amount. */
  .row {
    width: 100%;
    display: grid;
    grid-template-columns: 3.5rem 1fr auto;
    gap: 8px;
    align-items: baseline;
    padding: 10px 0;
    border: 0;
    border-bottom: 1px dashed #c4bbac;
    background: none;
    text-align: left;
  }

  .selectable:active {
    background: rgb(0 0 0 / 0.05);
  }

  .time {
    color: var(--color-muted);
    font-family: var(--font-mono);
    font-size: 0.85rem;
  }

  .what {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .what small {
    color: var(--color-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .money {
    font-family: var(--font-mono);
    font-weight: 700;
  }

  /* Written on the ledger: every text line is exactly one 32px rule high, so rows stay on the lines. */
  .row.ledger {
    align-items: start;
    padding: 0;
    border-bottom: 0;
    line-height: 32px;
  }

  .ledger .what strong {
    color: var(--ink);
    font-weight: 600;
  }

  .ledger .what small {
    line-height: 32px;
  }
</style>
