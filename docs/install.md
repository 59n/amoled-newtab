# Install & Setup

AMOLED New Tab is an unpacked Manifest V3 Chromium extension and progressive mobile web page.

## Desktop Requirements & Installation

- **Browsers**: Google Chrome, Brave, Microsoft Edge, Arc, Opera, Vivaldi
- **Requirement**: Developer mode enabled in extension management

1. Clone or download this repository.
2. Navigate to `chrome://extensions` (or `brave://extensions`, `edge://extensions`).
3. Enable **Developer mode** toggle in the top-right corner.
4. Click **Load unpacked**.
5. Select the repository root folder (the folder containing `manifest.json`).
6. Open a new tab to see your AMOLED page!

## Mobile Installation (Android & iOS)

AMOLED New Tab is fully responsive and touch-optimized for mobile phones and tablets:

### Method 1: Mobile Chromium Extension (Kiwi Browser / Lemur Browser / Orion)
1. Transfer or download the repository folder to your mobile device (or download as a `.zip` and extract).
2. In **Kiwi Browser** or **Lemur Browser** (Android), or **Orion Browser** (iOS / iPadOS):
   - Tap menu (`⋮`) → **Extensions**.
   - Toggle **Developer mode** on.
   - Tap **+(from .zip/crx/userdir)** or **Load unpacked** and select the folder or zip.
3. Open a new tab!

### Method 2: Home Screen Web App / PWA
You can also run AMOLED New Tab directly in any mobile browser (Safari, Chrome Mobile, Firefox Mobile) without an extension manager:
1. Host the folder on any static host (GitHub Pages, Cloudflare Pages, Vercel) or run locally.
2. Open `newtab.html` in your mobile browser.
3. Tap **Share** (iOS) or **Menu** (Android) → **Add to Home Screen**.
4. The web app launches in full-bleed AMOLED standalone mode with black translucent status bar support!

## After Pulling Changes

On `chrome://extensions`, click the **Reload** icon on **AMOLED New Tab**. Then open a new tab.

## Testing & Verification

Run the built-in test suite:

```bash
npm test
```
