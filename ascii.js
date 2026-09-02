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

export async function fetchRandomImage() {
  const res = await fetch("https://picsum.photos/800/400.jpg?grayscale");
  if (!res.ok) throw new Error("image fetch failed");
  return res.blob();
}

export async function blobToAscii(blob, cols = COLS, maxRows = MAX_ROWS) {
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(bitmap, 0, 0);
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return pixelsToAscii(data, canvas.width, canvas.height, cols, maxRows);
}

let glitchTimer = 0;
let glitchOriginal = "";

export function stopGlitch() {
  if (glitchTimer) {
    clearInterval(glitchTimer);
    glitchTimer = 0;
  }
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
    const flips = Math.max(1, Math.floor(total * (0.01 + Math.random() * 0.02)));
    for (let i = 0; i < flips; i++) {
      const y = Math.floor(Math.random() * lines.length);
      const x = Math.floor(Math.random() * lines[y].length);
      const ch = lines[y][x];
      const idx = ramp.indexOf(ch);
      if (idx >= 0) {
        const n = Math.max(0, Math.min(ramp.length - 1, idx + (Math.random() < 0.5 ? -1 : 1)));
        lines[y][x] = ramp[n];
      }
    }
    if (Math.random() < 0.45) {
      const y = Math.floor(Math.random() * lines.length);
      const shift = 1 + Math.floor(Math.random() * 3);
      const row = lines[y];
      const cut = row.splice(row.length - shift, shift);
      lines[y] = cut.concat(row);
    }
    preEl.textContent = lines.map((l) => l.join("")).join("\n");
    setTimeout(() => {
      if (glitchOriginal) preEl.textContent = glitchOriginal;
    }, 80);
  }, 400 + Math.floor(Math.random() * 800));
}

export function setAscii(preEl, art) {
  stopGlitch();
  preEl.textContent = art;
  startGlitch(preEl);
}
