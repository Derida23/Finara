<script lang="ts">
  import BottomNav, { type Tab } from "./components/BottomNav.svelte";
  import { session } from "./lib/session.svelte";
  import CaptureScreen from "./screens/CaptureScreen.svelte";
  import HistoryScreen from "./screens/HistoryScreen.svelte";
  import PinScreen from "./screens/PinScreen.svelte";
  import SummaryScreen from "./screens/SummaryScreen.svelte";

  let tab = $state<Tab>("capture");

  $effect(() => session.watch());

  // Every unlock starts on Catat, the screen the app is opened for.
  $effect(() => {
    if (!session.isUnlocked) {
      tab = "capture";
    }
  });
</script>

{#if session.isUnlocked}
  <div class="shell">
    {#if tab === "capture"}
      <CaptureScreen />
    {:else if tab === "history"}
      <HistoryScreen />
    {:else}
      <SummaryScreen />
    {/if}
  </div>
  <BottomNav bind:tab />
{:else}
  <PinScreen />
{/if}

<style>
  .shell {
    /* Room for the fixed bottom navigation. */
    padding-bottom: 88px;
  }
</style>
