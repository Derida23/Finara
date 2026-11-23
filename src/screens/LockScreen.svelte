<script lang="ts">
  import PatternPad from "../components/PatternPad.svelte";
  import { ApiError, login } from "../lib/api";
  import { session } from "../lib/session.svelte";

  // How long a rejected pattern stays red before it is wiped, as on Android.
  const WRONG_DISPLAY_MS = 1000;

  let pad = $state<ReturnType<typeof PatternPad>>();
  let isChecking = $state(false);
  let isWrong = $state(false);
  let message = $state("");
  let isShaking = $state(false);

  const errorMessage = (error: unknown): string => {
    if (error instanceof ApiError && error.code === "INVALID_PATTERN") {
      return "Pola salah. Coba lagi.";
    }
    if (error instanceof ApiError && error.code === "NETWORK") {
      return "Tidak bisa terhubung. Periksa koneksi internet.";
    }
    return "Server sedang bermasalah. Coba lagi sebentar lagi.";
  };

  const submit = async (pattern: string) => {
    isChecking = true;
    try {
      session.unlock(await login(pattern));
    } catch (error) {
      message = errorMessage(error);
      isWrong = true;
      isShaking = true;
      navigator.vibrate?.(200);
      setTimeout(() => {
        isWrong = false;
        pad?.clear();
      }, WRONG_DISPLAY_MS);
    } finally {
      isChecking = false;
    }
  };
</script>

<main class="lock-screen">
  <div class="door">
    <header>
      <h1>Finara</h1>
      <p class="tagline">Catat pengeluaran harian</p>
    </header>

    <div class="lock">
      <p class="instruction">Gambar pola untuk membuka</p>
      <div class="plate" class:shaking={isShaking} onanimationend={() => (isShaking = false)}>
        <PatternPad
          bind:this={pad}
          {isWrong}
          disabled={isChecking}
          onStart={() => (message = "")}
          onTooShort={() => (message = "Sambungkan minimal 4 titik.")}
          onComplete={submit}
        />
      </div>
      <p class="message" class:error={!isChecking} aria-live="polite">
        {isChecking ? "Memeriksa…" : message}
      </p>
    </div>
  </div>
</main>

<style>
  .lock-screen {
    min-height: calc(100dvh - 2 * var(--space));
    display: flex;
  }

  /* Brushed-steel safe door with a rivet in each corner. */
  .door {
    --rivet: #f1f4f7 0 2px, #7b828a 3px 4px, transparent 5px;

    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    gap: 22px;
    padding: 28px 20px 24px;
    border: 1px solid #6b727a;
    border-radius: 22px;
    background:
      radial-gradient(circle at 18px 18px, var(--rivet)),
      radial-gradient(circle at calc(100% - 18px) 18px, var(--rivet)),
      radial-gradient(circle at 18px calc(100% - 18px), var(--rivet)),
      radial-gradient(circle at calc(100% - 18px) calc(100% - 18px), var(--rivet)),
      repeating-linear-gradient(90deg, rgb(255 255 255 / 0.07) 0 1px, transparent 1px 3px),
      linear-gradient(160deg, #d5dadf, #a9b0b8 55%, #959ca4);
    box-shadow:
      0 14px 28px rgb(0 0 0 / 0.3),
      inset 0 1px 0 rgb(255 255 255 / 0.7),
      inset 0 -2px 0 rgb(0 0 0 / 0.15),
      inset 0 0 0 6px rgb(255 255 255 / 0.08);
  }

  header {
    margin-bottom: auto;
    padding-top: 10vh;
    text-align: center;
  }

  /* Engraved lettering: dark face, light lower edge. */
  h1 {
    margin: 0 0 4px;
    color: #3b4148;
    font-size: 1.9rem;
    letter-spacing: 0.04em;
    text-shadow: 0 1px 0 rgb(255 255 255 / 0.65);
  }

  /* Small spaced capitals engraved under the name, like a maker's plate. */
  .tagline {
    margin: 0;
    color: #3f454c;
    font-size: 0.78rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-shadow: 0 1px 0 rgb(255 255 255 / 0.5);
    text-transform: uppercase;
  }

  .lock {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }

  .instruction {
    margin: 0;
    color: #3f454c;
    text-shadow: 0 1px 0 rgb(255 255 255 / 0.5);
  }

  /* A slightly sunken steel plate the nine bolts are set into. */
  .plate {
    width: 100%;
    max-width: 320px;
    padding: 10px;
    border-radius: 18px;
    background: linear-gradient(160deg, #c3c9cf, #a3aab2);
    box-shadow:
      inset 0 2px 6px rgb(0 0 0 / 0.25),
      0 1px 0 rgb(255 255 255 / 0.6);
  }

  .shaking {
    animation: shake 0.4s;
  }

  .message {
    min-height: 1.4em;
    margin: 0;
    color: #3b4148;
    text-align: center;
    text-shadow: 0 1px 0 rgb(255 255 255 / 0.5);
  }

  .message.error {
    color: #8f1d14;
    font-weight: 600;
  }

  @media (prefers-reduced-motion: reduce) {
    .shaking {
      animation: none;
    }
  }

  @keyframes shake {
    20%,
    60% {
      transform: translateX(-8px);
    }
    40%,
    80% {
      transform: translateX(8px);
    }
  }
</style>
