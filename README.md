# AMOLED New Tab

A clean, true-black (`#000000`) new-tab extension for Chromium browsers featuring an interactive pair of ASCII eyes that track your cursor, a live clock, curated inspirational quotes, and customizable shortcut chips.

Zero dependencies. Zero tracking. Pure vanilla web technologies.

![AMOLED New Tab Preview](assets/preview.png)

## Features

- **Interactive ASCII Eyes**: 
  - Dynamic gaze tracking: Pupil position follows the cursor across a precomputed 9×7 gaze grid.
  - Natural animations: Periodic blinks, natural idle wandering drift, and double-blink on click.
  - Reactive gaze: Averts gaze and squeezes shut on right-click; looks up/down on scroll-wheel events.
  - Glitch-free rendering: Precomputed SVG rasterization mapped to an ASCII density ramp (`· ~ o x + = * % $ @`) rendered with dual-layer buffers to eliminate flicker.
- **Live Clock**: 12-hour format with seconds (`H:MM:SS AM/PM`) updated in real-time.
- **Inspirational Quotes**:
  - Fetches random quotes from [Quotable](https://api.quotable.io) with fallback to [DummyJSON](https://dummyjson.com).
  - Cached locally with bundled offline fallbacks (`fallbacks.json`).
  - Subtle hover-activated copy button behind the quote text with visual "Copied" feedback.
- **Customizable Shortcuts**:
  - Up to 8 launch chips with automatic favicon resolution (defaults: YouTube, GitHub, Reddit, Cronometer).
  - Drag-and-drop reordering.
  - Left-click to open in the same tab; middle-click / `Cmd`/`Ctrl`+click to open in a new tab.
  - Right-click context menu to edit, clear, or delete.
  - Modal editor with automatic `https://` prefixing and URL validation.
- **Custom Zoom & Scaling**:
  - Global scaling from 70% to 200% in 10% steps via top-right `−`/`+` buttons or the settings slider.
  - Preferences persisted across sessions via `chrome.storage.sync`.
- **Minimalist Settings Panel**:
  - Accessible via the gear icon (`⚙`) in the top right.
  - Manage shortcut order (up/down), edit, clear, delete, or add new shortcuts.
  - Keyboard accessible (`Escape` closes all modals, menus, and overlays).

## Installation

1. Clone or download this repository.
2. Open your Chromium browser (Chrome, Brave, Edge, Arc) and navigate to `chrome://extensions`.
3. Enable **Developer mode** in the top right corner.
4. Click **Load unpacked** and select the repository root directory (containing `manifest.json`).
5. Open a new tab to start using the extension.

> For detailed installation guidance, see [docs/install.md](docs/install.md).

## Usage & Controls

| Component | Control / Gesture | Action |
| --- | --- | --- |
| **Eyes** | Mouse move | Pupils follow cursor |
| | Idle | Natural wandering & periodic blink |
| | Scroll wheel | Looks up or down then blinks |
| | Left-click | Double blink |
| | Right-click | Averts gaze and closes eyes |
| **Quote** | Hover near quote | Reveals discreet copy icon |
| | Click copy icon | Copies `<quote> — <author>` to clipboard |
| **Shortcuts** | Left-click | Open link in current tab |
| | Middle-click / `Ctrl`/`Cmd`+Click | Open link in new tab |
| | Drag & drop | Reorder chips |
| | Right-click | Open context menu (Edit, Clear, Delete) |
| | `+ add` button | Add a new shortcut |
| **Zoom** | `−` / `+` buttons | Adjust scale by 10% |
| | Settings slider | Fine-tune zoom between 70% and 200% |
| **Settings** | `⚙` (top-right) | Open full shortcut manager & zoom controls |
| **General** | `Escape` key | Close any open modal, menu, or overlay |

> For more details on usage, see [docs/usage.md](docs/usage.md).

## Architecture & Tech Stack

Built strictly with vanilla Manifest V3 standards—no bundlers, no build steps, and no third-party runtime dependencies:

```
├── manifest.json       # Chrome Manifest V3 configuration & permissions
├── newtab.html         # Clean DOM shell (eyes, clock, quote, shortcuts, modals)
├── newtab.css          # Pure AMOLED (#000000) styling & responsive layout
├── newtab.js           # Clock, quote fetching, copy tool, chip logic, zoom
├── eyes-display.js     # Canvas-rasterized SVG to ASCII eye animation engine
├── storage.js          # chrome.storage.sync & chrome.storage.local with localStorage fallbacks
├── ascii.js            # Quote truncation and character processing utilities
├── fallbacks.json      # Bundled offline fallback quotes
├── icons/              # Extension icons (16px, 48px, 128px)
├── scripts/            # Helper scripts (e.g. icon generation)
└── tests/              # Unit tests with Node's built-in test runner
```

> See [docs/architecture.md](docs/architecture.md) for deep-dive technical details.

## Testing

Tests run using Node's built-in test runner (Node 18+ required):

```bash
npm test
```

or directly:

```bash
node --test tests/*.test.js
```

## Privacy & Security

- **Zero telemetry & zero analytics**: No data is collected or transmitted to first-party servers.
- **Minimal permissions**: Requests only `storage` permission and host permissions for quote fetching APIs.
- **Local persistence**: Shortcuts, custom zoom levels, and cached quotes stay on your machine (or sync via your personal Chrome profile).
- **Public endpoints only**: Queries public, non-authenticated quote APIs (`api.quotable.io`, `dummyjson.com`) and Google's public favicon service.

> Read the full privacy declaration at [docs/privacy.md](docs/privacy.md).

## License

This project is open source and available under the [MIT License](LICENSE).
