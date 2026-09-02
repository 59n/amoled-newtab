# AMOLED New Tab — Design Spec

Chrome Manifest V3 extension that replaces the new tab page with a full-black AMOLED landing page: one glitching photo-to-ASCII piece, a live clock, one random quote, and editable named link chips.

## Goals

- Open a new tab and land on pure black (`#000`), no Chrome NTP, no search bar.
- See one ASCII piece and one quote, both new every tab.
- Jump to frequent sites from chips you can add, edit, reorder, and clear.
- Load unpacked with no build step.

## Non-goals (v1)

- Search box / omnibox clone on the page.
- Theme picker, accent colors, wallpapers.
- Folders, chip colors, custom uploaded icons.
- Clock format settings (12/24h toggle).
- Publishing to the Chrome Web Store.
- Bundler, framework, or npm runtime dependencies.

## Page layout

Centered vertical stack on `#000`:

1. **ASCII frame** — 1px `#2a2a2a` border around a `<pre>` of gray ASCII (`#9a9a9a`). One piece at a time. Never a gallery.
2. **Clock** — local timezone, 12-hour with seconds and AM/PM, e.g. `11:42:50 AM`. Monospace, letter-spaced, updates every second.
3. **Quote** — italic serif line in quotes, author under it in small uppercase tracking. One quote. Truncate display at 140 characters with an ellipsis if longer.
4. **Link chips** — row of pills: favicon (or first letter) + name. Empty slots are dim outlined pills with no label. A dashed `+ add` chip appears only when there are fewer than 8 chips.
5. **⚙** — dim, top-right. Opens the shortcuts overlay.

No page search. Clicking a filled chip navigates the **same tab** to that URL.

## Architecture

Unpacked MV3 extension. No background service worker, no toolbar popup.

| File | Role |
|------|------|
| `manifest.json` | Name: `AMOLED New Tab`. `chrome_url_overrides.newtab` → `newtab.html`. Permissions: `storage`. Host permissions for image + quote APIs (see below). |
| `newtab.html` | Page shell. |
| `newtab.css` | AMOLED layout and glitch keyframes. |
| `newtab.js` | Clock, quote, chips, modals, gear overlay, load orchestration. |
| `ascii.js` | Fetch image, canvas convert, glitch loop, click-to-refresh. |
| `storage.js` | Shortcuts in `chrome.storage.sync`; art/quote cache in `chrome.storage.local`. If `chrome.storage` is missing (opened as a file), use `localStorage`. |
| `icons/` | 16/48/128 extension icons. |
| `fallbacks.json` | Two bundled ASCII strings + two quotes for first-run offline. |

Preview: opening `newtab.html` as a file or via a local static server must still render, using `localStorage` and the same fetch calls (CORS permitting).

## ASCII pipeline

On every new-tab load (in parallel with the quote fetch):

1. `GET https://picsum.photos/800/400.jpg?grayscale` (follow redirect to `fastly.picsum.photos`). Host permissions:
   - `https://picsum.photos/*`
   - `https://fastly.picsum.photos/*`
2. Draw into an offscreen canvas. Target **90 character columns**. Height from aspect ratio, **capped at 40 rows**.
3. Luminance `0.299R + 0.587G + 0.114B` mapped onto ramp ` .:-=+*#%@` (dark → light; page is black so brighter pixels get denser glyphs).
4. Put the string in the framed `<pre>`.
5. Start the glitch loop until the tab is closed or art is refreshed:
   - Opacity flicker (~3s, brief dips).
   - Every 400–1200ms: jitter 1–3% of characters to neighbors on the ramp, and/or shift one random row horizontally by 1–3 characters for ~80ms, then restore.

Clicking the ASCII frame fetches a **new image** and reconverts. Quote does not change on this click.

Cache the last successful ASCII string in `chrome.storage.local` (`artCache`). On fetch/convert failure: use `artCache`, else a random entry from `fallbacks.json`. The frame is never left blank.

## Quote pipeline

On every new-tab load:

1. `GET https://api.quotable.io/quotes/random?maxLength=140`
2. If that fails, `GET https://dummyjson.com/quotes/random` and map `quote`/`author`.
3. Host permissions: `https://api.quotable.io/*`, `https://dummyjson.com/*`.
4. Render `content` (or `quote`) and `author`.

