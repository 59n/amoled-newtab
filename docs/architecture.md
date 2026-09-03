# Architecture

Manifest V3 extension. `chrome_url_overrides.newtab` points at `newtab.html`. No service worker, no toolbar popup, no build step.

## Modules

| File | Role |
| --- | --- |
| `manifest.json` | Name, new-tab override, `storage`, host permissions for quote APIs |
| `newtab.html` | Shell: eyes root, clock, quote + copy control, chips, modal, overlay |
| `newtab.css` | AMOLED layout, locked eye box (`88ch` × `22em`), chips, settings |
| `newtab.js` | Clock, quotes, copy, chips, drag, modal, gear, zoom |
| `eyes-display.js` | Classic SVG eyes → canvas → ASCII frames, gaze, blink, hidden reactions |
| `storage.js` | `chrome.storage.sync` / `.local` with `localStorage` fallback |
| `ascii.js` | Quote truncation and leftover conversion helpers used by tests |
| `fallbacks.json` | Offline quotes |
| `eyes.js` | Unused procedural generator kept for tests |

## Eyes pipeline

1. Draw an SVG of two eyes (classic proportions only).
2. Rasterize to a small canvas.
3. Map luminance to `· ~ o x + = * % $ @` split into dim/bright layers.
4. Precompute a 9×7 gaze grid plus a blink frame.
5. Cache frames in `localStorage` under a versioned key (`eyes-v21:classic:…`).
6. Each animation tick writes the active layer in place (no opacity swap) so gaze does not flash.

The CSS box is specified in `ch` / `em` so the glyph grid cannot overflow the visible frame.

## Storage keys

| Key | Area | Data |
| --- | --- | --- |
| `shortcuts` | sync | Chip array `{ id, name, url }` |
| `scale` | sync | Zoom factor `0.7`–`2` |
| `quoteCache` | local | Last successful `{ text, author }` |
| `drawnArt` | local | Unused leftover from earlier art experiments |
| `eyes-v21:…` | localStorage | Precomputed eye frames |

Corrupt JSON on the `localStorage` path is treated as a miss; shortcuts reseed to defaults.

## Network

| Host | Why |
| --- | --- |
| `https://api.quotable.io/*` | Primary random quote |
| `https://dummyjson.com/*` | Quote fallback |
| `https://www.google.com/s2/favicons` | Favicons on chips (plain `<img>`, no extra permission) |

No API keys. If both quote hosts fail, the last cached quote or `fallbacks.json` is used.

## Tests

`node --test tests/*.test.js` covers storage helpers, URL normalize, scale clamp, and ASCII utilities. The eye renderer is visual; verify by loading unpacked.
