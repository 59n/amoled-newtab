# AMOLED New Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship an unpacked Chrome MV3 extension that replaces the new tab page with a full-black AMOLED page: one glitching photo-to-ASCII piece, a live clock, one random quote, and editable named link chips.

**Architecture:** No build step. Extension pages are plain HTML/CSS/ES modules. `storage.js` wraps `chrome.storage` with a `localStorage` fallback. `ascii.js` fetches a grayscale Picsum photo, converts pixels to ASCII, and runs the glitch loop. `newtab.js` owns clock, quotes, chips, modal, context menu, and the gear overlay.

**Tech Stack:** Chrome Manifest V3, vanilla JS (ES modules), CSS, `chrome.storage.sync` / `local`. Node built-in test runner (`node:test`) for pure helpers only — no npm packages. UI verified by loading unpacked.

---

## File map

| File | Responsibility |
|------|----------------|
| `manifest.json` | MV3 new-tab override, `storage` + host permissions |
| `newtab.html` | Shell: ASCII, clock, quote, chips, gear, modal, menu, overlay, toast |
| `newtab.css` | AMOLED layout, chips, modal, glitch keyframes |
| `storage.js` | Defaults, chip helpers, URL normalize, sync/local storage |
| `ascii.js` | Pixel→ASCII, fetch, glitch start/stop, click-to-refresh |
| `newtab.js` | Clock, quotes, chip UI, drag, modal, gear, boot |
| `fallbacks.json` | Two ASCII strings + two quotes |
| `icons/icon16.png` `icon48.png` `icon128.png` | Extension icons |
| `tests/storage.test.js` `tests/ascii.test.js` | Pure-function tests |
| `package.json` | `"type": "module"` so Node can import `.js` tests. No dependencies. |
| `README.md` | Load-unpacked steps only |
| `scripts/make_icons.py` | Writes the three PNGs (run once) |

---

### Task 1: Scaffold the extension shell

