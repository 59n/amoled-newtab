// Synchronous pre-paint setup to prevent FOUC / theme flash under Manifest V3 CSP
try {
  const raw = localStorage.getItem("sync:settings");
  if (raw) {
    const s = JSON.parse(raw);
    if (s.theme) document.documentElement.dataset.theme = s.theme;
    if (s.accentColor) {
      if (s.accentColor.startsWith("#")) {
        document.documentElement.dataset.accent = "custom";
        document.documentElement.style.setProperty("--accent-color", s.accentColor);
        let c = s.accentColor.replace(/^#/, "");
        if (c.length === 3) c = c.split("").map((x) => x + x).join("");
        const num = parseInt(c, 16);
        if (!isNaN(num)) {
          const r = (num >> 16) & 255, g = (num >> 8) & 255, b = num & 255;
          const brR = Math.min(255, Math.round(r + (255 - r) * 0.35));
          const brG = Math.min(255, Math.round(g + (255 - g) * 0.35));
          const brB = Math.min(255, Math.round(b + (255 - b) * 0.35));
          document.documentElement.style.setProperty("--accent-bright", `rgb(${brR}, ${brG}, ${brB})`);
          document.documentElement.style.setProperty("--accent-aura", `rgba(${r}, ${g}, ${b}, 0.085)`);
          document.documentElement.style.setProperty("--text-dim", `rgba(${r}, ${g}, ${b}, 0.35)`);
        }
      } else {
        document.documentElement.dataset.accent = s.accentColor;
      }
    }
    if (s.glowEffect) document.documentElement.classList.add("has-glow");
    if (s.scale) document.documentElement.style.setProperty("--page-scale", s.scale);
    if (s.showQuote === false) document.documentElement.classList.add("hide-quote");
    if (s.showZoomControls === false) document.documentElement.classList.add("hide-zoom");
  }
} catch {}
