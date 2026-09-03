# Usage

## Eyes

The framed pair is a fixed ASCII field. It does not change layout when the gaze moves.

| Input | Reaction |
| --- | --- |
| Move the mouse | Pupils follow |
| Idle | Slow drift + periodic blink |
| Scroll wheel | Look up or down, then blink |
| Click the eyes | Double blink |
| Right-click (empty page) | Glance away and squeeze shut |

Native text selection is off. Native context menu is off except in settings text fields. Shortcut chips still open the custom edit menu on right-click.

## Clock

Local timezone, `H:MM:SS AM/PM`, updates every second.

## Quotes

A random quote loads on each new tab (Quotable, then DummyJSON, then cache, then bundled fallback).

Move the cursor near the quote. A small clipboard icon fades in **behind the quote line** (not on the author). Click it to copy:

```
<quote text> — <author>
```

A **Copied** tooltip plays and fades.

## Shortcuts

Defaults on first run:

- YouTube
- GitHub
- Reddit
- Cronometer
- three empty slots

| Action | How |
| --- | --- |
| Open | Left-click a filled chip (same tab) |
| Open in a new tab | Middle-click or ctrl/cmd-click |
| Add | `+ add`, or click an empty slot |
| Edit / clear / delete | Right-click a chip |
| Reorder | Drag chips |
| Full list | ⚙ (top right) |

URLs without a scheme get `https://`. Invalid URLs stay in the editor. Maximum 8 chips.

## Size

`−` / `+` next to ⚙, or **Size** in the settings overlay. Range 70%–200% in 10% steps. Stored with the Chrome profile.

## Keyboard

- `Escape` closes the editor, settings overlay, and chip menu
- Click outside those surfaces also closes them