**Files:**
- Create: `package.json`
- Create: `manifest.json`
- Create: `newtab.html`
- Create: `newtab.css`
- Create: `README.md`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "amoled-newtab-page",
  "private": true,
  "type": "module"
}
```

- [ ] **Step 2: Create `manifest.json`**

```json
{
  "manifest_version": 3,
  "name": "AMOLED New Tab",
  "version": "1.0.0",
  "description": "AMOLED new tab with glitching ASCII, a clock, a quote, and editable shortcuts.",
  "chrome_url_overrides": {
    "newtab": "newtab.html"
  },
  "permissions": ["storage"],
  "host_permissions": [
    "https://picsum.photos/*",
    "https://fastly.picsum.photos/*",
    "https://api.quotable.io/*",
    "https://dummyjson.com/*"
  ],
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

Icons land in Task 2. Until then, Chrome will warn on load; that is fine.

- [ ] **Step 3: Create `newtab.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>New Tab</title>
  <link rel="stylesheet" href="newtab.css">
</head>
<body>
  <button id="gear" type="button" aria-label="Shortcuts">⚙</button>

  <main>
    <pre id="ascii" aria-label="ASCII art"></pre>
    <time id="clock"></time>
    <blockquote>
      <p id="quote"></p>
      <footer id="author"></footer>
    </blockquote>
    <nav id="chips" aria-label="Shortcuts"></nav>
  </main>

  <div id="modal" class="hidden" role="dialog" aria-modal="true" aria-labelledby="modal-title">
    <div class="modal-card">
      <h2 id="modal-title">Shortcut</h2>
      <label>Name <input id="field-name" type="text" autocomplete="off"></label>
      <label>URL <input id="field-url" type="text" autocomplete="off"></label>
      <p id="modal-error" class="error hidden">Enter a valid URL.</p>
      <div class="modal-actions">
        <button id="modal-cancel" type="button">Cancel</button>
        <button id="modal-save" type="button">Save</button>
      </div>
    </div>
  </div>

  <div id="overlay" class="hidden" role="dialog" aria-modal="true" aria-labelledby="overlay-title">
    <div class="overlay-card">
      <h2 id="overlay-title">Shortcuts</h2>
      <ul id="overlay-list"></ul>
      <button id="overlay-add" type="button">+ add</button>
    </div>
  </div>

  <div id="menu" class="hidden" role="menu"></div>
  <div id="toast" class="hidden" role="status"></div>

  <script type="module" src="newtab.js"></script>
</body>
</html>
```

- [ ] **Step 4: Create `newtab.css`**

```css
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body {
  height: 100%;
  background: #000;
  color: #c8c8c8;
  overflow: hidden;
  font-family: system-ui, -apple-system, sans-serif;
}
body {
  display: flex;
  align-items: center;
  justify-content: center;
}
main {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.1rem;
  max-width: 920px;
  padding: 2rem 1.25rem 3rem;
}
#ascii {
  border: 1px solid #2a2a2a;
  color: #9a9a9a;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 7px;
  line-height: 1.05;
  padding: 12px 14px;
  white-space: pre;
  cursor: pointer;
  min-width: 280px;
  min-height: 80px;
  animation: flicker 3s steps(2, end) infinite;
}
@keyframes flicker {
  0%, 93%, 100% { opacity: 1; }
  95% { opacity: 0.72; }
}
#clock {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.95rem;
  letter-spacing: 0.28em;
  color: #c8c8c8;
}
blockquote {
  text-align: center;
  max-width: 36rem;
}
#quote {
  font-family: Georgia, "Times New Roman", serif;
  font-style: italic;
  font-size: 0.95rem;
  color: #7a7a7a;
  line-height: 1.4;
}
#author {
  margin-top: 0.45rem;
  font-size: 0.68rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #555;
}
#chips {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.45rem;
  margin-top: 0.4rem;
}
.chip {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  border: 1px solid #222;
  background: #0a0a0a;
  color: #8a8a8a;
  border-radius: 10px;
  padding: 0.35rem 0.7rem 0.35rem 0.4rem;
  font-size: 0.78rem;
  text-decoration: none;
  cursor: pointer;
  user-select: none;
}
.chip img, .chip .letter {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  background: #161616;
}
.chip .letter {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.65rem;
  color: #999;
}
.chip.empty {
  border-style: dashed;
  min-width: 2.2rem;
  min-height: 1.7rem;
  padding: 0.35rem 0.85rem;
  opacity: 0.55;
}
.chip.add {
  border-style: dashed;
  color: #555;
}
#gear {
  position: fixed;
  top: 14px;
  right: 16px;
  width: 28px;
  height: 28px;
  border: 1px solid #222;
  background: transparent;
  color: #444;
  border-radius: 50%;
  cursor: pointer;
  font-size: 14px;
}
#gear:hover { color: #888; border-color: #333; }
.hidden { display: none !important; }
#modal, #overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.72);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 20;
}
.modal-card, .overlay-card {
  background: #0a0a0a;
  border: 1px solid #2a2a2a;
  border-radius: 10px;
  padding: 1.1rem 1.2rem;
  width: 320px;
}
.overlay-card { width: 360px; }
.modal-card h2, .overlay-card h2 {
  font-size: 0.95rem;
  font-weight: 500;
  margin-bottom: 0.85rem;
  color: #ddd;
}
.modal-card label {
  display: block;
  font-size: 0.72rem;
  color: #888;
  margin-bottom: 0.65rem;
}
.modal-card input {
  display: block;
  width: 100%;
  margin-top: 0.25rem;
  background: #000;
  border: 1px solid #2a2a2a;
  color: #ccc;
  border-radius: 4px;
  padding: 0.4rem 0.5rem;
}
.modal-card input.invalid { border-color: #a33; }
.modal-actions { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 0.4rem; }
.modal-actions button, #overlay-add {
  background: #111;
  border: 1px solid #333;
  color: #ccc;
  border-radius: 4px;
  padding: 0.35rem 0.7rem;
  cursor: pointer;
  font-size: 0.78rem;
}
.error { color: #c66; font-size: 0.75rem; margin-bottom: 0.5rem; }
#overlay-list { list-style: none; display: flex; flex-direction: column; gap: 0.4rem; margin-bottom: 0.8rem; }
#overlay-list li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  border: 1px solid #1f1f1f;
  border-radius: 4px;
  padding: 0.35rem 0.5rem;
  font-size: 0.8rem;
}
#overlay-list .actions { display: flex; gap: 0.3rem; }
#overlay-list button {
  background: transparent;
  border: 1px solid #2a2a2a;
  color: #888;
  border-radius: 3px;
  padding: 0.15rem 0.35rem;
  cursor: pointer;
  font-size: 0.7rem;
}
#menu {
  position: fixed;
  z-index: 30;
  background: #111;
  border: 1px solid #2a2a2a;
  border-radius: 6px;
  min-width: 120px;
  padding: 0.25rem 0;
  font-size: 0.8rem;
}
#menu button {
  display: block;
  width: 100%;
  text-align: left;
  background: transparent;
  border: 0;
  color: #ccc;
  padding: 0.35rem 0.8rem;
  cursor: pointer;
}
#menu button:hover { background: #1a1a1a; }
#toast {
  position: fixed;
  bottom: 18px;
  left: 50%;
  transform: translateX(-50%);
  background: #111;
  border: 1px solid #333;
  color: #aaa;
  padding: 0.4rem 0.8rem;
  border-radius: 6px;
  font-size: 0.8rem;
  z-index: 40;
}
```

- [ ] **Step 5: Create `README.md`**

```markdown
# AMOLED New Tab

1. Open `chrome://extensions`
2. Enable Developer mode
3. Load unpacked → this folder
4. Open a new tab
```

- [ ] **Step 6: Create a stub `newtab.js` so the module load does not 404**

```js
const clock = document.getElementById("clock");

function formatTime(d) {
  const pad = (n) => String(n).padStart(2, "0");
  let h = d.getHours();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${pad(d.getMinutes())}:${pad(d.getSeconds())} ${ampm}`;
}

function tick() {
  clock.textContent = formatTime(new Date());
}

tick();
setInterval(tick, 1000);
```

- [ ] **Step 7: Open `newtab.html` in a browser**

Run: open the file in Chrome (double-click or `open newtab.html` on macOS).

Expected: full black page, live clock in the center (`H:MM:SS AM/PM`), empty ASCII frame, dim gear top-right. No search bar.

- [ ] **Step 8: Commit**

```bash
git add package.json manifest.json newtab.html newtab.css newtab.js README.md
git commit -m "feat: scaffold AMOLED new tab shell and clock"
```

---

### Task 2: Extension icons

**Files:**
- Create: `scripts/make_icons.py`
- Create: `icons/icon16.png`, `icons/icon48.png`, `icons/icon128.png`

- [ ] **Step 1: Write `scripts/make_icons.py`**

Black PNG with a dark gray square frame (matches the ASCII frame). No extra deps.

```python
import struct, zlib, pathlib

def chunk(tag, data):
    return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xffffffff)

def png(size):
    rows = []
    inset = max(2, size // 8)
    for y in range(size):
        row = [0]
        for x in range(size):
            edge = x < inset or y < inset or x >= size - inset or y >= size - inset
            inner = inset <= x < size - inset and inset <= y < size - inset
            frame = edge and not (inset + 1 <= x < size - inset - 1 and inset + 1 <= y < size - inset - 1)
            if frame and inner:
                row += [0x2A, 0x2A, 0x2A]
            else:
                row += [0, 0, 0]
        rows.append(bytes(row))
    raw = b"".join(rows)
    ihdr = struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0)
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b"")

out = pathlib.Path("icons")
out.mkdir(exist_ok=True)
for s in (16, 48, 128):
    (out / f"icon{s}.png").write_bytes(png(s))
print("wrote icons")
```

- [ ] **Step 2: Generate icons**

```bash
python3 scripts/make_icons.py
```

Expected: `wrote icons` and three files under `icons/`.

- [ ] **Step 3: Commit**

```bash
git add scripts/make_icons.py icons/icon16.png icons/icon48.png icons/icon128.png
git commit -m "feat: add AMOLED extension icons"
```

---

### Task 3: Storage helpers (TDD)

**Files:**
- Create: `storage.js`
- Create: `tests/storage.test.js`

- [ ] **Step 1: Write the failing tests**

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_SHORTCUTS,
  isEmptyChip,
  normalizeUrl,
  loadShortcuts,
  saveShortcuts,
  loadArtCache,
  saveArtCache,
  loadQuoteCache,
  saveQuoteCache,
} from "../storage.js";

test("defaults are four sites plus three empty slots", () => {
  assert.equal(DEFAULT_SHORTCUTS.length, 7);
  assert.equal(DEFAULT_SHORTCUTS[0].name, "YouTube");
  assert.equal(DEFAULT_SHORTCUTS[0].url, "https://www.youtube.com");
  assert.equal(DEFAULT_SHORTCUTS[1].name, "GitHub");
  assert.equal(DEFAULT_SHORTCUTS[1].url, "https://github.com");
  assert.equal(DEFAULT_SHORTCUTS[2].name, "Reddit");
  assert.equal(DEFAULT_SHORTCUTS[2].url, "https://www.reddit.com");
  assert.equal(DEFAULT_SHORTCUTS[3].name, "Cronometer");
  assert.equal(DEFAULT_SHORTCUTS[3].url, "https://cronometer.com");
  assert.equal(DEFAULT_SHORTCUTS.filter(isEmptyChip).length, 3);
});

test("isEmptyChip requires both name and url blank", () => {
  assert.equal(isEmptyChip({ name: "", url: "" }), true);
  assert.equal(isEmptyChip({ name: "x", url: "" }), false);
});

test("normalizeUrl prefixes https and accepts absolute URLs", () => {
  assert.equal(normalizeUrl("youtube.com"), "https://youtube.com/");
  assert.equal(normalizeUrl("https://github.com"), "https://github.com/");
});

test("normalizeUrl rejects empty and garbage", () => {
  assert.throws(() => normalizeUrl(""));
  assert.throws(() => normalizeUrl("http://"));
});

test("loadShortcuts seeds defaults once, then persists edits", async () => {
  globalThis.localStorage = new MapStorage();
  const first = await loadShortcuts();
  assert.equal(first.length, 7);
  first[0] = { ...first[0], name: "YT" };
  await saveShortcuts(first);
  const second = await loadShortcuts();
  assert.equal(second[0].name, "YT");
  assert.equal(second.length, 7);
});

test("art and quote caches round-trip", async () => {
  globalThis.localStorage = new MapStorage();
  assert.equal(await loadArtCache(), null);
  await saveArtCache("@@@");
  assert.equal(await loadArtCache(), "@@@");
  await saveQuoteCache({ text: "hi", author: "x" });
  assert.deepEqual(await loadQuoteCache(), { text: "hi", author: "x" });
});

class MapStorage {
  constructor() { this.m = new Map(); }
  getItem(k) { return this.m.has(k) ? this.m.get(k) : null; }
  setItem(k, v) { this.m.set(k, String(v)); }
}
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
node --test tests/storage.test.js
```

Expected: FAIL (`Cannot find module` / `storage.js` missing).

- [ ] **Step 3: Write `storage.js`**

```js
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
  const raw = localStorage.getItem("sync:" + key);
  return raw ? JSON.parse(raw) : undefined;
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
  const raw = localStorage.getItem("local:" + key);
  return raw ? JSON.parse(raw) : undefined;
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
  await setSync("shortcuts", DEFAULT_SHORTCUTS);
  return DEFAULT_SHORTCUTS.map((c) => ({ ...c }));
}

