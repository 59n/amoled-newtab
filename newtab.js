import {
  loadShortcuts,
  saveShortcuts,
  saveWithToast,
  isEmptyChip,
  newId,
  normalizeUrl,
  loadQuoteCache,
  saveQuoteCache,
  loadSettings,
  saveSettings,
  DEFAULT_SETTINGS,
  DEFAULT_SHORTCUTS,
  clampScale,
  SCALE_STEP,
} from "./storage.js";
import { loadFallbacks, truncateQuote } from "./ascii.js";
import { EyesDisplay } from "./eyes-display.js";

const clock = document.getElementById("clock");
const dateEl = document.getElementById("date");
const clockContainer = document.getElementById("clock-container");
const ascii = document.getElementById("ascii");
const quoteBlock = document.getElementById("quote-block");
const quoteEl = document.getElementById("quote");
const authorEl = document.getElementById("author");
const copyBtn = document.getElementById("copy-quote");
const copyTip = document.getElementById("copy-tip");
const chipsEl = document.getElementById("chips");
const toastEl = document.getElementById("toast");
const menu = document.getElementById("menu");
const modal = document.getElementById("modal");
const overlay = document.getElementById("overlay");
const overlayClose = document.getElementById("overlay-close");
const overlayList = document.getElementById("overlay-list");
const overlayAdd = document.getElementById("overlay-add");
const gear = document.getElementById("gear");
const zoomControls = document.getElementById("zoom-controls");
const zoomOut = document.getElementById("zoom-out");
const zoomIn = document.getElementById("zoom-in");
const scaleDown = document.getElementById("scale-down");
const scaleUp = document.getElementById("scale-up");
const scaleRange = document.getElementById("scale-range");
const scaleLabel = document.getElementById("scale-label");

// Settings controls
const settingTheme = document.getElementById("setting-theme");
const accentSwatches = document.querySelectorAll("#accent-swatches .color-swatch-btn");
const settingGlow = document.getElementById("setting-glow");
const settingShowZoom = document.getElementById("setting-show-zoom");
const settingShowEyes = document.getElementById("setting-show-eyes");
const settingEyeVariant = document.getElementById("setting-eye-variant");
const settingEyeRamp = document.getElementById("setting-eye-ramp");
const settingEyeFollow = document.getElementById("setting-eye-follow");
const settingEyeBlink = document.getElementById("setting-eye-blink");
const settingShowClock = document.getElementById("setting-show-clock");
const settingTimeFormat = document.getElementById("setting-time-format");
const settingShowSeconds = document.getElementById("setting-show-seconds");
const settingShowDate = document.getElementById("setting-show-date");
const settingDateFormat = document.getElementById("setting-date-format");
const rowDateFormat = document.getElementById("row-date-format");
const settingShowQuote = document.getElementById("setting-show-quote");
const settingQuoteMode = document.getElementById("setting-quote-mode");
const customQuoteFields = document.getElementById("custom-quote-fields");
const settingCustomText = document.getElementById("setting-custom-text");
const settingCustomAuthor = document.getElementById("setting-custom-author");
const settingShowShortcuts = document.getElementById("setting-show-shortcuts");
const settingOpenNewTab = document.getElementById("setting-open-new-tab");
const settingIconStyle = document.getElementById("setting-icon-style");
const btnExport = document.getElementById("btn-export");
const fileImport = document.getElementById("file-import");
const btnReset = document.getElementById("btn-reset");

let settings = { ...DEFAULT_SETTINGS };
let shortcuts = [];
let eyesDisplay = null;
let toastTimeout = null;
let currentQuote = { text: "", author: "" };
const MAX_CHIPS = 8;

function showToast(msg, duration = 2200) {
  if (!toastEl) return;
  toastEl.textContent = msg;
  toastEl.classList.remove("hidden");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toastEl.classList.add("hidden"), duration);
}

// -------------------------------------------------------------
// Clock & Date
// -------------------------------------------------------------
function formatTime(d) {
  const pad = (n) => String(n).padStart(2, "0");
  let h = d.getHours();
  let timeStr = "";

  if (settings.timeFormat === "24h") {
    timeStr = pad(h) + ":" + pad(d.getMinutes());
    if (settings.showSeconds) {
      timeStr += ":" + pad(d.getSeconds());
    }
  } else {
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    timeStr = h + ":" + pad(d.getMinutes());
    if (settings.showSeconds) {
      timeStr += ":" + pad(d.getSeconds());
    }
    timeStr += " " + ampm;
  }
  return timeStr;
}

