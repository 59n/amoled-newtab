# Privacy

This extension does not include a backend, telemetry, or accounts.

## What stays on the machine

- Shortcut list and zoom in `chrome.storage.sync` (follows the Chrome profile) or `localStorage` when the page is opened as a file
- Last quote and precomputed eye frames in local storage

## What leaves the machine

- Quote requests to `api.quotable.io` and, if that fails, `dummyjson.com`
- Favicon requests to Google’s public favicon endpoint when a chip is rendered

Those hosts see a normal HTTPS fetch from the browser. This project does not send extension identifiers, shortcut URLs, or quotes to any first-party server.

## Secrets

There are none. No `.env`, no tokens, no paid APIs. If you fork the project, do not commit credentials; `.gitignore` already excludes `.env`, `*.pem`, and `secrets/`.

## Permissions

| Permission | Reason |
| --- | --- |
| `storage` | Persist shortcuts and zoom |
| Host access to the two quote APIs | Fetch a random quote |

The extension cannot read other tabs.
