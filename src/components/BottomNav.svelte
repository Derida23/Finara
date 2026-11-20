<script lang="ts" module>
  export type Tab = "capture" | "history" | "summary";
</script>

<script lang="ts">
  interface Props {
    tab: Tab;
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: "capture", label: "Catat" },
    { id: "history", label: "Riwayat" },
    { id: "summary", label: "Ringkasan" },
  ];

  let { tab = $bindable() }: Props = $props();
</script>

<nav class="bottom-nav" aria-label="Navigasi utama">
  {#each TABS as item (item.id)}
    <button
      type="button"
      aria-current={tab === item.id ? "page" : undefined}
      onclick={() => (tab = item.id)}>{item.label}</button
    >
  {/each}
</nav>

<style>
  /* Bottom edge of a manila folder with index tabs; the open tab is paper-white and stands up. */
  .bottom-nav {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 6px;
    max-width: 480px;
    margin: 0 auto;
    padding: 12px 10px max(8px, env(safe-area-inset-bottom));
    border-top: 1px solid #b9a67e;
    background-color: #d8c9a8;
    background-image: var(--noise), linear-gradient(#e2d4b5, #cfbf9c);
    box-shadow:
      0 -4px 12px rgb(0 0 0 / 0.12),
      inset 0 1px 0 rgb(255 255 255 / 0.5);
  }

  button {
    min-height: 48px;
    border: 1px solid #b9a67e;
    border-radius: 12px 12px 4px 4px;
    background: linear-gradient(#ecdfc3, #dccdab);
    color: #5c4f37;
    font-weight: 700;
    box-shadow:
      inset 0 1px 0 rgb(255 255 255 / 0.6),
      0 2px 0 #b9a67e;
  }

  /* Same size and position as the other tabs; only the paper colour and the green label differ. */
  button[aria-current="page"] {
    background: linear-gradient(var(--paper), #f1e9d6);
    color: var(--color-primary);
  }
</style>