export async function saveShortcuts(list) {
  await setSync("shortcuts", list);
}

export async function loadArtCache() {
  const v = await getLocal("artCache");
  return typeof v === "string" ? v : null;
}

export async function saveArtCache(art) {
  await setLocal("artCache", art);
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
node --test tests/storage.test.js
```

Expected: PASS, all tests.

- [ ] **Step 5: Commit**

```bash
git add storage.js tests/storage.test.js
git commit -m "feat: add shortcut storage with localStorage fallback"
```

---

### Task 4: Pixel-to-ASCII conversion (TDD)

**Files:**
- Create: `ascii.js`
- Create: `tests/ascii.test.js`

- [ ] **Step 1: Write the failing tests**

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { RAMP, pixelsToAscii, truncateQuote } from "../ascii.js";

function rgba(w, h, fill) {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    data.set(fill, i * 4);
  }
  return data;
}

function glyphs(art) {
  return [...art].filter((c) => c !== "\n");
}

test("black pixels become the darkest ramp char", () => {
  const art = pixelsToAscii(rgba(8, 8, [0, 0, 0, 255]), 8, 8, 8, 8);
  assert.ok(glyphs(art).every((c) => c === RAMP[0]));
});

test("white pixels become the lightest ramp char", () => {
  const art = pixelsToAscii(rgba(8, 8, [255, 255, 255, 255]), 8, 8, 8, 8);
  const last = RAMP[RAMP.length - 1];
  assert.ok(glyphs(art).every((c) => c === last));
});

test("caps rows at maxRows", () => {
  const art = pixelsToAscii(rgba(10, 100, [128, 128, 128, 255]), 10, 100, 10, 4);
  assert.equal(art.split("\n").length, 4);
});

test("truncateQuote caps at 140 with ellipsis", () => {
  assert.equal(truncateQuote("short"), "short");
  const long = "a".repeat(141);
  const out = truncateQuote(long);
  assert.equal(out.length, 140);
  assert.equal(out.endsWith("…"), true);
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
node --test tests/ascii.test.js
```

Expected: FAIL (`Cannot find module '../ascii.js'`).

- [ ] **Step 3: Write conversion helpers in `ascii.js`**

```js
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
```

`charAspect = 0.45` compensates for monospace glyphs being taller than they are wide.

- [ ] **Step 4: Run tests to verify they pass**

```bash
node --test tests/ascii.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add ascii.js tests/ascii.test.js
git commit -m "feat: convert image pixels to ASCII with glitch helpers"
```

---

### Task 5: Fallbacks + ASCII load on the page

**Files:**
- Create: `fallbacks.json`
- Modify: `ascii.js` (add `loadAscii`)
- Modify: `newtab.js`

- [ ] **Step 1: Create `fallbacks.json`**

```json
{
  "art": [
    "  .::::.      .::::.\n ':::::::'  ':::::::'\n  ':::::'    ':::::'\n    ':'        ':'",
    "    .-\"\"-.\n   /      \\\n   |  ..  |\n    \\ -- /\n     '---'"
  ],
  "quotes": [
    { "text": "When you gaze long into an abyss, the abyss also gazes into you.", "author": "Friedrich Nietzsche" },
    { "text": "I have been and still am a seeker.", "author": "Hermann Hesse" }
  ]
}
```

- [ ] **Step 2: Add `loadAscii` to `ascii.js`** (append)

```js
import { loadArtCache, saveArtCache } from "./storage.js";

export async function loadFallbacks() {
  const res = await fetch(new URL("fallbacks.json", import.meta.url));
  return res.json();
}

export async function loadAscii(preEl) {
  const fb = await loadFallbacks();
  const cached = await loadArtCache();
  const show = (art) => setAscii(preEl, art);

  if (cached) show(cached);
  else show(fb.art[Math.floor(Math.random() * fb.art.length)]);

  try {
    const blob = await fetchRandomImage();
    const art = await blobToAscii(blob);
    await saveArtCache(art);
    show(art);
  } catch {
    if (!cached) show(fb.art[Math.floor(Math.random() * fb.art.length)]);
  }
}
```

`ascii.js` already has exports — add the import at the **top** of the file.

- [ ] **Step 3: Wire load + click-to-refresh in `newtab.js`**

Replace `newtab.js` with:

```js
import { loadAscii } from "./ascii.js";

const clock = document.getElementById("clock");
const ascii = document.getElementById("ascii");

function formatTime(d) {
  const pad = (n) => String(n).padStart(2, "0");
  let h = d.getHours();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${pad(d.getMinutes())}:${pad(d.getSeconds())} ${ampm}`;
}

