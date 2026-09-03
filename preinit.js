// Synchronous pre-paint setup to prevent FOUC / theme flash under Manifest V3 CSP
try {
  const raw = localStorage.getItem("sync:settings");
  if (raw) {
    const s = JSON.parse(raw);
    if (s.theme) document.documentElement.dataset.theme = s.theme;
    if (s.accentColor) document.documentElement.dataset.accent = s.accentColor;
    if (s.glowEffect) document.documentElement.classList.add("has-glow");
    if (s.scale) document.documentElement.style.setProperty("--page-scale", s.scale);
    if (s.showQuote === false) document.documentElement.classList.add("hide-quote");
    if (s.showZoomControls === false) document.documentElement.classList.add("hide-zoom");
  }
} catch {}
