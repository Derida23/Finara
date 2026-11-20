<script lang="ts">
  import Numpad from "../components/Numpad.svelte";
  import { ApiError, login } from "../lib/api";
  import { session } from "../lib/session.svelte";

  const PIN_LENGTH = 8;
  const DIGIT_KEY = /^\d$/;
  const DOT_INDEXES = Array.from({ length: PIN_LENGTH }, (_, index) => index);

  let pin = $state("");
  let isChecking = $state(false);
  let message = $state("");
  let isShaking = $state(false);

  const errorMessage = (error: unknown): string => {
    if (error instanceof ApiError && error.code === "INVALID_PIN") {
      return "PIN salah. Coba lagi.";
    }
    if (error instanceof ApiError && error.code === "NETWORK") {
      return "Tidak bisa terhubung. Periksa koneksi internet.";
    }
    return "Server sedang bermasalah. Coba lagi sebentar lagi.";
  };

  const submit = async (value: string) => {
    isChecking = true;
    try {
      session.unlock(await login(value));
    } catch (error) {
      message = errorMessage(error);
      pin = "";
      isShaking = true;
      navigator.vibrate?.(200);
    } finally {
      isChecking = false;
    }
  };

  const press = (key: string) => {
    if (isChecking || pin.length >= PIN_LENGTH) {
      return;
    }
    message = "";
    pin += key;
    if (pin.length === PIN_LENGTH) {
      void submit(pin);
    }
  };

  const backspace = () => {
    if (!isChecking) {
      pin = pin.slice(0, -1);
    }
  };

  const onKeydown = (event: KeyboardEvent) => {
    if (DIGIT_KEY.test(event.key)) {
      press(event.key);
    } else if (event.key === "Backspace") {
      backspace();
    }
  };
</script>

<svelte:window onkeydown={onKeydown} />

<main class="pin-screen">
  <div class="door">
    <header>
      <h1>Finara</h1>
      <p class="tagline">Catat pengeluaran harian</p>
    </header>

    <div class="lock">
      <p class="instruction">Masukkan PIN</p>
      <div
        class="leds"
        class:shaking={isShaking}
        class:alarm={message !== "" && !isChecking}
        role="img"
        aria-label={`${pin.length} dari ${PIN_LENGTH} digit terisi`}
        onanimationend={() => (isShaking = false)}
      >
        {#each DOT_INDEXES as index (index)}
          <span class="led" class:on={index < pin.length}></span>
        {/each}
      </div>
    </div>

    <p class="message" class:error={!isChecking} aria-live="polite">
      {isChecking ? "Memeriksa…" : message}
    </p>

    <Numpad variant="safe" onKey={press} onBackspace={backspace} disabled={isChecking} />
  </div>
</main>

<style>
  .pin-screen {
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
    gap: 10px;
  }

  .instruction {
    margin: 0;
    color: #3f454c;
    text-shadow: 0 1px 0 rgb(255 255 255 / 0.5);
  }

  /* Recessed indicator strip; one LED per digit. */
  .leds {
    align-self: center;
    display: flex;
    gap: 12px;
    padding: 12px 16px;
    border-radius: 12px;
    background: linear-gradient(#2b2f34, #1c1f23);
    box-shadow:
      inset 0 2px 6px rgb(0 0 0 / 0.6),
      0 1px 0 rgb(255 255 255 / 0.5);
  }

  .led {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: radial-gradient(circle at 35% 35%, #3b4a40, #18201b);
    box-shadow: inset 0 1px 2px rgb(0 0 0 / 0.8);
  }

  .led.on {
    background: radial-gradient(circle at 35% 35%, #c9ffd9, #2fd469 45%, #138a3d);
    box-shadow:
      0 0 8px #2fd469,
      0 0 2px #2fd469;
  }

  /* After a wrong PIN every LED glows red until the next digit is typed. */
  .alarm .led {
    background: radial-gradient(circle at 35% 35%, #ffd0c9, #e5483a 45%, #8f1d14);
    box-shadow: 0 0 8px #e5483a;
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