function tick() {
  clock.textContent = formatTime(new Date());
}

tick();
setInterval(tick, 1000);

ascii.addEventListener("click", () => loadAscii(ascii));
loadAscii(ascii);
```

- [ ] **Step 4: Verify in the browser**

Open `newtab.html` (or load unpacked). Expected:

- Frame fills with ASCII (Picsum photo if network works, else bundled eyes/face).
- Characters glitch (tears / flicker).
- Click the frame → new piece.
- Clock still ticks.

If `fetch(fallbacks.json)` fails on `file://`, load unpacked instead — extension pages can fetch extension URLs.

- [ ] **Step 5: Commit**

```bash
git add fallbacks.json ascii.js newtab.js
git commit -m "feat: load photo-to-ASCII with cache and glitch"
```

---

### Task 6: Random quote

**Files:**
- Modify: `newtab.js`

- [ ] **Step 1: Add quote loading to `newtab.js`**

Keep existing clock + ascii code. Add:

```js
import { loadQuoteCache, saveQuoteCache } from "./storage.js";
import { loadAscii, loadFallbacks, truncateQuote } from "./ascii.js";

const quoteEl = document.getElementById("quote");
const authorEl = document.getElementById("author");

function renderQuote(q) {
  quoteEl.textContent = `"${truncateQuote(q.text)}"`;
  authorEl.textContent = q.author || "";
}

async function loadQuote() {
  const fb = await loadFallbacks();
  const cached = await loadQuoteCache();
  if (cached) renderQuote(cached);
  else renderQuote(fb.quotes[0]);

  try {
    let q = null;
    try {
      const r = await fetch("https://api.quotable.io/quotes/random?maxLength=140");
      if (r.ok) {
        const data = await r.json();
        const item = Array.isArray(data) ? data[0] : data;
        q = { text: item.content, author: item.author };
      }
    } catch {}
    if (!q) {
      const r = await fetch("https://dummyjson.com/quotes/random");
      if (!r.ok) throw new Error("quote");
      const data = await r.json();
      q = { text: data.quote, author: data.author };
    }
    q.text = truncateQuote(q.text);
    await saveQuoteCache(q);
    renderQuote(q);
  } catch {
    if (!cached) renderQuote(fb.quotes[Math.floor(Math.random() * fb.quotes.length)]);
  }
}

loadQuote();
```

