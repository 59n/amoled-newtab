# Usage

## Eyes

The framed pair is a fixed ASCII field rendered on an OLED-optimized background.

| Input | Reaction |
| --- | --- |
| Move the mouse | Pupils follow cursor (when enabled in settings) |
| Idle | Slow wandering drift + periodic natural blink |
| Scroll wheel | Kinetic scroll reaction; look up or down, then blink |
| Left-click | Double blink + geometric click ripple |
| Right-click (empty page) | Glance away, shut eyes, emit sonar shockwave, and open quick-action menu |

7 customizable eye styles are supported (**Classic**, **Sleepy**, **Wide**, **Squint**, **Glare**, **Close-set**, **Wide-set**, or **Random per tab**) across 5 ASCII density ramps (**Classic**, **Minimal**, **Blocks**, **Binary**, and **Matrix**).

## Ambient Cursor Aura & Click Ripples

- **Cursor Aura**: Soft radial phosphor flashlight tracking pointer coordinates, tinted with your active accent color.
- **Click Ripples**: Smooth geometric shockwave expanding on left-click and dissolving into pure AMOLED black.
- **Sonar Shockwave**: Right-clicking emits an accented dual-ring shockwave.

## Context Menus (Right-Click)

- **Right-click on Empty Space**: Opens a glassmorphic quick-action menu:
  - ⚙️ **Settings**: Open tabbed settings panel
  - 👁️ **Cycle Eyes**: Cycle to the next eye style
  - ✦ **Toggle Glow**: Toggle CRT/phosphor glow on or off
  - ❝ **New Quote**: Fetch a fresh quote
  - ➕ **Add Shortcut**: Create a new shortcut
- **Right-click on Shortcut Chip**: Opens context menu to **Edit Shortcut**, **Clear Slot**, or **Delete Slot**.

## Clock & Date

- Time in 12-hour or 24-hour formats, with an optional seconds toggle.
- Optional date display with multiple formats (**Medium**, **Full**, or **ISO Numeric**).

## Quotes

A random quote loads on each new tab (Quotable, then DummyJSON, then cache, then bundled fallbacks), or switch to **Custom Motto** in settings to display your own quote.

Move the cursor near the quote. A small clipboard icon fades in **directly behind the quote**:

```
<quote text> — <author>
```

Clicking copies the quote and author to the clipboard with an animated **Copied** tooltip.

## Shortcuts

Defaults on first run:

- YouTube
- GitHub
- Reddit
- Cronometer
- three empty slots

| Action | How |
| --- | --- |
| Open | Left-click (current tab or new tab based on settings) |
| Open in a new tab | Middle-click or `Ctrl`/`Cmd`+Click |
| Add | `+ add`, or click an empty slot |
| Edit / clear / delete | Right-click a chip |
| Reorder | Drag and drop chips |
| Full management | Settings > Shortcuts tab |

URLs without a scheme get `https://`. Maximum 8 chips. Icon styles: Favicon, Letter badge, or None.

## Zoom & Scaling

- Global scaling from 70% to 200% in 10% steps.
- Corner `−` / `+` buttons (can be toggled off in settings without losing the `⚙` gear button).
- Settings slider with instant preview.

## Settings & Hotkeys

- `⚙` in the top right corner opens the tabbed settings modal.
- Hotkey <kbd>s</kbd> or <kbd>,</kbd> (or <kbd>Cmd</kbd>/<kbd>Ctrl</kbd> + <kbd>,</kbd>) toggles the settings panel.
- Right-click anywhere on empty space to access settings via context menu.
- `Escape` closes any open modal, menu, or settings overlay.
