# AMOLED New Tab Page

An ultra-clean, battery-friendly new tab page for Chromium browsers featuring animated ASCII eyes, live clock, inspirational quotes, configurable shortcuts, custom themes, and rich customization designed specifically for OLED / AMOLED displays on both desktop and mobile.

![Screenshot](docs/screenshot.png)

## Highlights & Features

- **Interactive ASCII Eyes**:
  - 7 unique eye style expressions: **Classic**, **Sleepy**, **Wide**, **Squint**, **Glare**, **Close-set**, **Wide-set**, plus a **Random per tab** mode.
  - 5 ASCII density ramps: **Classic** (`· ~ o x + = * % $ @`), **Minimal** (`· : * # @`), **Blocks** (`░ ▒ ▓ █`), **Binary** (`0 1`), and **Matrix** (`· ﾊ ﾐ ﾋ ｳ ｼ ﾅ 0 1`).
  - Gaze tracking: Pupils track cursor movement or touch position smoothly in real-time (optional toggle).
  - Natural animations: Configurable blink rates (**Normal**, **Calm**, **Frequent**, or **Off**), natural idle wandering drift, and double-blink on tap/click.
  - Reactive gaze: Averts gaze and squeezes shut on right-click / long-press; looks up/down on scroll-wheel events.
  - Responsive ASCII scaling: Dynamically scales down to fit narrow mobile displays with zero clipping.
- **Fully Responsive & Mobile-Ready**:
  - **Fluid Layout**: Designed from 320px mobile widths up to 4K ultra-wide monitors.
  - **Safe-Area Notch Insets**: Full support for `viewport-fit=cover`, dynamic islands, camera hole-punches, and translucent status bars.
  - **Mobile Touch Gestures**: Touch tracking for eyes and cursor aura, tap ripples, and **long-press** to open the animated context menu with haptic feedback.
  - **Bottom-Sheet Settings**: On mobile viewports, the tabbed settings modal smoothly transforms into an ergonomic bottom sheet with iOS auto-zoom prevention.
  - **Mobile Extension & PWA Ready**: Compatible with mobile Chromium browsers that support extensions (Kiwi Browser, Lemur Browser, Orion iOS) and can be pinned as a standalone PWA.
- **Ambient Mouse Aura & Click Shockwaves**:
  - **Cursor & Touch Aura**: A soft, ethereal radial phosphor glow tracking the mouse or touch point, dynamically illuminated in your current theme's accent color.
  - **Geometric Click Ripples**: Smooth animated shockwave rings on click/tap that expand and dissolve into the deep black background.
  - **Accent Sonar Pulse**: Right-clicking emits a dual-ring glowing accent shockwave.
- **Animated Context Menu (Right-Click & Long-Press)**:
  - Glassmorphic translucent dark menu with smooth micro-bloom spring animation.
  - Quick actions on empty space: Open Settings, Cycle Eye Expressions, Toggle CRT Glow, Refresh Quote, Add Shortcut.
  - Contextual shortcut actions: Edit, Clear Slot, Delete.
- **Kinetic Scroll Dynamics & Custom Scrollbars**:
  - Elastic kinetic spring displacement on mouse wheel scroll with smooth recovery.
  - Custom slim AMOLED dark scrollbars across all modals and settings.
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
  - Discreet inline copy button right behind the quote with visual "Copied" feedback.
- **Customizable Shortcuts**:
  - Up to 8 launch chips with automatic favicon resolution, letter badge mode, or text-only mode.
  - Drag-and-drop reordering (and arrow reordering in settings for mobile).
  - Optional "Open in new tab" left-click toggle.
  - Context menu to edit, clear, or delete.
  - Modal editor with automatic `https://` prefixing and URL validation.
- **Custom Zoom & Scaling**:
  - Global scaling from 70% to 200% in 10% steps via settings slider or corner `−`/`+` buttons (with toggle to hide corner buttons).
  - Preferences persisted across sessions via `chrome.storage.sync`.