Cache last successful `{ text, author }` as `quoteCache`. On failure: cache, else bundled fallback.

## Shortcuts

### Model

```js
{
  id: string,      // uuid
  name: string,    // "" if empty slot
  url: string      // "" if empty slot
}
```

A chip is **empty** when `name` and `url` are both `""`. Array length is 0–8. If the array is empty, only `+ add` is shown.

### First run (seed only if storage has no `shortcuts` key)

1. YouTube — `https://www.youtube.com`
2. GitHub — `https://github.com`
3. Reddit — `https://www.reddit.com`
4. Cronometer — `https://cronometer.com`
5. empty
6. empty
7. empty

### Chip UI

- **Filled:** favicon from `https://www.google.com/s2/favicons?domain=<host>&sz=32` (plain `<img>`, no extra permission). On error, a square with the first letter of `name`. Label is `name`.
- **Empty:** dim dashed pill, no icon, no text. Click opens the editor for that slot.
- **Click filled:** `location.assign(url)`.
- **Right-click filled:** Edit, Clear (set name/url to `""`, keep the slot), Delete (remove from array). Native context menu is prevented on chips.
- **Right-click empty:** Delete (remove the slot) only.
- **Drag** filled or empty to reorder; persist on drop.
- **`+ add`:** visible iff `shortcuts.length < 8`. Opens the editor and **appends** a new filled chip on save.

### Editor modal

Escape or click-outside closes without saving. Fields: Name, URL. On save:

- Name required (trim). Empty name is invalid for a filled chip.
- URL required. If it has no scheme, prefix `https://`.
- `new URL(url)` must succeed; otherwise do not save, keep the modal open, mark the URL field invalid.

### Gear overlay

Dim ⚙, top-right. Overlay lists all chips (empty ones labeled “empty”). Actions: add (if under cap), edit, clear, delete, reorder (up/down or drag). v1 overlay is **shortcuts only** — no clock/quote toggles. Escape or click-outside closes it.

Persist the array to `chrome.storage.sync` (`shortcuts`) after every successful add/edit/clear/delete/reorder.

## Visual style

- Background `#000`. No gray wash, no gradients on the page.
- ASCII `#9a9a9a`, frame `#2a2a2a`.
- Clock `#c8c8c8`, quote `#7a7a7a`, author `#555`.
- Chips: `#0a0a0a` fill, `#222` border, ~10px radius, label `#8a8a8a`.
- System UI sans for chrome; `ui-monospace` for ASCII and clock; Georgia/serif italic for the quote.
- No scrollbars on a typical laptop viewport; if ASCII hits the 40-row cap it still must fit with chips visible at 1440×900. If it cannot, shrink columns before wrapping the chip row.

## Error handling

| Failure | Behavior |
|---------|----------|
| Image or quote API down | Cached value, then bundled fallback. |
| Favicon 404 | First letter. |
| Invalid URL on save | Stay in modal, invalid state on the URL field. |
| `chrome.storage` write fails | Keep in-memory state for this tab; show a one-line toast “couldn’t save”. |
| Convert throws | Treat as image failure (cache / fallback). |

No blocking spinners. ASCII frame may sit on fallback while a fetch is in flight; do not flash empty.

## Loading the extension

1. `chrome://extensions` → Developer mode → Load unpacked → repo root (the folder that contains `manifest.json`).
2. Open a new tab.

`README.md` documents those two steps only.

## Verification (v1, manual)

Load unpacked and check:

- First run shows YouTube, GitHub, Reddit, Cronometer, three empty slots.
- Each new tab changes ASCII and quote.
- Glitch is visible (flicker and occasional tears).
- Click ASCII → new art, same quote, same chips.
- Click YouTube → same tab goes to YouTube.
- Add / edit / clear / delete / reorder persist across new tabs.
- `+ add` hidden at 8 chips, visible below.
- With network disabled after a successful load: cached or fallback art+quote, chips still work.
- Gear overlay can do the same edits as on-page.

## Success criteria

A new tab is full black, shows one glitching ASCII image, a live clock, one quote, and the chip row. Shortcuts are customizable on the page and in ⚙, and they survive restarts.
