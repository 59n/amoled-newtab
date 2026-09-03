# Install

AMOLED New Tab is an unpacked Chrome extension. It is not on the Chrome Web Store.

## Requirements

- Chromium desktop: Google Chrome, Brave, Edge, Arc, or similar
- Permission to load unpacked extensions (Developer mode)

## Load unpacked

1. Clone or download this repository.
2. Go to `chrome://extensions`.
3. Enable **Developer mode** (top right).
4. Click **Load unpacked**.
5. Select the repository root — the directory that contains `manifest.json`. Do not select `docs/`, `icons/`, or a parent folder.
6. Open a new tab.

Chrome will warn that the extension is unpacked. That is expected.

## After pulling changes

On `chrome://extensions`, click **Reload** on **AMOLED New Tab**. Then open a new tab. Cached eye frames in `localStorage` are versioned; a version bump rebuilds them automatically.

## File preview (optional)

You can open `newtab.html` in a normal tab while iterating on CSS. `chrome.storage` is missing in that mode, so shortcuts fall back to `localStorage`. Quote fetches still need network. Gaze tracking still works.

## Uninstall

`chrome://extensions` → **Remove** on AMOLED New Tab. Synced shortcut data stays in the Chrome profile until you clear extension storage.

## Icons

`scripts/make_icons.py` regenerates `icons/icon{16,48,128}.png` (stdlib only):

```bash
python3 scripts/make_icons.py
```