function formatDate(d) {
  if (settings.dateFormat === "numeric") {
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
  if (settings.dateFormat === "full") {
    return d.toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function tick() {
  const now = new Date();
  if (settings.showClock) {
    clock.textContent = formatTime(now);
    clock.classList.remove("hidden");
  } else {
    clock.classList.add("hidden");
  }

  if (settings.showDate) {
    dateEl.textContent = formatDate(now);
    dateEl.classList.remove("hidden");
  } else {
    dateEl.classList.add("hidden");
  }

  clockContainer.classList.toggle("hidden", !settings.showClock && !settings.showDate);
}

// -------------------------------------------------------------
// Quotes
// -------------------------------------------------------------
function renderQuote(q) {
  currentQuote = { text: q.text || "", author: q.author || "" };
  quoteEl.textContent = `"${truncateQuote(currentQuote.text)}"`;
  authorEl.textContent = currentQuote.author;
}

function setupQuoteCopy() {
  if (!quoteBlock || !copyBtn || !copyTip) return;

  window.addEventListener("mousemove", (e) => {
    const r = quoteBlock.getBoundingClientRect();
    const pad = 80;
    const near =
      e.clientX >= r.left - pad &&
      e.clientX <= r.right + pad &&
      e.clientY >= r.top - pad &&
      e.clientY <= r.bottom + pad;
    quoteBlock.classList.toggle("is-near", near);
  });

  copyBtn.addEventListener("click", async () => {
    const line = currentQuote.author
      ? `${currentQuote.text} — ${currentQuote.author}`
      : currentQuote.text;
    try {
      await navigator.clipboard.writeText(line);
    } catch {
      return;
    }
    copyTip.classList.remove("is-on");
    void copyTip.offsetWidth;
    copyTip.classList.add("is-on");
  });
}

async function loadQuote() {
  if (settings.quoteMode === "custom") {
    renderQuote({
      text: settings.customQuoteText || "Simplicity is the ultimate sophistication.",
      author: settings.customQuoteAuthor || "Leonardo da Vinci",
    });
    return;
  }

  const fb = await loadFallbacks();
  const cached = await loadQuoteCache();
  if (cached) renderQuote(cached);
  else renderQuote(fb.quotes[0]);

  try {
    let q = null;
    try {
      const r = await fetch("https://api.quotable.io/quotes/random?maxLength=140");
      if (r.ok) {
        const data = await r.json();
        const item = Array.isArray(data) ? data[0] : data;
        q = { text: item.content, author: item.author };
      }
    } catch {}
    if (!q) {
      const r = await fetch("https://dummyjson.com/quotes/random");
      if (!r.ok) throw new Error("quote");
      const data = await r.json();
      q = { text: data.quote, author: data.author };
    }
    q.text = truncateQuote(q.text);
    await saveQuoteCache(q);
    renderQuote(q);
  } catch {
    if (!cached) renderQuote(fb.quotes[Math.floor(Math.random() * fb.quotes.length)]);
  }
}

// -------------------------------------------------------------
// Shortcuts Chips
// -------------------------------------------------------------
function favicon(url) {
  try {
    return `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=32`;
  } catch {
    return "";
  }
}

function letterEl(name) {
  const s = document.createElement("span");
  s.className = "letter";
  s.textContent = (name || "?").slice(0, 1).toUpperCase();
  return s;
}

function renderChips() {
  chipsEl.replaceChildren();
  if (!settings.showShortcuts) {
    chipsEl.classList.add("hidden");
    return;
  }
  chipsEl.classList.remove("hidden");

  for (const chip of shortcuts) {
    const empty = isEmptyChip(chip);
    const el = document.createElement(empty ? "button" : "a");
    if (empty) el.type = "button";
    else {
      el.href = chip.url;
      el.rel = "noopener noreferrer";
      if (settings.openInNewTab) {
        el.target = "_blank";
      }
    }
    el.className = "chip" + (empty ? " empty" : "");
    el.dataset.id = chip.id;

    if (empty) {
      el.setAttribute("aria-label", "Empty shortcut");
    } else {
      if (settings.iconStyle === "none") {
        el.classList.add("no-icon");
      } else if (settings.iconStyle === "letter") {
        el.append(letterEl(chip.name));
      } else {
        const host = favicon(chip.url);
        if (host) {
          const img = document.createElement("img");
          img.width = 16;
          img.height = 16;
          img.alt = "";
          img.src = host;
          img.addEventListener("error", () => {
            img.replaceWith(letterEl(chip.name));
          });
          el.append(img);
        } else {
          el.append(letterEl(chip.name));
        }
      }
      el.append(chip.name);
    }

    el.addEventListener("click", (e) => {
      if (empty) {
        openEditor(chip.id);
        return;
      }
      if (settings.openInNewTab) {
        e.preventDefault();
        window.open(chip.url, "_blank", "noopener,noreferrer");
      }
    });

    el.addEventListener("auxclick", (e) => {
      if (empty || e.button !== 1) return;
      e.preventDefault();
      window.open(chip.url, "_blank", "noopener,noreferrer");
    });

    el.draggable = true;
    el.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      openMenu(e.clientX, e.clientY, chip);
    });
    el.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/plain", chip.id);
      el.classList.add("dragging");
    });
    el.addEventListener("dragend", () => el.classList.remove("dragging"));
    el.addEventListener("dragover", (e) => e.preventDefault());
    el.addEventListener("drop", async (e) => {
      e.preventDefault();
      const fromId = e.dataTransfer.getData("text/plain");
      const toId = chip.id;
      if (!fromId || fromId === toId) return;
      const from = shortcuts.findIndex((c) => c.id === fromId);
      const to = shortcuts.findIndex((c) => c.id === toId);
      if (from < 0 || to < 0) return;
      const next = shortcuts.slice();
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      shortcuts = next;
      await persistShortcuts();
      renderChips();
    });
    chipsEl.append(el);
  }

  if (shortcuts.length < MAX_CHIPS) {
    const add = document.createElement("button");
    add.type = "button";
    add.className = "chip add";
    add.textContent = "+ add";
    add.addEventListener("click", () => openEditor(null));
    chipsEl.append(add);
  }
}

