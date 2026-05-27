// Thin wrapper around window.Telegram.WebApp.
// Safe to import in any environment: outside Telegram it degrades to no-ops
// and a localStorage-backed CloudStorage fallback.

type CloudStorageCallback<T> = (err: string | null, value?: T) => void;

interface TgCloudStorage {
  setItem: (key: string, value: string, cb?: CloudStorageCallback<boolean>) => void;
  getItem: (key: string, cb: CloudStorageCallback<string>) => void;
  removeItem: (key: string, cb?: CloudStorageCallback<boolean>) => void;
}

interface TgMainButton {
  text: string;
  isVisible: boolean;
  show: () => void;
  hide: () => void;
  enable: () => void;
  disable: () => void;
  setText: (text: string) => void;
  onClick: (cb: () => void) => void;
  offClick: (cb: () => void) => void;
}

interface TgBackButton {
  isVisible: boolean;
  show: () => void;
  hide: () => void;
  onClick: (cb: () => void) => void;
  offClick: (cb: () => void) => void;
}

interface TgHapticFeedback {
  impactOccurred: (style: "light" | "medium" | "heavy" | "rigid" | "soft") => void;
  notificationOccurred: (type: "error" | "success" | "warning") => void;
  selectionChanged: () => void;
}

interface TgSafeAreaInset {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

interface TgWebApp {
  ready: () => void;
  expand: () => void;
  isExpanded: boolean;
  initData: string;
  initDataUnsafe: {
    user?: {
      id: number;
      first_name?: string;
      last_name?: string;
      username?: string;
      language_code?: string;
    };
  };
  colorScheme: "light" | "dark";
  themeParams: Record<string, string>;
  viewportHeight: number;
  viewportStableHeight: number;
  safeAreaInset?: TgSafeAreaInset;
  contentSafeAreaInset?: TgSafeAreaInset;
  CloudStorage?: TgCloudStorage;
  MainButton: TgMainButton;
  BackButton: TgBackButton;
  HapticFeedback?: TgHapticFeedback;
  setHeaderColor?: (color: string) => void;
  setBackgroundColor?: (color: string) => void;
  disableVerticalSwipes?: () => void;
  onEvent: (event: string, cb: () => void) => void;
  offEvent: (event: string, cb: () => void) => void;
  version: string;
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TgWebApp };
  }
}

export const tg: TgWebApp | null =
  typeof window !== "undefined" && window.Telegram?.WebApp
    ? window.Telegram.WebApp
    : null;

export const isTMA = !!tg && !!tg.initData;

function syncViewportVars(): void {
  if (!tg || typeof document === "undefined") return;
  const root = document.documentElement;
  const sa = tg.safeAreaInset ?? { top: 0, right: 0, bottom: 0, left: 0 };
  root.style.setProperty("--tg-safe-top", `${sa.top}px`);
  root.style.setProperty("--tg-safe-right", `${sa.right}px`);
  root.style.setProperty("--tg-safe-bottom", `${sa.bottom}px`);
  root.style.setProperty("--tg-safe-left", `${sa.left}px`);
  if (tg.viewportStableHeight) {
    root.style.setProperty("--tg-viewport", `${tg.viewportStableHeight}px`);
  }
  // viewportHeight shrinks when the keyboard opens — used for keyboard-aware layouts
  if (tg.viewportHeight) {
    root.style.setProperty("--tg-viewport-actual", `${tg.viewportHeight}px`);
  }
}

export function initTelegram(): void {
  if (!tg) return;
  try {
    tg.ready();
    if (!tg.isExpanded) tg.expand();
    // Match the app's graphite background so the native header doesn't flash white.
    tg.setHeaderColor?.("#0A0A0A");
    tg.setBackgroundColor?.("#0A0A0A");
    tg.disableVerticalSwipes?.();
    syncViewportVars();
    tg.onEvent("viewportChanged", syncViewportVars);
    tg.onEvent("safeAreaChanged", syncViewportVars);
    tg.onEvent("contentSafeAreaChanged", syncViewportVars);
  } catch {
    // Older Telegram clients may not support every method — ignore.
  }
}

export function hapticImpact(style: "light" | "medium" | "heavy" = "light"): void {
  try { tg?.HapticFeedback?.impactOccurred(style); } catch {}
}

export function hapticNotify(type: "success" | "error" | "warning"): void {
  try { tg?.HapticFeedback?.notificationOccurred(type); } catch {}
}

export function getTelegramLanguage(): "ru" | "uz" | null {
  const code = tg?.initDataUnsafe?.user?.language_code?.toLowerCase();
  if (!code) return null;
  if (code.startsWith("uz")) return "uz";
  if (code.startsWith("ru")) return "ru";
  return null;
}

// fetch wrapper that attaches the Telegram initData to every API call, so the
// server can validate the caller via HMAC.
export function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  if (tg?.initData) {
    headers.set("X-Telegram-Init-Data", tg.initData);
  }
  return fetch(input, { ...init, headers });
}

// Promise-style CloudStorage with a localStorage fallback when running outside
// Telegram or on a client too old to support CloudStorage.
export const storage = {
  async getItem(key: string): Promise<string | null> {
    const cs = tg?.CloudStorage;
    if (cs) {
      return new Promise((resolve) => {
        cs.getItem(key, (err, value) => {
          if (err || value == null || value === "") {
            resolve(localStorage.getItem(key));
          } else {
            resolve(value);
          }
        });
      });
    }
    return localStorage.getItem(key);
  },

  async setItem(key: string, value: string): Promise<void> {
    try {
      localStorage.setItem(key, value);
    } catch {
      // localStorage may throw in private mode — ignore, CloudStorage may still work.
    }
    const cs = tg?.CloudStorage;
    if (!cs) return;
    // Telegram CloudStorage has a 4096-byte per-value limit. Skip writes above
    // that to avoid silent failures; localStorage already has the data.
    if (new Blob([value]).size > 4096) return;
    return new Promise((resolve) => {
      cs.setItem(key, value, () => resolve());
    });
  },

  async removeItem(key: string): Promise<void> {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
    const cs = tg?.CloudStorage;
    if (!cs) return;
    return new Promise((resolve) => {
      cs.removeItem(key, () => resolve());
    });
  },
};
