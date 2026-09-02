export const DEFAULT_SHORTCUTS = [
  { id: "yt", name: "YouTube", url: "https://www.youtube.com" },
  { id: "gh", name: "GitHub", url: "https://github.com" },
  { id: "rd", name: "Reddit", url: "https://www.reddit.com" },
  { id: "cr", name: "Cronometer", url: "https://cronometer.com" },
  { id: "e1", name: "", url: "" },
  { id: "e2", name: "", url: "" },
  { id: "e3", name: "", url: "" },
];

export function isEmptyChip(chip) {
  return !chip.name && !chip.url;
}

export function newId() {
  return crypto.randomUUID();
}

export function normalizeUrl(raw) {
  const t = String(raw || "").trim();
  if (!t) throw new Error("empty");
  const withScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(t) ? t : `https://${t}`;
  return new URL(withScheme).href;
}

function hasChromeSync() {
  return Boolean(globalThis.chrome?.storage?.sync);
}

async function getSync(key) {
  if (hasChromeSync()) {
    const o = await chrome.storage.sync.get(key);
    return o[key];
  }
  try {
    const raw = localStorage.getItem("sync:" + key);
    return raw ? JSON.parse(raw) : undefined;
  } catch {
    return undefined;
  }
}

async function setSync(key, val) {
  if (hasChromeSync()) {
    await chrome.storage.sync.set({ [key]: val });
    return;
  }
  localStorage.setItem("sync:" + key, JSON.stringify(val));
}

async function getLocal(key) {
  if (globalThis.chrome?.storage?.local) {
    const o = await chrome.storage.local.get(key);
    return o[key];
  }
  try {
    const raw = localStorage.getItem("local:" + key);
    return raw ? JSON.parse(raw) : undefined;
  } catch {
    return undefined;
  }
}

async function setLocal(key, val) {
  if (globalThis.chrome?.storage?.local) {
    await chrome.storage.local.set({ [key]: val });
    return;
  }
  localStorage.setItem("local:" + key, JSON.stringify(val));
}

export async function loadShortcuts() {
  const existing = await getSync("shortcuts");
  if (Array.isArray(existing)) return existing;
  try {
    await setSync("shortcuts", DEFAULT_SHORTCUTS);
  } catch {
    // persist can fail; still hand the UI defaults
  }
  return DEFAULT_SHORTCUTS.map((c) => ({ ...c }));
}

export async function saveShortcuts(list) {
  await setSync("shortcuts", list);
}

export const MIN_SCALE = 0.7;
export const MAX_SCALE = 2;
export const SCALE_STEP = 0.1;
export const DEFAULT_SCALE = 1;

export function clampScale(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return DEFAULT_SCALE;
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, Math.round(x * 10) / 10));
}

export async function loadScale() {
  return clampScale(await getSync("scale"));
}

export async function saveScale(n) {
  await setSync("scale", clampScale(n));
}

export async function loadArtCache() {
  const v = await getLocal("drawnArt");
  return typeof v === "string" ? v : null;
}

export async function saveArtCache(art) {
  await setLocal("drawnArt", art);
}

export async function loadQuoteCache() {
  const v = await getLocal("quoteCache");
  return v && typeof v.text === "string" ? v : null;
}

export async function saveQuoteCache(quote) {
  await setLocal("quoteCache", quote);
}

export async function saveWithToast(saveFn, toastEl) {
  try {
    await saveFn();
  } catch {
    if (toastEl) {
      toastEl.textContent = "couldn't save";
      toastEl.classList.remove("hidden");
      setTimeout(() => toastEl.classList.add("hidden"), 2200);
    }
  }
}