async function persistShortcuts() {
  await saveWithToast(() => saveShortcuts(shortcuts), toastEl);
}

// -------------------------------------------------------------
// Shortcut Editor Modal & Context Menu
// -------------------------------------------------------------
const fieldName = document.getElementById("field-name");
const fieldUrl = document.getElementById("field-url");
const modalError = document.getElementById("modal-error");
const modalTitle = document.getElementById("modal-title");
let editingId = null;

function openEditor(id) {
  editingId = id;
  modalError.classList.add("hidden");
  fieldUrl.classList.remove("invalid");
  const chip = shortcuts.find((c) => c.id === id);
  fieldName.value = chip?.name || "";
  fieldUrl.value = chip?.url || "";
  modalTitle.textContent = chip && !isEmptyChip(chip) ? "Edit shortcut" : "New shortcut";
  modal.classList.remove("hidden");
  fieldName.focus();
}

function closeModal() {
  modal.classList.add("hidden");
  editingId = null;
}

async function saveEditor() {
  const name = fieldName.value.trim();
  fieldUrl.classList.remove("invalid");
  modalError.classList.add("hidden");
  if (!name) {
    fieldName.focus();
    return;
  }
  let url;
  try {
    url = normalizeUrl(fieldUrl.value);
  } catch {
    fieldUrl.classList.add("invalid");
    modalError.classList.remove("hidden");
    return;
  }
  if (editingId) {
    shortcuts = shortcuts.map((c) => (c.id === editingId ? { ...c, name, url } : c));
  } else {
    if (shortcuts.length >= MAX_CHIPS) return;
    shortcuts = [...shortcuts, { id: newId(), name, url }];
  }
  await persistShortcuts();
  renderChips();
  renderOverlayList();
  closeModal();
}

document.getElementById("modal-save").addEventListener("click", saveEditor);
document.getElementById("modal-cancel").addEventListener("click", closeModal);
modal.addEventListener("click", (e) => {
  if (e.target === modal) closeModal();
});