- **Comprehensive Tabbed Settings Panel**:
  - Accessible via the gear icon (`⚙`) in the top right, pressing <kbd>s</kbd> or <kbd>,</kbd>, or right-clicking / long-pressing empty space.
  - Organized tabs: **Appearance**, **Eyes**, **Clock & Quote**, **Shortcuts**, and **Data**.
  - Backup & Restore: Export configuration to JSON, import backups, and reset to defaults.
  - Keyboard accessible (`Escape` closes all modals, menus, and overlays).

## Installation

### Desktop (Chrome, Brave, Edge, Arc)
1. Clone or download this repository.
2. Open your Chromium browser and navigate to `chrome://extensions`.
3. Enable **Developer mode** in the top right corner.
4. Click **Load unpacked** and select the repository root directory (containing `manifest.json`).
5. Open a new tab to start using the extension.

### Mobile (Kiwi Browser, Lemur, Orion, or PWA)
- **Extension**: In Kiwi or Lemur Browser on Android (or Orion on iOS), go to Extensions → Developer mode → Load unpacked / zip.
- **Web App / PWA**: Add `newtab.html` to your phone's Home Screen for a full-bleed AMOLED standalone experience.

> For detailed installation guidance, see [docs/install.md](docs/install.md).

## Usage & Controls

| Component | Control / Gesture | Action |
| --- | --- | --- |
| **Eyes** | Mouse move / Touch drag | Pupils follow cursor or touch position |
| | Idle | Natural wandering & periodic blink |
| | Scroll wheel | Kinetic scroll reaction, looks up/down then blinks |
| | Tap / Left-click | Double blink & geometric click ripple |
| | Right-click / Long-press | Averts gaze, sonar shockwave, opens sleek context menu |
| **Cursor Aura** | Mouse move / Touch drag | Soft accent-colored phosphor aura illuminates touch/pointer |
| **Quote** | Hover / Touch near quote | Reveals discreet copy icon right behind quote |
| | Tap / Click copy icon | Copies `<quote> — <author>` to clipboard |
| **Shortcuts** | Tap / Left-click | Open link (current tab or new tab based on settings) |
| | Middle-click / `Ctrl`/`Cmd`+Click | Open link in new tab |
| | Drag & drop / Up-Down buttons | Reorder chips |
| | Right-click / Long-press | Open animated context menu (Edit, Clear, Delete) |
| | `+ add` button | Add a new shortcut |
| **Background** | Right-click / Long-press | Quick actions menu (Settings, Cycle Eyes, Toggle Glow, New Quote) |
| **Zoom** | `−` / `+` buttons | Adjust scale by 10% |
| | Settings slider | Fine-tune zoom between 70% and 200% |
| **Settings** | `⚙` (top-right) | Open tabbed settings modal / bottom sheet |
| | Hotkey <kbd>s</kbd> or <kbd>,</kbd> | Toggle settings modal |
| **General** | `Escape` key | Close any open modal, menu, or overlay |

> For more details on usage, see [docs/usage.md](docs/usage.md).

## Architecture & Tech Stack

Built strictly with vanilla Manifest V3 standards—no bundlers, no build steps, and no third-party runtime dependencies:

```
├── manifest.json       # Chrome Manifest V3 configuration & permissions
├── background.js       # Service worker for extension action button
├── preinit.js          # Synchronous CSP-compliant pre-paint script
├── newtab.html         # Responsive DOM shell with mobile meta & safe-area support
├── newtab.css          # Responsive AMOLED styling, bottom sheet, aura, ripples
├── newtab.js           # Clock, quote, shortcuts, long-press, touch tracking, sync
├── eyes-display.js     # Multi-variant ASCII eye animation engine with touch gaze
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

## License

MIT License. Feel free to customize and enjoy your AMOLED new tab experience!
