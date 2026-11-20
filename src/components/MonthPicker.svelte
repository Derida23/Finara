<script lang="ts">
  import { monthLabel, shiftMonth } from "../lib/format";

  interface Props {
    month: string;
    max: string;
  }

  let { month = $bindable(), max }: Props = $props();
</script>

<!-- SVG chevrons instead of the ‹ › glyphs: a glyph sits on the font baseline, not in the middle of the knob. -->
<div class="month-picker">
  <button
    type="button"
    class="knob"
    aria-label="Bulan sebelumnya"
    onclick={() => (month = shiftMonth(month, -1))}
  >
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
  </button>
  <span class="plate" aria-live="polite">{monthLabel(month)}</span>
  <button
    type="button"
    class="knob"
    aria-label="Bulan berikutnya"
    disabled={month >= max}
    onclick={() => (month = shiftMonth(month, 1))}
  >
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
  </button>
</div>

<style>
  .month-picker {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  /* Engraved brass name plate with a screw at each end. */
  .plate {
    --screw: #f8eccb 0 1.5px, #8f6d26 2.5px 3.5px, transparent 4.5px;

    flex: 1;
    padding: 8px 28px;
    border: 1px solid #8f6d26;
    border-radius: 8px;
    background:
      radial-gradient(circle at 13px 50%, var(--screw)),
      radial-gradient(circle at calc(100% - 13px) 50%, var(--screw)),
      linear-gradient(#f3dd9b, #d5b05a 45%, #b38a36 55%, #d9b968);
    color: #4a3608;
    font-size: 1.05rem;
    font-weight: 800;
    letter-spacing: 0.03em;
    text-align: center;
    text-shadow: 0 1px 0 rgb(255 255 255 / 0.45);
    box-shadow:
      0 2px 4px rgb(0 0 0 / 0.25),
      inset 0 1px 0 rgb(255 255 255 / 0.6),
      inset 0 -1px 0 rgb(0 0 0 / 0.2);
  }

  /* Knurled steel knob: ridged rim around a smooth cap. */
  .knob {
    flex-shrink: 0;
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    padding: 0;
    border: 1px solid #6f767e;
    border-radius: 50%;
    background:
      radial-gradient(circle at 50% 45%, #f7f9fb 0, #ccd2d8 11px, #a9b0b7 15px, transparent 16px),
      repeating-conic-gradient(rgb(0 0 0 / 0.14) 0 5deg, rgb(255 255 255 / 0.15) 5deg 10deg),
      linear-gradient(#d9dee3, #8e959d);
    color: #2f343a;
    box-shadow:
      0 3px 0 #5d636a,
      0 5px 8px rgb(0 0 0 / 0.25);
    transition:
      transform 60ms ease,
      box-shadow 60ms ease;
  }

  .knob:active:not(:disabled) {
    transform: translateY(2px);
    box-shadow:
      0 1px 0 #5d636a,
      0 2px 3px rgb(0 0 0 / 0.25);
  }

  .knob:disabled {
    opacity: 0.4;
  }

  svg {
    width: 20px;
    height: 20px;
    fill: none;
    stroke: currentColor;
    stroke-width: 2.5;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  @media (prefers-reduced-motion: reduce) {
    .knob {
      transition: none;
    }

    .knob:active:not(:disabled) {
      transform: none;
    }
  }
</style>
