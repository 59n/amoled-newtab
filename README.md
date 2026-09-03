# AMOLED New Tab

A clean, true-black (`#000000`) new-tab extension for Chromium browsers featuring an interactive pair of ASCII eyes that track your cursor, a live clock, curated inspirational quotes, customizable shortcut chips, and an advanced tabbed customization suite.

Zero dependencies. Zero tracking. Pure vanilla web technologies.

![AMOLED New Tab Preview](assets/preview.png)

## Features

- **Interactive ASCII Eyes**: 
  - Dynamic gaze tracking: Pupil position follows the cursor across a precomputed 9×7 gaze grid (can be toggled on/off).
  - Multiple eye styles: Choose from **Classic**, **Sleepy**, **Wide**, **Squint**, **Glare**, **Close-set**, **Wide-set**, or **Random per tab**.
  - Density ramps: Switch between **Classic** (`· ~ o x + = * % $ @`), **Minimal** (`· : * # @`), **Blocks** (`░ ▒ ▓ █`), **Binary** (`0 1`), or **Matrix Katakana** (`· ﾊ ﾐ ﾋ ｳ ｼ ﾅ 0 1`).
  - Natural animations: Configurable blink rates (**Normal**, **Calm**, **Frequent**, or **Off**), natural idle wandering drift, and double-blink on click.
  - Reactive gaze: Averts gaze and squeezes shut on right-click; looks up/down on scroll-wheel events.
  - Dual-layer rendering to eliminate flicker.
- **Themes & Accent Colors**:
  - Background themes: **Pure AMOLED Black** (`#000000`), **Midnight Charcoal**, **Abyss Navy**, or **Matrix Dark**.
  - Vibrant accent color tints: **Warm White**, **Cyber Amber**, **Terminal Green**, **Ice Cyan**, **Synthwave Purple**, and **Sunset Rose**.
  - Phosphor / CRT Glow: Subtle neon luminescence on eyes and clock.
- **Live Clock & Date**:
  - 12-hour or 24-hour time formats.
  - Optional seconds counter toggle.
  - Optional date display with multiple formats (**Medium**, **Full**, or **ISO Numeric**).
- **Inspirational Quotes & Custom Mottos**:
  - Fetches random quotes from [Quotable](https://api.quotable.io) or [DummyJSON](https://dummyjson.com) with offline fallbacks (`fallbacks.json`).
  - Custom Motto mode: Set your own personal motto and author text.
  - Discreet copy button with visual "Copied" feedback.
- **Customizable Shortcuts**:
  - Up to 8 launch chips with automatic favicon resolution, letter badge mode, or text-only mode.
  - Drag-and-drop reordering.
  - Optional "Open in new tab" left-click toggle.
  - Context menu to edit, clear, or delete.
  - Modal editor with automatic `https://` prefixing and URL validation.
- **Custom Zoom & Scaling**:
  - Global scaling from 70% to 200% in 10% steps via settings slider or corner `−`/`+` buttons (with toggle to hide corner buttons).
  - Preferences persisted across sessions via `chrome.storage.sync`.
- **Comprehensive Tabbed Settings Panel**:
  - Accessible via the gear icon (`⚙`) in the top right.
  - Organized tabs: **Appearance**, **Eyes**, **Clock & Quote**, **Shortcuts**, and **Data**.
  - Backup & Restore: Export configuration to JSON, import backups, and reset to defaults.
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
| **Eyes** | Mouse move | Pupils follow cursor (when enabled) |
| | Idle | Natural wandering & periodic blink |
| | Scroll wheel | Looks up or down then blinks |
| | Left-click | Double blink |
| | Right-click | Averts gaze and closes eyes |
| **Quote** | Hover near quote | Reveals discreet copy icon |
| | Click copy icon | Copies `<quote> — <author>` to clipboard |
| **Shortcuts** | Left-click | Open link (current tab or new tab based on settings) |
| | Middle-click / `Ctrl`/`Cmd`+Click | Open link in new tab |
| | Drag & drop | Reorder chips |
| | Right-click | Open context menu (Edit, Clear, Delete) |
| | `+ add` button | Add a new shortcut |
| **Zoom** | `−` / `+` buttons | Adjust scale by 10% |
| | Settings slider | Fine-tune zoom between 70% and 200% |
| **Settings** | `⚙` (top-right) | Open tabbed settings modal |
| **General** | `Escape` key | Close any open modal, menu, or overlay |

> For more details on usage, see [docs/usage.md](docs/usage.md).

## Architecture & Tech Stack

Built strictly with vanilla Manifest V3 standards—no bundlers, no build steps, and no third-party runtime dependencies:

```
├── manifest.json       # Chrome Manifest V3 configuration & permissions
├── newtab.html         # Clean DOM shell (eyes, clock, quote, shortcuts, modals)
├── newtab.css          # AMOLED styling, themes, glow effects, tabbed settings
├── newtab.js           # Clock, quote logic, shortcuts, settings synchronization
├── eyes-display.js     # Multi-variant & density-ramp ASCII eye animation engine
├── storage.js          # Settings & shortcuts persistence with chrome.storage.sync
├── ascii.js            # Text utilities & legacy ASCII functions
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
