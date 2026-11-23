<script lang="ts">
  import { addDot, GRID_SIZE, MIN_PATTERN_DOTS, toPatternString } from "../../shared/pattern";

  interface Props {
    onComplete: (pattern: string) => void;
    onStart?: () => void;
    onTooShort?: () => void;
    // Set by the parent while a rejected pattern is shown in red; input waits until it clears.
    isWrong?: boolean;
    disabled?: boolean;
  }

  interface Point {
    x: number;
    y: number;
  }

  const VIEW_SIZE = 300;
  const CELL = VIEW_SIZE / GRID_SIZE;
  const BOLT_RADIUS = 17;
  // A finger only has to come this close to a bolt's centre, as on Android.
  const HIT_RADIUS = 38;
  const TOO_SHORT_MS = 1000;
  const DOTS = Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, index) => index + 1);
  const DIGIT_KEY = /^[1-9]$/;

  let { onComplete, onStart, onTooShort, isWrong = false, disabled = false }: Props = $props();

  const uid = $props.id();
  let svg = $state<SVGSVGElement>();
  let dots = $state<number[]>([]);
  // The finger's position while drawing; null when no stroke is in progress.
  let pointer = $state<Point | null>(null);
  let isTooShort = $state(false);
  let tooShortTimer: ReturnType<typeof setTimeout> | undefined;

  const centerOf = (dot: number): Point => {
    return {
      x: ((dot - 1) % GRID_SIZE) * CELL + CELL / 2,
      y: Math.floor((dot - 1) / GRID_SIZE) * CELL + CELL / 2,
    };
  };

  const isAlarm = $derived(isWrong || isTooShort);
  // The wire runs through every connected bolt and then follows the finger.
  const wirePoints = $derived(
    [...dots.map(centerOf), ...(pointer ? [pointer] : [])]
      .map((point) => `${point.x},${point.y}`)
      .join(" "),
  );

  const boltFill = (dot: number): string => {
    if (!dots.includes(dot)) {
      return `url(#${uid}-steel)`;
    }
    return isAlarm ? `url(#${uid}-red)` : `url(#${uid}-green)`;
  };

  const toViewPoint = (event: PointerEvent): Point | null => {
    const rect = svg?.getBoundingClientRect();
    if (!rect || rect.width === 0) {
      return null;
    }
    return {
      x: ((event.clientX - rect.left) / rect.width) * VIEW_SIZE,
      y: ((event.clientY - rect.top) / rect.height) * VIEW_SIZE,
    };
  };

  const dotAt = (point: Point): number | null => {
    const hit = DOTS.find((dot) => {
      const center = centerOf(dot);
      return Math.hypot(center.x - point.x, center.y - point.y) <= HIT_RADIUS;
    });
    return hit ?? null;
  };

  // Lets the parent wipe a rejected pattern once it has been shown in red.
  export const clear = (): void => {
    clearTimeout(tooShortTimer);
    isTooShort = false;
    dots = [];
    pointer = null;
  };

  const extend = (dot: number) => {
    const next = addDot(dots, dot);
    if (next.length !== dots.length) {
      dots = next;
      navigator.vibrate?.(8);
    }
  };

  const finish = () => {
    pointer = null;
    if (dots.length === 0) {
      return;
    }
    if (dots.length < MIN_PATTERN_DOTS) {
      isTooShort = true;
      onTooShort?.();
      navigator.vibrate?.(200);
      tooShortTimer = setTimeout(clear, TOO_SHORT_MS);
      return;
    }
    onComplete(toPatternString(dots));
  };

  const begin = (): boolean => {
    if (disabled || isWrong) {
      return false;
    }
    clear();
    onStart?.();
    return true;
  };

  const handlePointerDown = (event: PointerEvent) => {
    const point = toViewPoint(event);
    if (!point || !begin()) {
      return;
    }
    svg?.setPointerCapture(event.pointerId);
    pointer = point;
    const dot = dotAt(point);
    if (dot !== null) {
      extend(dot);
    }
  };

  const handlePointerMove = (event: PointerEvent) => {
    const point = pointer === null ? null : toViewPoint(event);
    if (!point) {
      return;
    }
    pointer = point;
    const dot = dotAt(point);
    if (dot !== null) {
      extend(dot);
    }
  };

  const handlePointerUp = () => {
    if (pointer !== null) {
      finish();
    }
  };

  // Hardware keyboard: digits 1–9 add dots, Backspace removes the last one, Enter submits.
  const onKeydown = (event: KeyboardEvent) => {
    if (DIGIT_KEY.test(event.key)) {
      if (dots.length > 0 && !isTooShort ? !disabled && !isWrong : begin()) {
        extend(Number(event.key));
      }
    } else if (event.key === "Backspace" && !disabled && !isWrong) {
      dots = dots.slice(0, -1);
    } else if (event.key === "Enter" && !disabled && !isWrong) {
      finish();
    }
  };