Clicking ASCII must **not** call `loadQuote`.

- [ ] **Step 2: Verify**

Reload the new tab twice. Expected: quote + uppercase author; text changes between tabs; click ASCII changes art only.

- [ ] **Step 3: Commit**

```bash
git add newtab.js
git commit -m "feat: fetch a random quote with API fallback"
```

---

### Task 7: Render chips from storage

**Files:**
- Modify: `newtab.js`

- [ ] **Step 1: Add chip rendering**

Append to `newtab.js` (keep previous imports and boot). Introduce a `shortcuts` array and `renderChips`:

```js
import {
  loadShortcuts,
  saveShortcuts,
  saveWithToast,
  isEmptyChip,
  newId,
  normalizeUrl,
  loadQuoteCache,
  saveQuoteCache,
} from "./storage.js";

const chipsEl = document.getElementById("chips");
const toastEl = document.getElementById("toast");
const MAX_CHIPS = 8;
let shortcuts = [];

function favicon(url) {
  try {
    return `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=32`;
  } catch {
    return "";
  }
}

function renderChips() {
  chipsEl.replaceChildren();
  for (const chip of shortcuts) {
    const el = document.createElement("button");
    el.type = "button";
    el.className = "chip" + (isEmptyChip(chip) ? " empty" : "");
    el.dataset.id = chip.id;
    if (isEmptyChip(chip)) {
      el.setAttribute("aria-label", "Empty shortcut");
    } else {
      const host = favicon(chip.url);
      if (host) {
        const img = document.createElement("img");
        img.width = 16;
        img.height = 16;
        img.alt = "";
        img.src = host;
        img.addEventListener("error", () => {
          img.replaceWith(letterEl(chip.name));
        });
        el.append(img);
      } else {
        el.append(letterEl(chip.name));
      }
      el.append(chip.name);
    }
    el.addEventListener("click", () => {
      if (isEmptyChip(chip)) openEditor(chip.id);
      else location.assign(chip.url);
    });
    chipsEl.append(el);
  }
  if (shortcuts.length < MAX_CHIPS) {
    const add = document.createElement("button");
    add.type = "button";
    add.className = "chip add";
    add.textContent = "+ add";
    add.addEventListener("click", () => openEditor(null));
    chipsEl.append(add);
  }
}

function letterEl(name) {
  const s = document.createElement("span");
  s.className = "letter";
  s.textContent = (name || "?").slice(0, 1).toUpperCase();
  return s;
}

function openEditor(_id) {
  /* Task 8 */
}

async function bootChips() {
  shortcuts = await loadShortcuts();
  renderChips();
}

bootChips();
```

