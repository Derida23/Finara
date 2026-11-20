<script lang="ts" module>
  export interface SheetOption {
    value: string;
    label: string;
  }
</script>

<script lang="ts">
  import { onMount, type Snippet } from "svelte";

  interface Props {
    title: string;
    options: SheetOption[];
    selected: string;
    onSelect: (value: string) => void;
    onClose: () => void;
    // Extra keys after the options, e.g. the calendar picker for "Tanggal lain…".
    children?: Snippet;
  }

  // Single source for the slide duration: the CSS reads it through --sheet-duration.
  const SLIDE_MS = 260;

  let { title, options, selected, onSelect, onClose, children }: Props = $props();

  const titleId = $props.id();
  let dialog = $state<HTMLDialogElement>();
  let isClosing = false;

  onMount(() => {
    dialog?.showModal();
  });

  // Closing the dialog starts the slide-down; the parent unmounts the sheet only once it has
  // finished, otherwise the animation would be cut off.
  const handleClose = () => {
    if (isClosing) {
      return;
    }
    isClosing = true;
    const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    setTimeout(onClose, reduceMotion ? 0 : SLIDE_MS);
  };

  // Lets the parent close the sheet with the same animation, e.g. after a date is picked.
  export const close = (): void => {
    dialog?.close();
  };

  const choose = (value: string) => {
    onSelect(value);
    close();
  };
</script>

<dialog
  bind:this={dialog}
  class="option-sheet"
  aria-labelledby={titleId}
  style:--sheet-duration={`${SLIDE_MS}ms`}
  onclose={handleClose}
>
  <header>
    <h2 id={titleId}>{title}</h2>
    <button type="button" class="text-button" onclick={close}>Tutup</button>
  </header>
  <div class="options">
    {#each options as option (option.value)}
      <button
        type="button"
        class="chip option"
        aria-pressed={option.value === selected}
        onclick={() => choose(option.value)}>{option.label}</button
      >
    {/each}
    {@render children?.()}
  </div>
</dialog>

<style>
  /* A small panel that slides up from the bottom, same material as the calculator body.
     Closed state = below the screen; `allow-discrete` keeps it visible while it slides away. */
  .option-sheet {
    width: 100%;
    max-width: 480px;
    margin: auto auto 0;
    padding: 16px 16px max(20px, env(safe-area-inset-bottom));
    border: 1px solid #c2b9a8;
    border-bottom: 0;
    border-radius: 22px 22px 0 0;
    background-color: #ece6da;
    background-image: var(--noise), linear-gradient(#f3eee5, #ddd5c6);
    color: var(--color-text);
    box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.85);
    transform: translateY(100%);
    transition:
      transform var(--sheet-duration) cubic-bezier(0.2, 0.8, 0.2, 1),
      overlay var(--sheet-duration) allow-discrete,
      display var(--sheet-duration) allow-discrete;
  }

  .option-sheet[open] {
    transform: translateY(0);
  }

  .option-sheet::backdrop {
    background-color: rgb(0 0 0 / 0);
    transition:
      background-color var(--sheet-duration) ease,
      overlay var(--sheet-duration) allow-discrete,
      display var(--sheet-duration) allow-discrete;
  }

  .option-sheet[open]::backdrop {
    background-color: rgb(0 0 0 / 0.4);
  }

  /* Where the opening transition starts from. */
  @starting-style {
    .option-sheet[open] {
      transform: translateY(100%);
    }

    .option-sheet[open]::backdrop {
      background-color: rgb(0 0 0 / 0);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .option-sheet,
    .option-sheet::backdrop {
      transition: none;
    }
  }

  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }

  h2 {
    margin: 0;
    font-size: 1.05rem;
  }

  .options {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px 10px;
    padding-bottom: 4px;
  }

  .option {
    min-height: 52px;
    white-space: normal;
  }
</style>
