export const DEFAULT_SHORTCUTS = [
  { id: "yt", name: "YouTube", url: "https://www.youtube.com" },
  { id: "gh", name: "GitHub", url: "https://github.com" },
  { id: "rd", name: "Reddit", url: "https://www.reddit.com" },
  { id: "cr", name: "Cronometer", url: "https://cronometer.com" },
  { id: "e1", name: "", url: "" },
  { id: "e2", name: "", url: "" },
  { id: "e3", name: "", url: "" },
];

export const DEFAULT_SETTINGS = {
  // Appearance / Themes
  theme: "amoled", // "amoled", "charcoal", "navy", "matrix"
  accentColor: "white", // "white", "amber", "green", "cyan", "purple", "rose"
  glowEffect: false,
  scale: 1,
  showZoomControls: true,

  // ASCII Eyes
  showEyes: true,
  eyeVariant: "classic", // "classic", "sleepy", "wide", "squint", "glare", "close", "far", "random"
  eyeRamp: "classic", // "classic", "minimal", "blocks", "binary", "matrix"
  eyeFollow: true,
  eyeBlinkRate: "normal", // "off", "calm", "normal", "frequent"

  // Clock & Date
  showClock: true,
  timeFormat: "12h", // "12h", "24h"
  showSeconds: true,
  showDate: false,
  dateFormat: "medium", // "full", "medium", "numeric"

  // Quotes
  showQuote: true,
  quoteMode: "random", // "random", "custom"
  customQuoteText: "",
  customQuoteAuthor: "",

  // Shortcuts
  showShortcuts: true,
  openInNewTab: false,
  iconStyle: "favicon", // "favicon", "letter", "none"
};

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
  const settings = await loadSettings();
  return clampScale(settings.scale);
}

export async function saveScale(n) {
  const scale = clampScale(n);
  await setSync("scale", scale);
  const settings = await loadSettings();
  if (settings.scale !== scale) {
    settings.scale = scale;
    await setSync("settings", settings);
  }
}

export async function loadSettings() {
  const existing = await getSync("settings");
  let scale = await getSync("scale");
  if (scale !== undefined) {
    scale = clampScale(scale);
  }

  if (existing && typeof existing === "object") {
    return {
      ...DEFAULT_SETTINGS,
      ...existing,
      scale: scale !== undefined ? scale : clampScale(existing.scale ?? DEFAULT_SETTINGS.scale),
    };
  }

  const initial = {
    ...DEFAULT_SETTINGS,
    scale: scale !== undefined ? scale : DEFAULT_SETTINGS.scale,
  };
  try {
    await setSync("settings", initial);
  } catch {}
  return initial;
}

export async function saveSettings(settings) {
  const merged = { ...DEFAULT_SETTINGS, ...settings };
  merged.scale = clampScale(merged.scale);
  await setSync("settings", merged);
  await setSync("scale", merged.scale);
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