- [ ] **Step 2: Verify first-run chips**

Reload. Expected: YouTube, GitHub, Reddit, Cronometer, three empty dashed pills, `+ add`. Favicons or first letters. Click YouTube → same tab navigates (when loaded as the extension new tab). Empty click does nothing until Task 8.

- [ ] **Step 3: Commit**

```bash
git add newtab.js
git commit -m "feat: render default shortcut chips"
```

---

### Task 8: Add / edit modal

**Files:**
- Modify: `newtab.js`

- [ ] **Step 1: Implement `openEditor`, save, cancel, Escape, click-outside**

```js
const modal = document.getElementById("modal");
const fieldName = document.getElementById("field-name");
const fieldUrl = document.getElementById("field-url");
const modalError = document.getElementById("modal-error");
const modalTitle = document.getElementById("modal-title");
let editingId = null; // null means append on save

function openEditor(id) {
  editingId = id;
  modalError.classList.add("hidden");
  fieldUrl.classList.remove("invalid");
  const chip = shortcuts.find((c) => c.id === id);
  fieldName.value = chip?.name || "";
  fieldUrl.value = chip?.url || "";
  modalTitle.textContent = chip && !isEmptyChip(chip) ? "Edit shortcut" : "New shortcut";
  modal.classList.remove("hidden");
  fieldName.focus();
}

function closeModal() {
  modal.classList.add("hidden");
  editingId = null;
}

async function persist() {
  await saveWithToast(() => saveShortcuts(shortcuts), toastEl);
}

async function saveEditor() {
  const name = fieldName.value.trim();
  fieldUrl.classList.remove("invalid");
  modalError.classList.add("hidden");
  if (!name) {
    fieldName.focus();
    return;
  }
  let url;
  try {
    url = normalizeUrl(fieldUrl.value);
  } catch {
    fieldUrl.classList.add("invalid");
    modalError.classList.remove("hidden");
    return;
  }
  if (editingId) {
    shortcuts = shortcuts.map((c) => (c.id === editingId ? { ...c, name, url } : c));
  } else {
    if (shortcuts.length >= MAX_CHIPS) return;
    shortcuts = [...shortcuts, { id: newId(), name, url }];
  }
  await persist();
  renderChips();
  closeModal();
}

document.getElementById("modal-save").addEventListener("click", saveEditor);
document.getElementById("modal-cancel").addEventListener("click", closeModal);
modal.addEventListener("click", (e) => {
  if (e.target === modal) closeModal();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !modal.classList.contains("hidden")) closeModal();
});
```