function openMenu(x, y, chip) {
  menu.replaceChildren();
  const item = (label, fn) => {
    const b = document.createElement("button");
    b.type = "button";
    b.setAttribute("role", "menuitem");
    b.textContent = label;
    b.addEventListener("click", () => {
      closeMenu();
      fn();
    });
    menu.append(b);
  };
  if (!isEmptyChip(chip)) {
    item("Edit", () => openEditor(chip.id));
    item("Clear", async () => {
      shortcuts = shortcuts.map((c) => (c.id === chip.id ? { ...c, name: "", url: "" } : c));
      await persistShortcuts();
      renderChips();
      renderOverlayList();
    });
  }
  item("Delete", async () => {
    shortcuts = shortcuts.filter((c) => c.id !== chip.id);
    await persistShortcuts();
    renderChips();
    renderOverlayList();
  });
  menu.classList.remove("hidden");
  menu.style.left = `${x}px`;
  menu.style.top = `${y}px`;
}

function closeMenu() {
  menu.classList.add("hidden");
}
document.addEventListener("click", () => closeMenu());

// -------------------------------------------------------------
// Settings Tabs & Overlay
// -------------------------------------------------------------
function setupSettingsTabs() {
  const tabBtns = document.querySelectorAll(".tab-btn");
  const tabPanels = document.querySelectorAll(".tab-panel");

  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.dataset.tab;
      tabBtns.forEach((b) => {
        b.classList.toggle("active", b === btn);
        b.setAttribute("aria-selected", b === btn ? "true" : "false");
      });
      tabPanels.forEach((p) => {
        p.classList.toggle("active", p.id === targetId);
      });
    });
  });
}

function openOverlay() {
  syncSettingsForm();
  renderOverlayList();
  overlay.classList.remove("hidden");
}

function closeOverlay() {
  overlay.classList.add("hidden");
}

gear.addEventListener("click", openOverlay);
overlayClose.addEventListener("click", closeOverlay);
overlay.addEventListener("click", (e) => {
  if (e.target === overlay) closeOverlay();
});
overlayAdd.addEventListener("click", () => openEditor(null));

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeOverlay();
    closeModal();
    closeMenu();
  }
});

// Shortcuts management in overlay
function renderOverlayList() {
  overlayList.replaceChildren();
  shortcuts.forEach((chip, index) => {
    const li = document.createElement("li");
    const label = document.createElement("span");
    label.textContent = isEmptyChip(chip) ? "empty slot" : chip.name;
    const actions = document.createElement("div");
    actions.className = "actions";
    const btn = (text, fn) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = text;
      b.addEventListener("click", fn);
      return b;
    };
    if (index > 0) actions.append(btn("↑", () => moveChip(chip.id, -1)));
    if (index < shortcuts.length - 1) actions.append(btn("↓", () => moveChip(chip.id, 1)));
    if (!isEmptyChip(chip)) {
      actions.append(btn("edit", () => openEditor(chip.id)));
      actions.append(btn("clear", () => clearChip(chip.id)));
    }
    actions.append(btn("×", () => deleteChip(chip.id)));
    li.append(label, actions);
    overlayList.append(li);
  });
  overlayAdd.classList.toggle("hidden", shortcuts.length >= MAX_CHIPS);
}

async function moveChip(id, dir) {
  const i = shortcuts.findIndex((c) => c.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= shortcuts.length) return;
  const next = shortcuts.slice();
  [next[i], next[j]] = [next[j], next[i]];
  shortcuts = next;
  await persistShortcuts();
  renderChips();
  renderOverlayList();
}

async function clearChip(id) {
  shortcuts = shortcuts.map((c) => (c.id === id ? { ...c, name: "", url: "" } : c));
  await persistShortcuts();
  renderChips();
  renderOverlayList();
}

async function deleteChip(id) {
  shortcuts = shortcuts.filter((c) => c.id !== id);
  await persistShortcuts();
  renderChips();
  renderOverlayList();
}

// -------------------------------------------------------------
// Settings Sync & Live Updating
// -------------------------------------------------------------
async function updateAndSaveSettings(changes) {
  settings = { ...settings, ...changes };
  applySettings(settings, false);
  await saveWithToast(() => saveSettings(settings), toastEl);
}

