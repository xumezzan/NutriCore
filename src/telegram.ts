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
//
// Telegram CloudStorage has a hard 4096-byte-per-key limit. For larger values
// we split into numbered chunks: key__0, key__1, … and store the chunk count
// under key__n. On read we detect the presence of key__n and reassemble.
const CS_CHUNK_SIZE = 3800; // stay safely below 4096

function csSetRaw(cs: TgCloudStorage, key: string, value: string): Promise<void> {
  return new Promise((resolve) => { cs.setItem(key, value, () => resolve()); });
}
function csGetRaw(cs: TgCloudStorage, key: string): Promise<string> {
  return new Promise((resolve) => {
    cs.getItem(key, (_err, val) => resolve(val ?? ""));
  });
}
function csRemoveRaw(cs: TgCloudStorage, key: string): Promise<void> {
  return new Promise((resolve) => { cs.removeItem(key, () => resolve()); });
}

async function csSetChunked(cs: TgCloudStorage, key: string, value: string): Promise<void> {
  // Split UTF-16 string into chunks that stay within byte limit when encoded.
  // We chunk by character count; each char is at most 3 bytes in UTF-8.
  const chunkChars = Math.floor(CS_CHUNK_SIZE / 3);
  const chunks: string[] = [];
  for (let i = 0; i < value.length; i += chunkChars) {
    chunks.push(value.slice(i, i + chunkChars));
  }
  if (chunks.length === 1) {
    // Fits in one key — no chunking needed, write directly and clear any old chunks.
    await csSetRaw(cs, key, value);
    await csRemoveRaw(cs, `${key}__n`);
    return;
  }
  // Write chunks in parallel, then write the count marker last.
  await Promise.all(chunks.map((chunk, i) => csSetRaw(cs, `${key}__${i}`, chunk)));
  await csSetRaw(cs, `${key}__n`, String(chunks.length));
  // Clear the un-chunked key so old data doesn't interfere.
  await csRemoveRaw(cs, key);
}

async function csGetChunked(cs: TgCloudStorage, key: string): Promise<string | null> {
  const nStr = await csGetRaw(cs, `${key}__n`);
  if (nStr && nStr !== "") {
    const n = parseInt(nStr, 10);
    if (!isNaN(n) && n > 1) {
      const chunks = await Promise.all(
        Array.from({ length: n }, (_, i) => csGetRaw(cs, `${key}__${i}`))
      );
      const assembled = chunks.join("");
      return assembled || null;
    }
  }
  // No chunk marker — try the plain key.
  const plain = await csGetRaw(cs, key);
  return plain || null;
}

async function csRemoveChunked(cs: TgCloudStorage, key: string): Promise<void> {
  const nStr = await csGetRaw(cs, `${key}__n`);
  const ops: Promise<void>[] = [csRemoveRaw(cs, key), csRemoveRaw(cs, `${key}__n`)];
  if (nStr && nStr !== "") {
    const n = parseInt(nStr, 10);
    if (!isNaN(n)) {
      for (let i = 0; i < n; i++) ops.push(csRemoveRaw(cs, `${key}__${i}`));
    }
  }
  await Promise.all(ops);
}

export const storage = {
  async getItem(key: string): Promise<string | null> {
    const cs = tg?.CloudStorage;
    if (cs) {
      const val = await csGetChunked(cs, key);
      if (val != null) return val;
      // CloudStorage had nothing — try localStorage as migration fallback.
      try { return localStorage.getItem(key); } catch { return null; }
    }
    try { return localStorage.getItem(key); } catch { return null; }
  },

  async setItem(key: string, value: string): Promise<void> {
    // Always mirror to localStorage as a best-effort local cache.
    try { localStorage.setItem(key, value); } catch {}
    const cs = tg?.CloudStorage;
    if (!cs) return;
    await csSetChunked(cs, key, value);
  },

  async removeItem(key: string): Promise<void> {
    try { localStorage.removeItem(key); } catch {}
    const cs = tg?.CloudStorage;
    if (!cs) return;
    await csRemoveChunked(cs, key);
  },
};
