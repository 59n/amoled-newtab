#!/usr/bin/env bash
# Builds the Safari version of the extension.
#
# 1. Copies the runtime files into dist/safari-extension/ with a Safari-compatible
#    manifest (Safari has no bookmarks API, so that permission is dropped).
# 2. On first run, generates a macOS Xcode wrapper app in safari/ that references
#    dist/safari-extension/ in place, so later runs only need to refresh the files.
# 3. Builds the app with xcodebuild (pass --no-xcode to skip this step).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
EXT_DIR="$ROOT/dist/safari-extension"
PROJECT_DIR="$ROOT/safari"
APP_NAME="AMOLED New Tab"
BUNDLE_ID="com.amolednewtab.AMOLED-New-Tab"

rm -rf "$EXT_DIR"
mkdir -p "$EXT_DIR"

cp "$ROOT"/{newtab.html,newtab.css,newtab.js,preinit.js,storage.js,ascii.js,eyes.js,eyes-display.js,background.js,mouse-nav.js,fallbacks.json} "$EXT_DIR"/
cp -R "$ROOT/icons" "$EXT_DIR/icons"

node -e '
  const fs = require("fs");
  const [src, dest] = process.argv.slice(1);
  const manifest = JSON.parse(fs.readFileSync(src, "utf8"));
  manifest.permissions = manifest.permissions.filter((p) => p !== "bookmarks");
  // Safari draws toolbar icons as template masks, so use a vector house glyph
  // (matching the Safari Home button) instead of the square app icon.
  manifest.action.default_icon = "icons/safari/toolbar-icon.svg";
  // Lets Safari Home button work: set the homepage to https://amoled-newtab.invalid/
  // and background.js redirects it to newtab.html (whose URL changes every launch).
  manifest.permissions.push("webNavigation");
  manifest.host_permissions.push("*://amoled-newtab.invalid/*");
  // Mouse back/forward side buttons on every site (see mouse-nav.js)
  manifest.content_scripts = [
    { matches: ["<all_urls>"], js: ["mouse-nav.js"], all_frames: true, run_at: "document_start" },
  ];
  fs.writeFileSync(dest, JSON.stringify(manifest, null, 2) + "\n");
' "$ROOT/manifest.json" "$EXT_DIR/manifest.json"

echo "Safari extension files written to dist/safari-extension/"

if [ ! -d "$PROJECT_DIR" ]; then
  xcrun safari-web-extension-converter "$EXT_DIR" \
    --project-location "$PROJECT_DIR" \
    --app-name "$APP_NAME" \
    --bundle-identifier "$BUNDLE_ID" \
    --macos-only --swift --no-open --no-prompt
fi

if [ "${1:-}" = "--no-xcode" ]; then
  exit 0
fi

# Sign with an Apple Development certificate when one is available (override with TEAM_ID=...).
# Safari forgets ad-hoc signed ("unsigned") extensions every time it quits.
TEAM_ID="${TEAM_ID:-$(security find-certificate -c "Apple Development" -p 2>/dev/null \
  | openssl x509 -noout -subject 2>/dev/null | sed -n 's/.*OU=\([A-Z0-9]*\).*/\1/p')}"

if [ -n "$TEAM_ID" ]; then
  echo "Signing with Apple Development team $TEAM_ID"
  SIGNING_ARGS=(-allowProvisioningUpdates CODE_SIGN_STYLE=Automatic CODE_SIGN_IDENTITY="Apple Development" DEVELOPMENT_TEAM="$TEAM_ID")
else
  echo "No Apple Development certificate found; building ad-hoc signed (requires Allow Unsigned Extensions)"
  SIGNING_ARGS=(CODE_SIGN_IDENTITY="-")
fi

xcodebuild \
  -project "$PROJECT_DIR/$APP_NAME/$APP_NAME.xcodeproj" \
  -scheme "$APP_NAME" \
  -configuration Release \
  -derivedDataPath "$ROOT/dist/xcode-build" \
  "${SIGNING_ARGS[@]}" \
  build

APP_PATH="$ROOT/dist/xcode-build/Build/Products/Release/$APP_NAME.app"
echo
echo "Built: $APP_PATH"
echo "Open the app once, then enable the extension in Safari > Settings > Extensions."