Remove the Task 7 stub `function openEditor(_id) { /* Task 8 */ }`.

- [ ] **Step 2: Verify**

- Click `+ add`, save `example.com` / `Example` → new chip, `https://example.com/` works.
- Save `http://` → modal stays, URL field invalid, error visible.
- Click an empty slot, fill it, save → that slot becomes filled (same id).
- Escape / click dim backdrop closes without save.
- Reload: chips persist.

- [ ] **Step 3: Commit**

```bash
git add newtab.js
git commit -m "feat: add and edit shortcut chips in a modal"
```

---

### Task 9: Context menu, clear, delete, drag reorder

**Files:**
- Modify: `newtab.js`
- Modify: `newtab.css` (already has `#menu`; add `cursor: grab` on `.chip`)

- [ ] **Step 1: CSS tweak**

Add to `newtab.css`:

```css
.chip { cursor: grab; }
.chip.add, .chip.empty { cursor: pointer; }
.chip.dragging { opacity: 0.4; }
```

- [ ] **Step 2: Context menu + drag**

In `renderChips`, after creating each chip `el` (not the add button):

```js
el.draggable = true;
el.addEventListener("contextmenu", (e) => {
  e.preventDefault();
  openMenu(e.clientX, e.clientY, chip);
});
el.addEventListener("dragstart", (e) => {
  e.dataTransfer.setData("text/plain", chip.id);
  el.classList.add("dragging");
});
el.addEventListener("dragend", () => el.classList.remove("dragging"));
el.addEventListener("dragover", (e) => e.preventDefault());
el.addEventListener("drop", async (e) => {
  e.preventDefault();
  const fromId = e.dataTransfer.getData("text/plain");
  const toId = chip.id;
  if (!fromId || fromId === toId) return;
  const from = shortcuts.findIndex((c) => c.id === fromId);
  const to = shortcuts.findIndex((c) => c.id === toId);
  if (from < 0 || to < 0) return;
  const next = shortcuts.slice();
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  shortcuts = next;
  await persist();
  renderChips();
});
```

Menu helpers:

```js
const menu = document.getElementById("menu");

function openMenu(x, y, chip) {
  menu.replaceChildren();
  const item = (label, fn) => {
    const b = document.createElement("button");
    b.type = "button";
    b.role = "menuitem";
    b.textContent = label;
    b.addEventListener("click", () => {
      closeMenu();
      fn();
    });
    menu.append(b);
  };
  if (!isEmptyChip(chip)) {
    item("Edit", () => openEditor(chip.id));
    item("Clear", async () => {
      shortcuts = shortcuts.map((c) => (c.id === chip.id ? { ...c, name: "", url: "" } : c));
      await persist();
      renderChips();
    });
  }
  item("Delete", async () => {
    shortcuts = shortcuts.filter((c) => c.id !== chip.id);
    await persist();
    renderChips();
  });
  menu.classList.remove("hidden");
  menu.style.left = `${x}px`;
  menu.style.top = `${y}px`;
}

function closeMenu() {
  menu.classList.add("hidden");
}

document.addEventListener("click", () => closeMenu());
```

- [ ] **Step 3: Verify**

- Right-click YouTube → Edit / Clear / Delete. Native menu must not appear.
- Clear → dashed empty slot remains.
- Delete → chip gone, `+ add` still correct vs cap.
- Right-click empty → Delete only.
- Drag Reddit before GitHub; reload → order kept.

- [ ] **Step 4: Commit**

```bash
git add newtab.js newtab.css
git commit -m "feat: context menu, clear/delete, and drag-reorder chips"
```

---

### Task 10: Gear overlay

**Files:**
- Modify: `newtab.js`

- [ ] **Step 1: Render overlay list and wire ⚙**

