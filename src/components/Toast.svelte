<script lang="ts" module>
  export interface ToastData {
    id: number;
    message: string;
    actionLabel?: string;
    onAction?: () => void;
  }
</script>

<script lang="ts">
  interface Props {
    toast: ToastData;
    onDismiss: () => void;
    duration?: number;
  }

  let { toast, onDismiss, duration = 5000 }: Props = $props();

  // The parent re-creates this component per toast id, so each toast gets a fresh timer.
  $effect(() => {
    const timer = setTimeout(onDismiss, duration);
    return () => clearTimeout(timer);
  });
</script>

<div class="toast" role="status">
  <span>{toast.message}</span>
  {#if toast.actionLabel && toast.onAction}
    <button type="button" class="action" onclick={toast.onAction}>{toast.actionLabel}</button>
  {/if}
</div>

<style>
  /* A sticky note taped above the bottom navigation. */
  .toast {
    position: fixed;
    left: 50%;
    bottom: calc(80px + env(safe-area-inset-bottom));
    transform: translateX(-50%) rotate(-1deg);
    width: min(448px, calc(100% - 32px));
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 16px 16px 14px;
    border-radius: 2px 2px 16px 2px;
    background: linear-gradient(170deg, #fff3a8, #fde68a 60%, #f8d867);
    color: #3d3418;
    box-shadow:
      0 10px 18px rgb(0 0 0 / 0.22),
      inset 0 -10px 18px rgb(0 0 0 / 0.04);
  }

  /* The strip of tape holding the note. */
  .toast::before {
    content: "";
    position: absolute;
    top: -9px;
    left: 50%;
    width: 72px;
    height: 18px;
    transform: translateX(-50%) rotate(2deg);
    background: rgb(255 255 255 / 0.55);
    box-shadow: 0 1px 2px rgb(0 0 0 / 0.1);
  }

  .action {
    flex-shrink: 0;
    padding: 6px 8px;
    border: 0;
    background: none;
    color: #7a3400;
    font-weight: 800;
    text-decoration: underline;
    text-underline-offset: 3px;
  }
</style>
