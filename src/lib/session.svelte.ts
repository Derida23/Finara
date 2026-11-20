// Locks when the app has been in the background longer than this (agreed grace period).
const LOCK_AFTER_HIDDEN_MS = 60_000;

interface Session {
  token: string;
  expiresAt: number;
}

// Held in memory only: a reload or a closed app always asks for the PIN again.
let current = $state<Session | null>(null);

const lock = (): void => {
  current = null;
};

const unlock = (next: Session): void => {
  current = next;
};

const isExpired = (): boolean => current !== null && current.expiresAt <= Date.now();

const watch = (): (() => void) => {
  let hiddenAt: number | null = null;
  const onVisibilityChange = () => {
    if (document.visibilityState === "hidden") {
      hiddenAt = Date.now();
      return;
    }
    if ((hiddenAt !== null && Date.now() - hiddenAt > LOCK_AFTER_HIDDEN_MS) || isExpired()) {
      lock();
    }
    hiddenAt = null;
  };
  document.addEventListener("visibilitychange", onVisibilityChange);
  const expiryCheck = setInterval(() => {
    if (isExpired()) {
      lock();
    }
  }, 30_000);
  return () => {
    document.removeEventListener("visibilitychange", onVisibilityChange);
    clearInterval(expiryCheck);
  };
};

const session = {
  get token(): string | null {
    return current?.token ?? null;
  },
  get isUnlocked(): boolean {
    return current !== null;
  },
  lock,
  unlock,
  watch,
};

export type { Session };
export { session };
