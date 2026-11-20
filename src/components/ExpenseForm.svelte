<script lang="ts" module>
  export interface ExpenseDraft {
    amount: number;
    category: string | null;
    date: string;
    method: string;
    note: string;
  }
</script>

<script lang="ts">
  import { type Category, MAX_NOTE_LENGTH, PaymentMethod } from "../../shared/expense";
  import { appendAmountKey, dateLabel, formatRupiah, removeAmountDigit, shiftDays } from "../lib/format";
  import type { LoadStatus } from "../lib/store.svelte";
  import Numpad from "./Numpad.svelte";
  import OptionSheet from "./OptionSheet.svelte";

  interface Props {
    draft: ExpenseDraft;
    categories: Category[];
    categoriesStatus: LoadStatus;
    onRetryCategories: () => void;
    today: string;
    submitText: string;
    isSubmitting: boolean;
    onSubmit: () => void;
    onMethodChange?: (method: string) => void;
  }

  const METHODS: string[] = Object.values(PaymentMethod);
  const METHOD_OPTIONS = METHODS.map((method) => ({ value: method, label: method }));
  const DIGIT_KEY = /^\d$/;

  let {
    draft = $bindable(),
    categories,
    categoriesStatus,
    onRetryCategories,
    today,
    submitText,
    isSubmitting,
    onSubmit,
    onMethodChange,
  }: Props = $props();

  const uid = $props.id();

  let isNoteRequested = $state(false);
  let openSheet = $state<"date" | "method" | null>(null);
  let dateSheet = $state<ReturnType<typeof OptionSheet>>();

  const yesterday = $derived(shiftDays(today, -1));
  const isOtherDate = $derived(draft.date !== today && draft.date !== yesterday);
  const showNote = $derived(isNoteRequested || draft.note !== "");
  const amountText = $derived(formatRupiah(draft.amount));
  const dateText = $derived(dateLabel(draft.date, today));
  const dateOptions = $derived([
    { value: today, label: "Hari ini" },
    { value: yesterday, label: "Kemarin" },
  ]);
  // What will be saved, printed on the LCD so the whole entry can be checked in one place.
  const summaryLine = $derived(
    [draft.category ?? "", dateText, draft.method].filter((part) => part !== "").join(" · "),
  );

  // An edited expense may carry a category that was renamed or switched off since; keep it visible.
  const categoryKeys = $derived.by(() => {
    const names = categories.map((category) => category.name);
    const current = draft.category;
    return current !== null && !names.includes(current) ? [current, ...names] : names;
  });

  // The button names what is still missing instead of just being greyed out.
  const missing = $derived.by(() => {
    if (draft.amount === 0) {
      return "Masukkan nominal";
    }
    if (draft.category === null) {
      return "Pilih kategori";
    }
    return METHODS.includes(draft.method) ? null : "Pilih metode bayar";
  });
  const canSubmit = $derived(missing === null && !isSubmitting);
  const buttonLabel = $derived(isSubmitting ? "Menyimpan…" : (missing ?? submitText));

  const pressKey = (key: string) => {
    draft.amount = appendAmountKey(draft.amount, key);
  };

  const backspace = () => {
    draft.amount = removeAmountDigit(draft.amount);
  };

  const selectMethod = (method: string) => {
    draft.method = method;
    onMethodChange?.(method);
  };

  const submit = () => {
    if (canSubmit) {
      onSubmit();
    }
  };

  // Typing on a hardware keyboard drives the numpad, unless an input, a focused button
  // (Enter would also press it) or an option sheet has the keyboard.
  const onKeydown = (event: KeyboardEvent) => {
    const target = event.target;
    const isFieldFocused = target instanceof HTMLInputElement || target instanceof HTMLButtonElement;
    if (isSubmitting || openSheet !== null) {
      return;
    }
    if (DIGIT_KEY.test(event.key) && !(target instanceof HTMLInputElement)) {
      pressKey(event.key);
    } else if (event.key === "Backspace" && !(target instanceof HTMLInputElement)) {
      backspace();
    } else if (event.key === "Enter" && !isFieldFocused) {
      submit();
    }
  };