```js
const overlay = document.getElementById("overlay");
const overlayList = document.getElementById("overlay-list");
const overlayAdd = document.getElementById("overlay-add");
const gear = document.getElementById("gear");

function renderOverlay() {
  overlayList.replaceChildren();
  shortcuts.forEach((chip, index) => {
    const li = document.createElement("li");
    const label = document.createElement("span");
    label.textContent = isEmptyChip(chip) ? "empty" : chip.name;
    const actions = document.createElement("div");
    actions.className = "actions";
    const btn = (text, fn) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = text;
      b.addEventListener("click", fn);
      return b;
    };
    if (index > 0) actions.append(btn("up", () => moveChip(chip.id, -1)));
    if (index < shortcuts.length - 1) actions.append(btn("down", () => moveChip(chip.id, 1)));
    if (!isEmptyChip(chip)) {
      actions.append(btn("edit", () => openEditor(chip.id)));
      actions.append(btn("clear", () => clearChip(chip.id)));
    }
    actions.append(btn("×", () => deleteChip(chip.id)));
    li.append(label, actions);
    overlayList.append(li);
  });
  overlayAdd.classList.toggle("hidden", shortcuts.length >= MAX_CHIPS);
}

async function moveChip(id, dir) {
  const i = shortcuts.findIndex((c) => c.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= shortcuts.length) return;
  const next = shortcuts.slice();
  [next[i], next[j]] = [next[j], next[i]];
  shortcuts = next;
  await persist();
  renderChips();
  renderOverlay();
}

async function clearChip(id) {
  shortcuts = shortcuts.map((c) => (c.id === id ? { ...c, name: "", url: "" } : c));
  await persist();
  renderChips();
  renderOverlay();
}

async function deleteChip(id) {
  shortcuts = shortcuts.filter((c) => c.id !== id);
  await persist();
  renderChips();
  renderOverlay();
}

function openOverlay() {
  renderOverlay();
  overlay.classList.remove("hidden");
}
function closeOverlay() {
  overlay.classList.add("hidden");
}

gear.addEventListener("click", openOverlay);
overlayAdd.addEventListener("click", () => openEditor(null));
overlay.addEventListener("click", (e) => {
  if (e.target === overlay) closeOverlay();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeOverlay();
    closeModal();
    closeMenu();
  }
});
```

After a successful `saveEditor`, call `renderOverlay()` as well as `renderChips()` so the list stays current if the overlay is open.

- [ ] **Step 2: Verify**

⚙ opens the list (empty rows labeled “empty”). Add / edit / clear / delete / up / down work and match the page. Escape and backdrop click close. Overlay is shortcuts only.

- [ ] **Step 3: Commit**

```bash
git add newtab.js
git commit -m "feat: add gear overlay for shortcut management"
```

---

### Task 11: Fit check + full spec verification

**Files:**
- Modify: `ascii.js` only if ASCII overflows 1440×900 (lower `COLS` from 90 toward 70).
- Modify: `newtab.css` `#ascii { font-size }` if needed (7px → 6px).

- [ ] **Step 1: Load unpacked**

`chrome://extensions` → Developer mode → Load unpacked → repo root → open a new tab.

- [ ] **Step 2: Run the spec checklist**

| Check | Expected |
|-------|----------|
| Background | `#000`, no search on the page |
| First run chips | YouTube, GitHub, Reddit, Cronometer, 3 empty, `+ add` |
| New tab | New ASCII and new quote |
| Glitch | Flicker + occasional tears |
| Click ASCII | New art, **same** quote and chips |
| Click YouTube | Same tab → YouTube |
| Add / edit / clear / delete / reorder | Persist across new tabs |
| Cap | `+ add` hidden at 8 chips |
| Offline after a successful load | Cached or fallback art+quote; chips still work |
| Gear | Same edits as on-page |
| Clock | Local 12-hour with seconds + AM/PM, ticks |

- [ ] **Step 3: If ASCII + chips overflow at 1440×900**

In `ascii.js` set `export const COLS = 70` (keep `MAX_ROWS = 40`). Re-check. Do not wrap the chip row onto a second page of scroll — `body { overflow: hidden }` stays.

- [ ] **Step 4: Run unit tests once more**

```bash
node --test
```

Expected: all PASS.

- [ ] **Step 5: Commit any fit tweaks**

```bash
git add ascii.js newtab.css
git commit -m "fix: scale ASCII so the chip row stays on screen"
```

Skip this commit if nothing changed.

---

## Spec coverage

| Spec section | Task |
|--------------|------|
| Page layout (ASCII, clock, quote, chips, gear, no search) | 1, 5, 6, 7 |
| MV3 files, storage fallback | 1, 3 |
| Icons | 2 |
| ASCII fetch, 90 cols / 40 rows, ramp, glitch, click refresh, cache | 4, 5 |
| Quote APIs, truncate 140, cache | 4, 6 |
| Defaults (YT/GH/Reddit/Cronometer + 3 empty) | 3, 7 |
| Favicon / letter, empty slots, + add cap 8 | 7, 8 |
| Modal validation, Escape / click-outside | 8 |
| Right-click edit/clear/delete, drag reorder | 9 |
| Gear overlay, shortcuts only | 10 |
| Errors: API / favicon / bad URL / storage toast | 3, 5, 6, 8 |
| README load unpacked | 1 |
| 1440×900 fit | 11 |
| Manual verification | 11 |

Out of scope left out: search, themes, clock settings, Web Store, bundlers.
