<script lang="ts">
  interface Props {
    onKey: (key: string) => void;
    onBackspace: () => void;
    showTripleZero?: boolean;
    disabled?: boolean;
    variant?: "calculator" | "safe";
  }

  const DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

  let {
    onKey,
    onBackspace,
    showTripleZero = false,
    disabled = false,
    variant = "calculator",
  }: Props = $props();
</script>

<div class="numpad" class:safe={variant === "safe"}>
  {#each DIGITS as digit (digit)}
    <button type="button" class="key" {disabled} onclick={() => onKey(digit)}>{digit}</button>
  {/each}
  {#if showTripleZero}
    <button type="button" class="key function" {disabled} onclick={() => onKey("000")}>000</button>
  {:else}
    <span></span>
  {/if}
  <button type="button" class="key" {disabled} onclick={() => onKey("0")}>0</button>
  <button
    type="button"
    class="key function"
    {disabled}
    aria-label="Hapus satu digit"
    onclick={onBackspace}
  >
    ⌫
  </button>
</div>

<style>
  .numpad {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
  }

  /* Cream calculator key with a thick lower edge that disappears when pressed. */
  .key {
    min-height: 56px;
    border: 1px solid #c9c0b0;
    border-radius: 12px;
    background: linear-gradient(#fefcf8, #e7e1d6);
    color: var(--color-text);
    font-size: 1.5rem;
    font-weight: 600;
    box-shadow:
      0 4px 0 #b3aa99,
      0 6px 10px rgb(0 0 0 / 0.18),
      inset 0 1px 0 rgb(255 255 255 / 0.95);
    transition:
      transform 60ms ease,
      box-shadow 60ms ease;
  }

  .key:active:not(:disabled) {
    transform: translateY(3px);
    box-shadow:
      0 1px 0 #b3aa99,
      0 2px 4px rgb(0 0 0 / 0.2),
      inset 0 1px 3px rgb(0 0 0 / 0.12);
  }

  .function {
    border-color: #2f3237;
    background: linear-gradient(#5d6168, #3f4248);
    color: #f4f1ea;
    box-shadow:
      0 4px 0 #26282c,
      0 6px 10px rgb(0 0 0 / 0.25),
      inset 0 1px 0 rgb(255 255 255 / 0.18);
  }

  .function:active:not(:disabled) {
    box-shadow:
      0 1px 0 #26282c,
      0 2px 4px rgb(0 0 0 / 0.25),
      inset 0 2px 4px rgb(0 0 0 / 0.3);
  }

  /* Brushed-steel keys of the safe door, with engraved digits. */
  .safe .key {
    border-color: #7d848c;
    background:
      repeating-linear-gradient(90deg, rgb(255 255 255 / 0.08) 0 1px, transparent 1px 3px),
      linear-gradient(#eef1f4, #b8bec5);
    color: #2f343a;
    text-shadow: 0 1px 0 rgb(255 255 255 / 0.7);
    box-shadow:
      0 4px 0 #6f767e,
      0 6px 10px rgb(0 0 0 / 0.3),
      inset 0 1px 0 rgb(255 255 255 / 0.9);
  }

  .safe .key:active:not(:disabled) {
    box-shadow:
      0 1px 0 #6f767e,
      0 2px 4px rgb(0 0 0 / 0.3),
      inset 0 2px 4px rgb(0 0 0 / 0.2);
  }

  .safe .function {
    border-color: #4f555c;
    background:
      repeating-linear-gradient(90deg, rgb(255 255 255 / 0.06) 0 1px, transparent 1px 3px),
      linear-gradient(#8e959d, #646b73);
    color: #f4f6f8;
    text-shadow: 0 -1px 0 rgb(0 0 0 / 0.4);
  }

  .key:disabled {
    opacity: 0.6;
  }

  @media (prefers-reduced-motion: reduce) {
    .key {
      transition: none;
    }

    .key:active:not(:disabled) {
      transform: none;
    }
  }
</style>