function applySettings(cfg, isInitial = false) {
  // Appearance
  document.body.dataset.theme = cfg.theme;
  document.body.dataset.accent = cfg.accentColor;
  document.body.classList.toggle("has-glow", Boolean(cfg.glowEffect));
  zoomControls.classList.toggle("hidden", !cfg.showZoomControls);

  // Scale
  applyScale(cfg.scale, false);

  // Eyes
  ascii.classList.toggle("hidden", !cfg.showEyes);
  if (eyesDisplay) {
    eyesDisplay.updateConfig({
      variant: cfg.eyeVariant,
      ramp: cfg.eyeRamp,
      follow: cfg.eyeFollow,
      blinkRate: cfg.eyeBlinkRate,
    });
  }

  // Clock & Date
  tick();

  // Quote
  quoteBlock.classList.toggle("hidden", !cfg.showQuote);
  if (!isInitial) {
    if (cfg.quoteMode === "custom") {
      renderQuote({
        text: cfg.customQuoteText || "Simplicity is the ultimate sophistication.",
        author: cfg.customQuoteAuthor || "Leonardo da Vinci",
      });
    } else {
      loadQuote();
    }
  }

  // Shortcuts
  renderChips();
}

function syncSettingsForm() {
  settingTheme.value = settings.theme;
  accentSwatches.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.color === settings.accentColor);
  });
  settingGlow.checked = Boolean(settings.glowEffect);
  settingShowZoom.checked = Boolean(settings.showZoomControls);

  settingShowEyes.checked = Boolean(settings.showEyes);
  settingEyeVariant.value = settings.eyeVariant;
  settingEyeRamp.value = settings.eyeRamp;
  settingEyeFollow.checked = Boolean(settings.eyeFollow);
  settingEyeBlink.value = settings.eyeBlinkRate;

  settingShowClock.checked = Boolean(settings.showClock);
  settingTimeFormat.value = settings.timeFormat;
  settingShowSeconds.checked = Boolean(settings.showSeconds);
  settingShowDate.checked = Boolean(settings.showDate);
  settingDateFormat.value = settings.dateFormat;
  rowDateFormat.classList.toggle("hidden", !settings.showDate);

  settingShowQuote.checked = Boolean(settings.showQuote);
  settingQuoteMode.value = settings.quoteMode;
  customQuoteFields.classList.toggle("hidden", settings.quoteMode !== "custom");
  settingCustomText.value = settings.customQuoteText || "";
  settingCustomAuthor.value = settings.customQuoteAuthor || "";

  settingShowShortcuts.checked = Boolean(settings.showShortcuts);
  settingOpenNewTab.checked = Boolean(settings.openInNewTab);
  settingIconStyle.value = settings.iconStyle;
}

