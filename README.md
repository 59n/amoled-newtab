# AMOLED New Tab Page

An ultra-clean, battery-friendly new tab page for Chromium browsers featuring interactive ASCII eyes, live clock, optional search bar, Chrome bookmarks bridge, customizable shortcuts, 12 vibrant OLED presets plus custom hex colors, and rich power tools designed specifically for OLED / AMOLED displays on both desktop and mobile.

![Screenshot](docs/screenshot.png)

## Highlights & Features

- **Interactive ASCII Eyes**:
  - **7 Expression Presets**: Classic, Sleepy, Wide, Squint, Glare, Close-set, Wide-set, plus a dynamic Random-per-tab mode.
  - **5 ASCII Density Ramps**: Classic (`· ~ o x + = * % $ @`), Minimal (`· : * # @`), Blocks (`░ ▒ ▓ █`), Binary (`0 1`), and Matrix (`· ﾊ ﾐ ﾋ ｻ ｼ ﾅ 0 1`).
  - **Pupil Gaze Tracking**: Smooth real-time pointer/touch tracking with configurable blink rates (Normal, Calm, Frequent, Off).
  - **Interactive Reactions**: Natural wandering drift, double-blink on click, averted gaze on right-click, kinetic look reactions on scroll wheel, and idle sleep breathing after 35s of inactivity.
  - **Dizzy Reaction with Toggle**: Rapid mouse shaking causes eyes to wobble and cartoon stars to circle overhead (toggled on/off in Settings).
  - **Responsive Scaling**: Dynamically scales to fit narrow mobile displays with zero clipping.

- **Minimalist Search Bar & Bang Shortcuts (Optional)**:
  - Optional sleek search bar toggled in Settings (press <kbd>/</kbd> anywhere to focus).
  - **Popular Engines & Custom Engine**: Google, DuckDuckGo, Brave, Perplexity, Bing, or a custom search template (`https://kagi.com/search?q=%s`).
  - **Built-in Bang Shortcuts**: Quick prefix navigation like `!gh` (GitHub), `!yt` (YouTube), `!r` (Reddit), `!w` (Wikipedia), `!m` (Google Maps).
  - **Direct URL Routing**: Automatically detects and navigates to entered domain names or full URLs.
  - Configurable option to open search queries in a new tab or current tab.

- **Bookmarks Bridge & Power Tools**:
  - Slide-over Chrome Bookmarks drawer opened via the top bar (`★`) or pressing <kbd>b</kbd>.
  - **Instant Live Search**: Filter through all Chrome bookmark folders and URLs in real time.
  - **Drag-and-Drop to Chips**: Drag any bookmark item directly onto a shortcut chip with glowing target feedback to assign it instantly.
  - **Quick Bookmark Management**: Create new bookmarks with the inline `+ Add` dialog or delete existing bookmarks with a single click.

- **12 AMOLED Color Presets & Custom Hex Picker**:
  - **12 Curated Presets**: Warm White, Cyber Amber, Electric Gold, Magma Orange, Crimson Red, Sunset Rose, Neon Fuchsia, Synthwave Purple, Cobalt Blue, Ice Cyan, Tokyo Mint, and Terminal Green.
  - **Native Color Spectrum Picker**: Pick any custom color using your operating system's color wheel or palette.
  - **Exact Hex Code Input**: Type or paste any 3 or 6-digit hex code (`#00FFCC`, `#FF007F`, etc.).
  - **Dynamic Theme Engine**: Automatically computes complementary bright eye tones, soft phosphor auras, and dim text states.

- **Clean Minimalist Layout & Quote Hiding**:
  - **Toggle Quote Off**: Hide quotes entirely via Settings or right-click menu (`❝ Toggle Quote`) for an ultra-pure display consisting only of eyes, clock, and bookmarks.
  - **Instant Warm Start & Zero Layout Shift (CLS)**: Cached quotes and shortcuts render synchronously before first paint; quote changes are prefetched silently in the background so tabs never twitch or pop in.
  - **Pre-Paint CSS Classes**: Features toggled off in settings are suppressed in `<head>` before DOM paint, eliminating flash of unstyled content (FOUC).
  - Inline discreet quote copy button with visual clipboard confirmation.

- **Ambient Mouse Aura & Shockwaves**:
  - **Cursor & Touch Aura**: Ambient radial phosphor glow tracking the mouse or touch point, illuminated in your active accent color.
  - **Geometric Click Shockwaves**: Expanding concentric shockwave rings on click/tap that dissolve into the pitch-black background.
  - **Dual-Ring Sonar Pulse**: Right-clicking emits a dual-ring accent pulse.

- **Multi-Tier Bulletproof Storage Architecture**:
  - **Tier 1 (Instant)**: Synchronous `localStorage` cache for zero-latency startup and preinit execution.
  - **Tier 2 (Local)**: Fast `chrome.storage.local` backing store with unlimited operations quota.
  - **Tier 3 (Cloud)**: Debounced `chrome.storage.sync` for cross-device synchronization with automatic error catching. Settings are never lost or throttled.

- **Customizable Shortcuts & Global Scaling**:
  - Up to 8 launch chips with automatic favicon resolution, letter badge mode, or text-only mode.
  - Global UI scaling from 70% to 200% with corner zoom buttons and slider.
  - Full configuration backup/restore to JSON.

## Usage & Keyboard Shortcuts

| Shortcut / Control | Action |
| --- | --- |
| <kbd>/</kbd> | Focus search bar (when enabled) |
| <kbd>b</kbd> | Toggle Bookmarks Bridge drawer |
| <kbd>s</kbd> or <kbd>,</kbd> | Open Settings modal |
| <kbd>1</kbd> – <kbd>8</kbd> | Quick-launch shortcuts by index |
| <kbd>Escape</kbd> | Close any open drawer, modal, or context menu |
| **Right-Click** | Context menu (Settings, Toggle Quote, Toggle Glow, Cycle Eyes, New Shortcut) |
| **Mouse Whip / Shake** | Trigger dizzy eye wobble & stars reaction (if enabled) |

## Installation

### Desktop (Chrome, Brave, Edge, Arc)
1. Clone or download this repository.
2. Open `chrome://extensions` in your browser.
3. Enable **Developer mode** in the top-right corner.
4. Click **Load unpacked** and select this directory.
5. Open a new tab to enjoy your AMOLED experience!

### Mobile (Kiwi Browser, Lemur, Orion, or PWA)
- **Extension**: In Kiwi or Lemur Browser on Android (or Orion on iOS), go to Extensions → Developer mode → Load unpacked / zip.
- **Web App / PWA**: Add `newtab.html` to your phone's Home Screen for a full-bleed AMOLED standalone experience.

## Testing

Run the automated test suite using Node's built-in test runner:

```bash
npm test
```

## License

MIT License.