</script>

<svelte:window onkeydown={onKeydown} />

<svg
  bind:this={svg}
  class="pad"
  class:alarm={isAlarm}
  class:disabled
  viewBox={`0 0 ${VIEW_SIZE} ${VIEW_SIZE}`}
  role="img"
  aria-label={`Pola 3 kali 3, ${dots.length} titik tersambung`}
  onpointerdown={handlePointerDown}
  onpointermove={handlePointerMove}
  onpointerup={handlePointerUp}
  onpointercancel={handlePointerUp}
>
  <defs>
    <radialGradient id={`${uid}-steel`} cx="40%" cy="35%" r="70%">
      <stop offset="0" stop-color="#f4f6f8" />
      <stop offset="0.55" stop-color="#b9c0c7" />
      <stop offset="1" stop-color="#7d848c" />
    </radialGradient>
    <radialGradient id={`${uid}-green`} cx="40%" cy="35%" r="70%">
      <stop offset="0" stop-color="#c9ffd9" />
      <stop offset="0.5" stop-color="#2fd469" />
      <stop offset="1" stop-color="#138a3d" />
    </radialGradient>
    <radialGradient id={`${uid}-red`} cx="40%" cy="35%" r="70%">
      <stop offset="0" stop-color="#ffd0c9" />
      <stop offset="0.5" stop-color="#e5483a" />
      <stop offset="1" stop-color="#8f1d14" />
    </radialGradient>
  </defs>

  <!-- Drawn first so the wire runs under the bolts, as on Android. -->
  {#if dots.length > 0}
    <polyline class="wire" points={wirePoints} />
  {/if}

  {#each DOTS as dot (dot)}
    {@const center = centerOf(dot)}
    <circle class="socket" cx={center.x} cy={center.y} r={BOLT_RADIUS + 7} />
    <circle
      class="bolt"
      class:on={dots.includes(dot)}
      cx={center.x}
      cy={center.y}
      r={BOLT_RADIUS}
      fill={boltFill(dot)}
    />
  {/each}
</svg>

<style>
  /* touch-action: none keeps the page from scrolling while a pattern is drawn. */
  .pad {
    display: block;
    width: min(100%, 300px);
    aspect-ratio: 1;
    margin: 0 auto;
    touch-action: none;
    user-select: none;
    -webkit-user-select: none;
    cursor: pointer;
  }

  .pad.disabled {
    cursor: default;
    opacity: 0.85;
  }

  /* A hole drilled in the steel door that each bolt sits in. */
  .socket {
    fill: rgb(0 0 0 / 0.16);
    stroke: rgb(255 255 255 / 0.55);
    stroke-width: 1;
  }

  .bolt {
    stroke: #5d636a;
    stroke-width: 1;
    transition: r 80ms ease;
  }

  .bolt.on {
    r: 20px;
  }

  /* The glowing wire joining the connected bolts. */
  .wire {
    fill: none;
    stroke: #2fd469;
    stroke-width: 8;
    stroke-linecap: round;
    stroke-linejoin: round;
    opacity: 0.85;
    filter: drop-shadow(0 0 4px #2fd469);
  }

  .alarm .wire {
    stroke: #e5483a;
    filter: drop-shadow(0 0 4px #e5483a);
  }

  @media (prefers-reduced-motion: reduce) {
    .bolt {
      transition: none;
    }
  }
</style>