function setupSettingsListeners() {
  // Theme
  settingTheme.addEventListener("change", () => {
    updateAndSaveSettings({ theme: settingTheme.value });
  });

  // Accent Color
  accentSwatches.forEach((btn) => {
    btn.addEventListener("click", () => {
      accentSwatches.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      updateAndSaveSettings({ accentColor: btn.dataset.color });
    });
  });

  // Glow
  settingGlow.addEventListener("change", () => {
    updateAndSaveSettings({ glowEffect: settingGlow.checked });
  });

  // Corner Zoom Controls
  settingShowZoom.addEventListener("change", () => {
    updateAndSaveSettings({ showZoomControls: settingShowZoom.checked });
  });

  // Eyes
  settingShowEyes.addEventListener("change", () => {
    updateAndSaveSettings({ showEyes: settingShowEyes.checked });
  });
  settingEyeVariant.addEventListener("change", () => {
    updateAndSaveSettings({ eyeVariant: settingEyeVariant.value });
  });
  settingEyeRamp.addEventListener("change", () => {
    updateAndSaveSettings({ eyeRamp: settingEyeRamp.value });
  });
  settingEyeFollow.addEventListener("change", () => {
    updateAndSaveSettings({ eyeFollow: settingEyeFollow.checked });
  });
  settingEyeBlink.addEventListener("change", () => {
    updateAndSaveSettings({ eyeBlinkRate: settingEyeBlink.value });
  });

  // Clock
  settingShowClock.addEventListener("change", () => {
    updateAndSaveSettings({ showClock: settingShowClock.checked });
  });
  settingTimeFormat.addEventListener("change", () => {
    updateAndSaveSettings({ timeFormat: settingTimeFormat.value });
  });
  settingShowSeconds.addEventListener("change", () => {
    updateAndSaveSettings({ showSeconds: settingShowSeconds.checked });
  });
  settingShowDate.addEventListener("change", () => {
    rowDateFormat.classList.toggle("hidden", !settingShowDate.checked);
    updateAndSaveSettings({ showDate: settingShowDate.checked });
  });
  settingDateFormat.addEventListener("change", () => {
    updateAndSaveSettings({ dateFormat: settingDateFormat.value });
  });

  // Quote
  settingShowQuote.addEventListener("change", () => {
    updateAndSaveSettings({ showQuote: settingShowQuote.checked });
  });
  settingQuoteMode.addEventListener("change", () => {
    const isCustom = settingQuoteMode.value === "custom";
    customQuoteFields.classList.toggle("hidden", !isCustom);
    updateAndSaveSettings({ quoteMode: settingQuoteMode.value });
  });
  settingCustomText.addEventListener("input", () => {
    updateAndSaveSettings({ customQuoteText: settingCustomText.value });
  });
  settingCustomAuthor.addEventListener("input", () => {
    updateAndSaveSettings({ customQuoteAuthor: settingCustomAuthor.value });
  });

  // Shortcuts
  settingShowShortcuts.addEventListener("change", () => {
    updateAndSaveSettings({ showShortcuts: settingShowShortcuts.checked });
  });
  settingOpenNewTab.addEventListener("change", () => {
    updateAndSaveSettings({ openInNewTab: settingOpenNewTab.checked });
  });
  settingIconStyle.addEventListener("change", () => {
    updateAndSaveSettings({ iconStyle: settingIconStyle.value });
  });

  // Data: Export
  btnExport.addEventListener("click", () => {
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      settings,
      shortcuts,
    };
    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "amoled-newtab-backup.json";
    a.click();
    URL.revokeObjectURL(url);

    try {
      navigator.clipboard.writeText(json);
      showToast("Config exported & copied to clipboard");
    } catch {
      showToast("Config exported");
    }
  });

  // Data: Import
  fileImport.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        if (parsed.settings && typeof parsed.settings === "object") {
          settings = { ...DEFAULT_SETTINGS, ...parsed.settings };
          await saveSettings(settings);
        }
        if (Array.isArray(parsed.shortcuts)) {
          shortcuts = parsed.shortcuts;
          await saveShortcuts(shortcuts);
        }
        applySettings(settings);
        syncSettingsForm();
        renderChips();
        renderOverlayList();
        showToast("Backup restored successfully");
      } catch {
        showToast("Failed to parse backup file");
      }
      fileImport.value = "";
    };
    reader.readAsText(file);
  });

  // Data: Reset
  btnReset.addEventListener("click", async () => {
    if (!confirm("Are you sure you want to reset all settings and shortcuts to default?")) {
      return;
    }
    settings = { ...DEFAULT_SETTINGS };
    shortcuts = DEFAULT_SHORTCUTS.map((c) => ({ ...c }));
    await saveSettings(settings);
    await saveShortcuts(shortcuts);
    applySettings(settings);
    syncSettingsForm();
    renderChips();
    renderOverlayList();
    showToast("Reset to defaults");
  });
}

// -------------------------------------------------------------
// Zoom / Scale
// -------------------------------------------------------------
function applyScale(n, persist = true) {
  const clamped = clampScale(n);
  settings.scale = clamped;
  document.documentElement.style.setProperty("--page-scale", String(clamped));
  const pct = Math.round(clamped * 100);
  scaleRange.value = String(pct);
  scaleLabel.textContent = `${pct}%`;
  if (persist) {
    updateAndSaveSettings({ scale: clamped });
  }
}

zoomOut.addEventListener("click", () => applyScale(settings.scale - SCALE_STEP));
zoomIn.addEventListener("click", () => applyScale(settings.scale + SCALE_STEP));
scaleDown.addEventListener("click", () => applyScale(settings.scale - SCALE_STEP));
scaleUp.addEventListener("click", () => applyScale(settings.scale + SCALE_STEP));
scaleRange.addEventListener("input", () => {
  applyScale(Number(scaleRange.value) / 100, false);
});
scaleRange.addEventListener("change", () => {
  applyScale(Number(scaleRange.value) / 100, true);
});

// -------------------------------------------------------------
// Initialization
// -------------------------------------------------------------
async function init() {
  settings = await loadSettings();
  shortcuts = await loadShortcuts();

  eyesDisplay = new EyesDisplay(ascii, {
    variant: settings.eyeVariant,
    ramp: settings.eyeRamp,
    follow: settings.eyeFollow,
    blinkRate: settings.eyeBlinkRate,
  });

  applySettings(settings, true);
  setupSettingsTabs();
  setupSettingsListeners();
  setupQuoteCopy();
  loadQuote();
  renderChips();

  tick();
  setInterval(tick, 1000);
}

init();
