import { loadArtCache, saveArtCache } from "./storage.js";

export const RAMP = " .:-=+*#%@";
export const COLS = 90;
export const MAX_ROWS = 40;

export function luminance(r, g, b) {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

export function pixelsToAscii(data, width, height, cols = COLS, maxRows = MAX_ROWS, ramp = RAMP) {
  const cellW = width / cols;
  const charAspect = 0.45;
  let rows = Math.round((height / width) * cols * charAspect);
  if (!Number.isFinite(rows) || rows < 1) rows = 1;
  if (rows > maxRows) rows = maxRows;
  const cellH = height / rows;
  const lines = [];
  for (let y = 0; y < rows; y++) {
    let line = "";
    for (let x = 0; x < cols; x++) {
      const px = Math.min(width - 1, Math.floor((x + 0.5) * cellW));
      const py = Math.min(height - 1, Math.floor((y + 0.5) * cellH));
      const i = (py * width + px) * 4;
      const lum = luminance(data[i], data[i + 1], data[i + 2]);
      const idx = Math.min(ramp.length - 1, Math.floor((lum / 255) * ramp.length));
      line += ramp[idx];
    }
    lines.push(line);
  }
  return lines.join("\n");
}

export function truncateQuote(text, max = 140) {
  const t = String(text || "").trim();
  if (t.length <= max) return t;
  return t.slice(0, max - 1) + "…";
}

export const ASCII_POOL = 5293;
export const MAX_ART_COLS = 110;
export const MAX_ART_ROWS = 42;
export const MIN_ART_ROWS = 3;

export function normalizeArt(raw) {
  return String(raw || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\t/g, "    ")
    .replace(/[ \t]+\n/g, "\n")
    .trimEnd();
}

export function artFits(art, maxCols = MAX_ART_COLS, maxRows = MAX_ART_ROWS) {
  const lines = String(art || "").split("\n").filter((l, i, a) => l.length || (i > 0 && i < a.length - 1));
  if (lines.length < MIN_ART_ROWS || lines.length > maxRows) return false;
  const width = Math.max(0, ...lines.map((l) => l.length));
  return width >= 6 && width <= maxCols;
}

export function isDividerLabel(labels) {
  return String(labels || "").toLowerCase().includes("divider");
}

export async function fetchAsciiAt(offset) {
  const url =
    "https://datasets-server.huggingface.co/rows" +
    "?dataset=apehex/ascii-art&config=asciiart&split=train" +
    `&offset=${offset}&length=1`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("ascii fetch failed");
  const data = await res.json();
  const row = data?.rows?.[0]?.row;
  if (!row) throw new Error("empty ascii row");
  return {
    art: normalizeArt(row.content),
    labels: row.labels || "",
    caption: row.caption || "",
  };
}

export async function fetchRandomAsciiArt(tries = 8) {
  let lastErr = new Error("no ascii");
  for (let i = 0; i < tries; i++) {
    const offset = Math.floor(Math.random() * ASCII_POOL);
    try {
      const piece = await fetchAsciiAt(offset);
      if (isDividerLabel(piece.labels)) continue;
      if (!artFits(piece.art)) continue;
      return piece.art;
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr;
}

let glitchTimer = 0;
let restoreTimer = 0;
let glitchOriginal = "";

export function stopGlitch() {
  if (glitchTimer) {
    clearInterval(glitchTimer);
    glitchTimer = 0;
  }
  if (restoreTimer) {
    clearTimeout(restoreTimer);
    restoreTimer = 0;
  }
  glitchOriginal = "";
}

export function startGlitch(preEl) {
  stopGlitch();
  glitchOriginal = preEl.textContent;
  const ramp = RAMP;
  glitchTimer = setInterval(() => {
    const src = glitchOriginal.split("\n");
    if (!src.length) return;
    const lines = src.map((l) => l.split(""));
    const total = lines.reduce((n, l) => n + l.length, 0);
    const flips = Math.max(1, Math.floor(total * (0.008 + Math.random() * 0.015)));
    for (let i = 0; i < flips; i++) {
      const y = Math.floor(Math.random() * lines.length);
      if (!lines[y].length) continue;
      const x = Math.floor(Math.random() * lines[y].length);
      const ch = lines[y][x];
      const idx = ramp.indexOf(ch);
      if (idx >= 0) {
        const n = Math.max(0, Math.min(ramp.length - 1, idx + (Math.random() < 0.5 ? -1 : 1)));
        lines[y][x] = ramp[n];
      }
    }
    if (Math.random() < 0.35) {
      const y = Math.floor(Math.random() * lines.length);
      if (lines[y].length > 4) {
        const shift = 1 + Math.floor(Math.random() * 2);
        const row = lines[y];
        const cut = row.splice(row.length - shift, shift);
        lines[y] = cut.concat(row);
      }
    }
    preEl.textContent = lines.map((l) => l.join("")).join("\n");
    restoreTimer = setTimeout(() => {
      if (glitchOriginal) preEl.textContent = glitchOriginal;
      restoreTimer = 0;
    }, 80);
  }, 400 + Math.floor(Math.random() * 800));
}

export function setAscii(preEl, art) {
  stopGlitch();
  preEl.textContent = art;
  startGlitch(preEl);
}

export async function loadFallbacks() {
  const res = await fetch(new URL("fallbacks.json", import.meta.url));
  return res.json();
}

export async function loadAscii(preEl) {
  const fb = await loadFallbacks();
  const cached = await loadArtCache();
  const bundled = () => fb.art[Math.floor(Math.random() * fb.art.length)];
  const show = (art) => setAscii(preEl, art);

  if (cached && artFits(cached, 140, 50)) show(cached);
  else show(bundled());

  try {
    const art = await fetchRandomAsciiArt();
    await saveArtCache(art);
    show(art);
  } catch {
    if (!(cached && artFits(cached, 140, 50))) show(bundled());
  }
}