</script>

<svelte:window onkeydown={onKeydown} />

<div class="calculator">
  <div class="lcd">
    <span class="lcd-summary">{summaryLine}</span>
    <!-- Past 13 characters (Rp10.000.000.000) the digits shrink to stay on one line. -->
    <output class="amount" class:empty={draft.amount === 0} class:long={amountText.length > 13}
      >{amountText}</output
    >
  </div>

  <section aria-labelledby={`${uid}-category`}>
    <p id={`${uid}-category`} class="panel-label">Kategori</p>
    {#if categoriesStatus === "loading" && categoryKeys.length === 0}
      <p class="hint">Memuat kategori…</p>
    {:else if categoriesStatus === "error"}
      <p class="hint error">
        Gagal memuat kategori.
        <button type="button" class="text-button" onclick={onRetryCategories}>Coba lagi</button>
      </p>
    {:else if categoryKeys.length === 0}
      <p class="hint">Belum ada kategori aktif. Tambahkan di tab Kategori di spreadsheet.</p>
    {:else}
      <div class="category-grid">
        {#each categoryKeys as name (name)}
          <button
            type="button"
            class="chip category-key"
            aria-pressed={draft.category === name}
            onclick={() => (draft.category = name)}
          >
            <span class="led" aria-hidden="true"></span>
            {name}
          </button>
        {/each}
      </div>
    {/if}
  </section>

  <div class="selectors">
    <button
      type="button"
      class="chip selector"
      aria-haspopup="dialog"
      onclick={() => (openSheet = "date")}
    >
      <span class="panel-label">Tanggal</span>
      <span class="selector-value">
        {dateText}
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
      </span>
    </button>
    <button
      type="button"
      class="chip selector"
      aria-haspopup="dialog"
      onclick={() => (openSheet = "method")}
    >
      <span class="panel-label">Bayar</span>
      <span class="selector-value">
        {draft.method}
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
      </span>
    </button>
  </div>

  {#if showNote}
    <input
      class="note"
      type="text"
      bind:value={draft.note}
      maxlength={MAX_NOTE_LENGTH}
      placeholder="Catatan (opsional)"
      aria-label="Catatan"
      {@attach (element) => {
        if (isNoteRequested) {
          element.focus();
        }
      }}
    />
  {:else}
    <button type="button" class="text-button note-toggle" onclick={() => (isNoteRequested = true)}
      >+ Catatan</button
    >
  {/if}

  <Numpad onKey={pressKey} onBackspace={backspace} showTripleZero disabled={isSubmitting} />

  <button type="button" class="primary-button" disabled={!canSubmit} onclick={submit}
    >{buttonLabel}</button
  >
</div>

{#if openSheet === "date"}
  <OptionSheet
    bind:this={dateSheet}
    title="Pilih tanggal"
    options={dateOptions}
    selected={draft.date}
    onSelect={(value) => (draft.date = value)}
    onClose={() => (openSheet = null)}
  >
    <label class="chip date-key" class:selected={isOtherDate}>
      {isOtherDate ? dateText : "Tanggal lain…"}
      <input
        type="date"
        max={today}
        value={draft.date}
        onclick={(event) => event.currentTarget.showPicker?.()}
        onchange={(event) => {
          if (event.currentTarget.value) {
            draft.date = event.currentTarget.value;
            dateSheet?.close();
          }
        }}
      />
    </label>
  </OptionSheet>
{:else if openSheet === "method"}
  <OptionSheet
    title="Bayar pakai"
    options={METHOD_OPTIONS}
    selected={draft.method}
    onSelect={selectMethod}
    onClose={() => (openSheet = null)}
  />
{/if}

<style>
  /* Molded cream plastic body of a desk calculator. */
  .calculator {
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: var(--space);
    border: 1px solid #c2b9a8;
    border-radius: 24px;
    background-color: #ece6da;
    background-image: var(--noise), linear-gradient(#f3eee5, #ddd5c6);
    box-shadow:
      0 12px 26px rgb(0 0 0 / 0.22),
      inset 0 1px 0 rgb(255 255 255 / 0.85),
      inset 0 -3px 0 rgb(0 0 0 / 0.07);
  }

  /* Green-grey LCD sunk behind a dark bezel: a small status line above the amount. */
  .lcd {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 10px 16px 12px;
    border: 3px solid #57534b;
    border-radius: 10px;
    background: linear-gradient(175deg, #c7d2b1, #aebb95 70%, #a4b18b);
    box-shadow:
      inset 0 3px 8px rgb(0 0 0 / 0.35),
      0 1px 0 rgb(255 255 255 / 0.8);
    color: #1d2717;
    font-family: var(--font-mono);
  }

  .lcd-summary {
    min-height: 1.2em;
    overflow: hidden;
    font-size: 0.72rem;
    letter-spacing: 0.06em;
    text-overflow: ellipsis;
    text-transform: uppercase;
    white-space: nowrap;
    opacity: 0.8;
  }

  .amount {
    display: block;
    font-size: 2.3rem;
    font-weight: 600;
    letter-spacing: 0.02em;
    line-height: 1.1;
    text-align: right;
    text-shadow: 1px 2px 0 rgb(0 0 0 / 0.12);
  }

  .amount.long {
    font-size: 1.6rem;
  }

  .amount.empty {
    color: rgb(29 39 23 / 0.45);
  }

  /* Small caps lettering pressed into the plastic, like the labels on a real calculator. */
  .panel-label {
    display: block;
    margin: 0 0 8px;
    color: var(--color-muted);
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-shadow: 0 1px 0 rgb(255 255 255 / 0.7);
    text-transform: uppercase;
  }

  .category-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px 8px;
  }

  .category-key {
    position: relative;
    min-height: 50px;
    padding: 8px 6px;
    font-size: 0.9rem;
    line-height: 1.15;
    white-space: normal;
  }

  /* Indicator light in the corner of each key: dark when off, glowing when chosen. */
  .led {
    position: absolute;
    top: 6px;
    right: 6px;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #c7bfb1;
    box-shadow: inset 0 1px 1px rgb(0 0 0 / 0.3);
  }

  .category-key[aria-pressed="true"] .led {
    background: #b6ffc9;
    box-shadow: 0 0 6px #7dff9c;
  }

  .selectors {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  .selector {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    padding: 6px 12px 8px;
    text-align: left;
  }

  .selector .panel-label {
    margin: 0;
  }

  .selector-value {
    display: flex;
    width: 100%;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
    font-weight: 600;
  }

  .selector svg {
    flex-shrink: 0;
    width: 18px;
    height: 18px;
    fill: none;
    stroke: currentColor;
    stroke-width: 2.5;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  /* "Tanggal lain…" key inside the date sheet; the transparent input opens the phone's calendar. */
  .date-key {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 52px;
  }

  .date-key.selected {
    transform: translateY(2px);
    border-color: #1d5c43;
    background: linear-gradient(#2a7a5a, #226a4d);
    color: var(--color-on-primary);
    box-shadow:
      0 1px 0 #164532,
      inset 0 2px 5px rgb(0 0 0 / 0.35);
  }

  .date-key input {
    position: absolute;
    inset: 0;
    width: 100%;
    opacity: 0;
    cursor: pointer;
  }

  /* A paper label strip set into the body. */
  .note {
    min-height: 44px;
    padding: 10px 12px;
    border: 1px solid #c9c0b0;
    border-radius: 8px;
    background: #fffdf6;
    box-shadow: inset 0 2px 3px rgb(0 0 0 / 0.1);
  }

  .note-toggle {
    align-self: flex-start;
  }
</style>
