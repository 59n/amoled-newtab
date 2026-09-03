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
const zoomButtons = document.getElementById("zoom-buttons");
const zoomOut = document.getElementById("zoom-out");
const zoomIn = document.getElementById("zoom-in");
const scaleDown = document.getElementById("scale-down");
const scaleUp = document.getElementById("scale-up");
const scaleRange = document.getElementById("scale-range");
const scaleLabel = document.getElementById("scale-label");
const cursorAuraEl = document.getElementById("cursor-aura");
const mainEl = document.querySelector("main");

// Settings controls
const settingTheme = document.getElementById("setting-theme");
const accentSwatches = document.querySelectorAll("#accent-swatches .color-swatch-btn");
const settingGlow = document.getElementById("setting-glow");
const settingCursorAura = document.getElementById("setting-cursor-aura");
const settingClickRipples = document.getElementById("setting-click-ripples");
const settingShowZoom = document.getElementById("setting-show-zoom");
const settingShowEyes = document.getElementById("setting-show-eyes");
const settingEyeVariant = document.getElementById("setting-eye-variant");
const settingEyeRamp = document.getElementById("setting-eye-ramp");
const settingEyeFollow = document.getElementById("setting-eye-follow");
const settingEyeBlink = document.getElementById("setting-eye-blink");
const settingEyeSleep = document.getElementById("setting-eye-sleep");
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
const settingKeyboardShortcuts = document.getElementById("setting-keyboard-shortcuts");
const btnExport = document.getElementById("btn-export");
const fileImport = document.getElementById("file-import");
const btnReset = document.getElementById("btn-reset");

let settings = { ...DEFAULT_SETTINGS };
let shortcuts = [];
let eyesDisplay = null;
let toastTimeout = null;
let currentQuote = { text: "", author: "" };
const MAX_CHIPS = 8;

const EYE_VARIANTS = ["classic", "sleepy", "wide", "squint", "glare", "close", "far"];

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
  checkIdleSleep();
}

let lastUserActivity = Date.now();
const IDLE_SLEEP_TIMEOUT = 35000;

function noteUserActivity() {
  lastUserActivity = Date.now();
  if (document.body.classList.contains("is-sleeping")) {
    document.body.classList.remove("is-sleeping");
    if (eyesDisplay) {
      eyesDisplay.wakeUp();
    }
  }
}

function checkIdleSleep() {
  if (!settings.eyeIdleSleep || !settings.showEyes) return;
  if (document.body.classList.contains("is-sleeping")) return;
  if (!modal.classList.contains("hidden") || !overlay.classList.contains("hidden")) return;

  if (Date.now() - lastUserActivity >= IDLE_SLEEP_TIMEOUT) {
    document.body.classList.add("is-sleeping");
    if (eyesDisplay) {
      eyesDisplay.sleep();
    }
  }
}

function setupIdleAndHotkeys() {
  ["mousemove", "mousedown", "keydown", "touchstart", "touchmove", "wheel", "pointermove"].forEach((ev) => {
    window.addEventListener(ev, noteUserActivity, { passive: true });
  });

  window.addEventListener("keydown", (e) => {
    if (!settings.keyboardShortcuts) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (document.activeElement && ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)) return;
    if (!modal.classList.contains("hidden") || !overlay.classList.contains("hidden")) return;

    if (e.key >= "1" && e.key <= "8") {
      const idx = parseInt(e.key, 10) - 1;
      const chip = shortcuts[idx];
      if (chip && !isEmptyChip(chip) && chip.url) {
        e.preventDefault();
        const chipEls = chipsEl.querySelectorAll(".chip:not(.add)");
        const targetEl = chipEls[idx];
        if (targetEl) {
          targetEl.classList.add("chip-hotkey-press");
          setTimeout(() => targetEl.classList.remove("chip-hotkey-press"), 200);
        }
        setTimeout(() => {
          if (settings.openInNewTab) {
            window.open(chip.url, "_blank", "noopener,noreferrer");
          } else {
            window.location.href = chip.url;
          }
        }, 90);
      }
    }
  });
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
    const host = new URL(url).hostname.replace(/^www\./, "");
    // Google S2 provides high-contrast contrast-optimized badges for dark/monochrome logos like GitHub
    // For sites known to be missing in Google S2 (like backtrader), route to DuckDuckGo
    if (host.includes("backtrader")) {
      return `https://icons.duckduckgo.com/ip3/${host}.ico`;
    }
    return `https://www.google.com/s2/favicons?domain=${host}&sz=32`;
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
      const chipIndex = shortcuts.indexOf(chip);
      if (chipIndex >= 0 && chipIndex < 8) {
        el.title = `${chip.name} [${chipIndex + 1}]`;
        el.setAttribute("aria-keyshortcuts", String(chipIndex + 1));
      }
      if (settings.iconStyle === "none") {
        el.classList.add("no-icon");
      } else if (settings.iconStyle === "letter") {
        el.append(letterEl(chip.name));
      } else {
        const customIcon = chip.icon && chip.icon.trim();
        const primaryIcon = customIcon || favicon(chip.url);
        if (primaryIcon) {
          const img = document.createElement("img");
          img.width = 16;
          img.height = 16;
          img.alt = "";
          img.src = primaryIcon;
          let stage = customIcon ? 2 : 0;
          img.addEventListener("error", () => {
            stage++;
            try {
              const host = new URL(chip.url).hostname;
              const cleanHost = host.replace(/^www\./, "");
              if (stage === 1) {
                img.src = `https://icons.duckduckgo.com/ip3/${cleanHost}.ico`;
              } else if (stage === 2) {
                img.src = `${new URL(chip.url).origin}/favicon.ico`;
              } else {
                img.replaceWith(letterEl(chip.name));
              }
            } catch {
              img.replaceWith(letterEl(chip.name));
            }
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
      e.stopPropagation();
      openChipMenu(e.clientX, e.clientY, chip);
    });
    el.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/plain", chip.id);
      el.classList.add("dragging");
    });
    el.addEventListener("dragend", () => el.classList.remove("dragging"));
    el.addEventListener("dragover", (e) => {
      e.preventDefault();
      el.classList.add("chip-drop-hover");
    });
    el.addEventListener("dragleave", () => {
      el.classList.remove("chip-drop-hover");
    });
    el.addEventListener("drop", async (e) => {
      e.preventDefault();
      el.classList.remove("chip-drop-hover");

      const bookmarkDataRaw = e.dataTransfer.getData("application/json");
      if (bookmarkDataRaw) {
        try {
          const bm = JSON.parse(bookmarkDataRaw);
          if (bm && bm.url) {
            let hostname = "";
            try {
              hostname = new URL(bm.url).hostname.replace(/^www\./, "");
            } catch {
              hostname = bm.url;
            }
            const name = (bm.name || hostname || "Link").trim().slice(0, 18);
            chip.name = name;
            chip.url = bm.url;
            await persistShortcuts();
            renderChips();
            showToast(`Pinned "${name}" to shortcut chip!`);
            return;
          }
        } catch (err) {
          console.warn("Bookmark drop parse error:", err);
        }
      }

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
  setupCuriosityFocus();
}

async function persistShortcuts() {
  await saveWithToast(() => saveShortcuts(shortcuts), toastEl);
}

// -------------------------------------------------------------
// Shortcut Editor Modal
// -------------------------------------------------------------

const searchContainer = document.getElementById("search-container");
const searchForm = document.getElementById("search-form");
const searchInput = document.getElementById("search-input");
const settingShowSearch = document.getElementById("setting-show-search");
const searchSettingsGroup = document.getElementById("search-settings-group");
const settingSearchEngine = document.getElementById("setting-search-engine");
const rowCustomSearchUrl = document.getElementById("row-custom-search-url");
const settingCustomSearchUrl = document.getElementById("setting-custom-search-url");
const settingSearchNewTab = document.getElementById("setting-search-new-tab");
const fieldName = document.getElementById("field-name");
const fieldUrl = document.getElementById("field-url");
const fieldIcon = document.getElementById("field-icon");
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
  if (fieldIcon) fieldIcon.value = chip?.icon || "";
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
  const icon = fieldIcon ? fieldIcon.value.trim() : "";
  if (editingId) {
    shortcuts = shortcuts.map((c) => {
      if (c.id !== editingId) return c;
      const updated = { ...c, name, url };
      if (icon) updated.icon = icon;
      else delete updated.icon;
      return updated;
    });
  } else {
    if (shortcuts.length >= MAX_CHIPS) return;
    const newEntry = { id: newId(), name, url };
    if (icon) newEntry.icon = icon;
    shortcuts = [...shortcuts, newEntry];
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

// -------------------------------------------------------------
// Interactive Right-Click Menus
// -------------------------------------------------------------
function positionMenu(x, y) {
  menu.classList.remove("hidden");
  const pad = 12;
  const menuWidth = menu.offsetWidth || 170;
  const menuHeight = menu.offsetHeight || 160;
  const posX = x + menuWidth > window.innerWidth - pad ? Math.max(pad, window.innerWidth - menuWidth - pad) : x;
  const posY = y + menuHeight > window.innerHeight - pad ? Math.max(pad, window.innerHeight - menuHeight - pad) : y;
  menu.style.left = `${posX}px`;
  menu.style.top = `${posY}px`;
}

function addMenuItem(label, iconText, fn) {
  const b = document.createElement("button");
  b.type = "button";
  b.setAttribute("role", "menuitem");
  const icon = document.createElement("span");
  icon.className = "menu-icon";
  icon.textContent = iconText;
  b.append(icon);
  b.append(label);
  b.addEventListener("click", () => {
    closeMenu();
    fn();
  });
  menu.append(b);
}

function addMenuDivider() {
  const d = document.createElement("div");
  d.className = "menu-divider";
  menu.append(d);
}

function openChipMenu(x, y, chip) {
  menu.replaceChildren();
  if (!isEmptyChip(chip)) {
    addMenuItem("Edit Shortcut", "✎", () => openEditor(chip.id));
    addMenuItem("Clear Slot", "↺", async () => {
      shortcuts = shortcuts.map((c) => (c.id === chip.id ? { ...c, name: "", url: "" } : c));
      await persistShortcuts();
      renderChips();
      renderOverlayList();
    });
  }
  addMenuItem("Delete Slot", "×", async () => {
    shortcuts = shortcuts.filter((c) => c.id !== chip.id);
    await persistShortcuts();
    renderChips();
    renderOverlayList();
  });
  addMenuDivider();
  addMenuItem("Settings", "⚙", openOverlay);
  positionMenu(x, y);
}

function openBackgroundMenu(x, y) {
  menu.replaceChildren();
  addMenuItem("Settings", "⚙", openOverlay);
  addMenuItem("Cycle Eyes", "👁", () => {
    const currIdx = EYE_VARIANTS.indexOf(settings.eyeVariant);
    const nextIdx = (currIdx + 1) % EYE_VARIANTS.length;
    const nextVariant = EYE_VARIANTS[nextIdx];
    updateAndSaveSettings({ eyeVariant: nextVariant });
    showToast(`Eye style: ${nextVariant}`);
  });
  addMenuItem("Toggle Glow", "✦", () => {
    const nextGlow = !settings.glowEffect;
    updateAndSaveSettings({ glowEffect: nextGlow });
    showToast(`Glow ${nextGlow ? "enabled" : "disabled"}`);
  });
  addMenuItem("New Quote", "❝", () => {
    loadQuote();
    showToast("Loaded new quote");
  });
  if (shortcuts.length < MAX_CHIPS) {
    addMenuDivider();
    addMenuItem("Add Shortcut", "+", () => openEditor(null));
  }
  positionMenu(x, y);
}

function closeMenu() {
  menu.classList.add("hidden");
}

document.addEventListener("click", (e) => {
  if (!menu.contains(e.target)) closeMenu();
});

// Background right-click handler
window.addEventListener("contextmenu", (e) => {
  if (["INPUT", "TEXTAREA", "SELECT"].includes(e.target?.tagName)) return;
  if (e.target.closest(".chip") || e.target.closest("#modal") || e.target.closest("#overlay")) return;
  e.preventDefault();
  openBackgroundMenu(e.clientX, e.clientY);
});

// Mobile Long-Press Context Menu Support
function setupLongPress() {
  let touchTimer = null;
  let startX = 0;
  let startY = 0;
  let hasMoved = false;

  window.addEventListener("touchstart", (e) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    startX = touch.clientX;
    startY = touch.clientY;
    hasMoved = false;

    // Ignore if touching inside active modal/overlay or interactive form buttons
    if (e.target.closest("#modal") || e.target.closest("#overlay") || ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(e.target.tagName)) {
      return;
    }

    clearTimeout(touchTimer);
    touchTimer = setTimeout(() => {
      if (hasMoved) return;
      try { navigator.vibrate?.(25); } catch {}

      const chipEl = e.target.closest(".chip");
      if (chipEl && chipEl.dataset.id) {
        const chip = shortcuts.find((c) => c.id === chipEl.dataset.id);
        if (chip) {
          openChipMenu(startX, startY, chip);
          return;
        }
      }
      openBackgroundMenu(startX, startY);
    }, 450);
  }, { passive: true });

  window.addEventListener("touchmove", (e) => {
    if (!touchTimer) return;
    const touch = e.touches[0];
    if (Math.hypot(touch.clientX - startX, touch.clientY - startY) > 12) {
      hasMoved = true;
      clearTimeout(touchTimer);
    }
  }, { passive: true });

  window.addEventListener("touchend", () => {
    clearTimeout(touchTimer);
  }, { passive: true });

  window.addEventListener("touchcancel", () => {
    clearTimeout(touchTimer);
  }, { passive: true });
}

// -------------------------------------------------------------
// Mouse Cursor Aura & Click Shockwaves
// -------------------------------------------------------------
function setupCursorAura() {
  if (!cursorAuraEl) return;
  let auraRaf = null;
  let posX = window.innerWidth / 2;
  let posY = window.innerHeight / 2;
  let touchHideTimer = null;

  function updateAura(x, y) {
    posX = x;
    posY = y;
    if (!cursorAuraEl.classList.contains("active")) {
      cursorAuraEl.classList.add("active");
    }
    if (!auraRaf) {
      auraRaf = requestAnimationFrame(() => {
        cursorAuraEl.style.transform = "translate3d(" + posX + "px, " + posY + "px, 0)";
        auraRaf = null;
      });
    }
  }

  window.addEventListener("mousemove", (e) => {
    updateAura(e.clientX, e.clientY);
  }, { passive: true });

  document.addEventListener("mouseleave", () => {
    cursorAuraEl.classList.remove("active");
  });

  // Touch tracking for mobile
  window.addEventListener("touchstart", (e) => {
    clearTimeout(touchHideTimer);
    if (e.touches && e.touches[0]) {
      updateAura(e.touches[0].clientX, e.touches[0].clientY);
    }
  }, { passive: true });

  window.addEventListener("touchmove", (e) => {
    clearTimeout(touchHideTimer);
    if (e.touches && e.touches[0]) {
      updateAura(e.touches[0].clientX, e.touches[0].clientY);
    }
  }, { passive: true });

  window.addEventListener("touchend", () => {
    clearTimeout(touchHideTimer);
    touchHideTimer = setTimeout(() => {
      cursorAuraEl.classList.remove("active");
    }, 450);
  }, { passive: true });
}

function setupClickRipples() {
  window.addEventListener("pointerdown", (e) => {
    if (!settings.clickRipples) return;
    if (["INPUT", "TEXTAREA", "SELECT"].includes(e.target?.tagName)) return;
    if (e.target.closest("#overlay") || e.target.closest("#modal")) return;

    const ripple = document.createElement("div");
    const isAccent = e.button === 2;
    ripple.className = "click-ripple " + (isAccent ? "click-ripple--accent" : "click-ripple--standard");
    ripple.style.left = `${e.clientX}px`;
    ripple.style.top = `${e.clientY}px`;
    document.body.append(ripple);

    ripple.addEventListener("animationend", () => {
      ripple.remove();
    }, { once: true });
  }, { passive: true });
}

// -------------------------------------------------------------
// Kinetic Scroll Animation
// -------------------------------------------------------------
function setupScrollPhysics() {
  if (!mainEl) return;
  let scrollOffset = 0;
  let resetTimer = null;

  window.addEventListener("wheel", (e) => {
    if (
      !overlay.classList.contains("hidden") ||
      !modal.classList.contains("hidden") ||
      (bookmarksDrawer && !bookmarksDrawer.classList.contains("hidden")) ||
      e.target?.closest?.("#bookmarks-drawer, #overlay, #modal")
    ) {
      return;
    }
    scrollOffset = Math.max(-24, Math.min(24, scrollOffset - e.deltaY * 0.1));
    mainEl.style.transform = `translateY(${scrollOffset}px)`;

    clearTimeout(resetTimer);
    resetTimer = setTimeout(() => {
      scrollOffset = 0;
      mainEl.style.transform = "";
    }, 120);
  }, { passive: true });
}

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
  // Appearance: sync both documentElement and body
  document.documentElement.dataset.theme = cfg.theme;
  document.body.dataset.theme = cfg.theme;
  document.documentElement.dataset.accent = cfg.accentColor;
  document.body.dataset.accent = cfg.accentColor;
  document.documentElement.classList.toggle("has-glow", Boolean(cfg.glowEffect));
  document.body.classList.toggle("has-glow", Boolean(cfg.glowEffect));
  document.body.classList.toggle("has-cursor-aura", Boolean(cfg.cursorAura));

  const btnBookmarksEl = document.getElementById("btn-bookmarks");
  if (btnBookmarksEl) {
    btnBookmarksEl.classList.toggle("hidden", !cfg.showBookmarksBtn);
  }

  // Instant toggle for zoom buttons (gear icon ALWAYS stays)
  document.documentElement.classList.toggle("hide-zoom", !cfg.showZoomControls);
  if (zoomButtons) {
    zoomButtons.classList.toggle("hidden", !cfg.showZoomControls);
  } else if (zoomOut && zoomIn) {
    zoomOut.classList.toggle("hidden", !cfg.showZoomControls);
    zoomIn.classList.toggle("hidden", !cfg.showZoomControls);
  }

  // Scale
  applyScale(cfg.scale, false);

  // Search Bar
  if (searchContainer) {
    searchContainer.classList.toggle("hidden", !cfg.showSearchBar);
  }

  // Eyes
  ascii.classList.toggle("hidden", !cfg.showEyes);
  if (eyesDisplay) {
    eyesDisplay.updateConfig({
      variant: cfg.eyeVariant,
      ramp: cfg.eyeRamp,
      follow: cfg.eyeFollow,
      blinkRate: cfg.eyeBlinkRate,
      idleSleep: cfg.eyeIdleSleep,
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
  if (settingCursorAura) settingCursorAura.checked = Boolean(settings.cursorAura);
  if (settingClickRipples) settingClickRipples.checked = Boolean(settings.clickRipples);
  settingShowZoom.checked = Boolean(settings.showZoomControls);

  settingShowEyes.checked = Boolean(settings.showEyes);
  settingEyeVariant.value = settings.eyeVariant;
  settingEyeRamp.value = settings.eyeRamp;
  settingEyeFollow.checked = Boolean(settings.eyeFollow);
  settingEyeBlink.value = settings.eyeBlinkRate;
  if (settingEyeSleep) settingEyeSleep.checked = Boolean(settings.eyeIdleSleep);

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
  if (settingKeyboardShortcuts) settingKeyboardShortcuts.checked = Boolean(settings.keyboardShortcuts);
  const settingShowBookmarks = document.getElementById("setting-show-bookmarks-btn");
  if (settingShowBookmarks) settingShowBookmarks.checked = Boolean(settings.showBookmarksBtn);

  if (settingShowSearch) settingShowSearch.checked = Boolean(settings.showSearchBar);
  if (searchSettingsGroup) searchSettingsGroup.classList.toggle("hidden", !settings.showSearchBar);
  if (settingSearchEngine) settingSearchEngine.value = settings.searchEngine || "google";
  if (rowCustomSearchUrl) rowCustomSearchUrl.classList.toggle("hidden", settings.searchEngine !== "custom");
  if (settingCustomSearchUrl) settingCustomSearchUrl.value = settings.customSearchUrl || "";
  if (settingSearchNewTab) settingSearchNewTab.checked = Boolean(settings.searchInNewTab);
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

  // Cursor Aura & Click Ripples
  if (settingCursorAura) {
    settingCursorAura.addEventListener("change", () => {
      updateAndSaveSettings({ cursorAura: settingCursorAura.checked });
    });
  }
  if (settingClickRipples) {
    settingClickRipples.addEventListener("change", () => {
      updateAndSaveSettings({ clickRipples: settingClickRipples.checked });
    });
  }

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
  if (settingEyeSleep) {
    settingEyeSleep.addEventListener("change", () => {
      updateAndSaveSettings({ eyeIdleSleep: settingEyeSleep.checked });
      if (!settingEyeSleep.checked && document.body.classList.contains("is-sleeping")) {
        document.body.classList.remove("is-sleeping");
        if (eyesDisplay) eyesDisplay.wakeUp();
      }
    });
  }

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
  if (settingKeyboardShortcuts) {
    settingKeyboardShortcuts.addEventListener("change", () => {
      updateAndSaveSettings({ keyboardShortcuts: settingKeyboardShortcuts.checked });
    });
  }
  const settingShowBookmarks = document.getElementById("setting-show-bookmarks-btn");
  if (settingShowBookmarks) {
    settingShowBookmarks.addEventListener("change", () => {
      updateAndSaveSettings({ showBookmarksBtn: settingShowBookmarks.checked });
    });
  }

  if (settingShowSearch) {
    settingShowSearch.addEventListener("change", () => {
      if (searchSettingsGroup) searchSettingsGroup.classList.toggle("hidden", !settingShowSearch.checked);
      updateAndSaveSettings({ showSearchBar: settingShowSearch.checked });
    });
  }
  if (settingSearchEngine) {
    settingSearchEngine.addEventListener("change", () => {
      if (rowCustomSearchUrl) rowCustomSearchUrl.classList.toggle("hidden", settingSearchEngine.value !== "custom");
      updateAndSaveSettings({ searchEngine: settingSearchEngine.value });
    });
  }
  if (settingCustomSearchUrl) {
    settingCustomSearchUrl.addEventListener("input", () => {
      updateAndSaveSettings({ customSearchUrl: settingCustomSearchUrl.value });
    });
  }
  if (settingSearchNewTab) {
    settingSearchNewTab.addEventListener("change", () => {
      updateAndSaveSettings({ searchInNewTab: settingSearchNewTab.checked });
    });
  }

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
// Keyboard & Background Shortcuts to Open Settings
// -------------------------------------------------------------
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeOverlay();
    closeModal();
    closeMenu();
    closeBookmarksDrawer();
    return;
  }
  const isInput = ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName);
  if (!isInput) {
    // Pressing '/' focuses search input if enabled
    if (e.key === "/" && settings.showSearchBar && searchInput) {
      e.preventDefault();
      searchInput.focus();
      searchInput.select();
      return;
    }

    // Pressing 'b' toggles Bookmarks Bridge
    if (e.key.toLowerCase() === "b" && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      toggleBookmarksDrawer();
      return;
    }

    // Pressing 's', ',', or Cmd/Ctrl+, toggles settings
    if (e.key.toLowerCase() === "s" || e.key === "," || ((e.metaKey || e.ctrlKey) && e.key === ",")) {
      e.preventDefault();
      if (overlay.classList.contains("hidden")) {
        openOverlay();
      } else {
        closeOverlay();
      }
    }
  }
});




// -------------------------------------------------------------
// Search Bar Engine
// -------------------------------------------------------------
const SEARCH_ENGINES = {
  google: "https://www.google.com/search?q=",
  duckduckgo: "https://duckduckgo.com/?q=",
  brave: "https://search.brave.com/search?q=",
  perplexity: "https://www.perplexity.ai/search?q=",
  bing: "https://www.bing.com/search?q=",
};

const SEARCH_BANGS = {
  "!g": "https://www.google.com/search?q=",
  "!ddg": "https://duckduckgo.com/?q=",
  "!b": "https://search.brave.com/search?q=",
  "!p": "https://www.perplexity.ai/search?q=",
  "!gh": "https://github.com/search?q=",
  "!yt": "https://www.youtube.com/results?search_query=",
  "!r": "https://www.reddit.com/search/?q=",
  "!w": "https://en.wikipedia.org/wiki/Special:Search?search=",
  "!m": "https://www.google.com/maps/search/",
};

function performSearch(rawQuery) {
  const query = (rawQuery || "").trim();
  if (!query) return;

  const urlPattern = /^(https?:\/\/|[a-z0-9-]+\.[a-z]{2,}(\/.*)?$|localhost(:\d+)?(\/.*)?$|\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?(\/.*)?$)/i;
  if (urlPattern.test(query)) {
    let targetUrl = query;
    if (!/^https?:\/\//i.test(targetUrl)) {
      targetUrl = "https://" + targetUrl;
    }
    navigateSearch(targetUrl);
    return;
  }

  const parts = query.split(/\s+/);
  const firstWord = parts[0].toLowerCase();
  if (SEARCH_BANGS[firstWord]) {
    const remaining = parts.slice(1).join(" ");
    const targetUrl = SEARCH_BANGS[firstWord] + encodeURIComponent(remaining);
    navigateSearch(targetUrl);
    return;
  }

  let targetUrl = "";
  if (settings.searchEngine === "custom" && settings.customSearchUrl) {
    targetUrl = settings.customSearchUrl.replace("%s", encodeURIComponent(query));
  } else {
    const base = SEARCH_ENGINES[settings.searchEngine] || SEARCH_ENGINES.google;
    targetUrl = base + encodeURIComponent(query);
  }

  navigateSearch(targetUrl);
}

function navigateSearch(url) {
  if (settings.searchInNewTab) {
    window.open(url, "_blank", "noopener,noreferrer");
  } else {
    window.location.href = url;
  }
}

function setupSearchBar() {
  if (searchForm) {
    searchForm.addEventListener("submit", (e) => {
      e.preventDefault();
      performSearch(searchInput?.value);
    });
  }
}

// -------------------------------------------------------------
// Bookmarks Bar Bridge
// -------------------------------------------------------------
const bookmarksDrawer = document.getElementById("bookmarks-drawer");
const bookmarksBackdrop = document.getElementById("bookmarks-backdrop");
const btnBookmarks = document.getElementById("btn-bookmarks");
const btnCloseBookmarks = document.getElementById("btn-close-bookmarks");
const bookmarksSearchInput = document.getElementById("bookmarks-search-input");
const bookmarksFolderTabs = document.getElementById("bookmarks-folders-tabs");
const bookmarksList = document.getElementById("bookmarks-list");
const btnSyncBookmarksChips = document.getElementById("btn-sync-bookmarks-chips");

let allBookmarks = [];
let bookmarkFolders = ["All"];
let activeBookmarkFolder = "All";

async function loadBookmarks() {
  allBookmarks = [];
  bookmarkFolders = ["All"];
  let hasChromeApi = typeof chrome !== "undefined" && Boolean(chrome?.bookmarks?.getTree);

  if (hasChromeApi) {
    try {
      const tree = await new Promise((resolve, reject) => {
        try {
          chrome.bookmarks.getTree((nodes) => {
            if (chrome.runtime?.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve(nodes);
            }
          });
        } catch (err) {
          reject(err);
        }
      });

      if (tree && tree.length > 0) {
        const root = tree[0];
        if (root.children && root.children.length > 0) {
          root.children.forEach((childFolder) => {
            parseBookmarkNodes(childFolder, childFolder.title || "Bookmarks Bar");
          });
        } else {
          parseBookmarkNodes(root, "");
        }
      }
    } catch (err) {
      console.warn("Chrome Bookmarks API error:", err);
      hasChromeApi = false;
    }
  }

  renderBookmarkFolderTabs();
  renderBookmarksList(hasChromeApi);
}

function parseBookmarkNodes(node, folderName) {
  if (!node) return;

  if (node.url) {
    allBookmarks.push({
      id: node.id || String(Math.random()),
      title: node.title || node.url,
      url: node.url,
      folder: folderName || "Bookmarks Bar",
    });
  }

  if (node.children && node.children.length > 0) {
    const currentFolder = node.title || folderName;
    if (currentFolder && !bookmarkFolders.includes(currentFolder)) {
      bookmarkFolders.push(currentFolder);
    }
    node.children.forEach((child) => {
      parseBookmarkNodes(child, currentFolder);
    });
  }
}

function renderBookmarkFolderTabs() {
  if (!bookmarksFolderTabs) return;
  bookmarksFolderTabs.innerHTML = "";

  bookmarkFolders.forEach((folder) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `folder-tab-btn${folder === activeBookmarkFolder ? " active" : ""}`;
    btn.textContent = folder;
    btn.addEventListener("click", () => {
      activeBookmarkFolder = folder;
      renderBookmarkFolderTabs();
      renderBookmarksList();
    });
    bookmarksFolderTabs.appendChild(btn);
  });
}

function renderBookmarksList(hasChromeApi = true) {
  if (!bookmarksList) return;
  bookmarksList.innerHTML = "";

  if (!hasChromeApi && allBookmarks.length === 0) {
    const banner = document.createElement("div");
    banner.className = "bookmarks-permission-banner";
    banner.innerHTML = `
      <div class="banner-title">⚠️ Extension Reload Required</div>
      <p class="banner-desc">
        Chrome requires a one-time reload after updating extension permissions so it can access your Bookmarks Bar.
      </p>
      <div class="banner-steps">
        <div>1. Open <span class="code-badge">chrome://extensions</span> in a new tab</div>
        <div>2. Click the <strong>🔄 Reload</strong> icon on <strong>AMOLED New Tab</strong></div>
        <div>3. Refresh this page</div>
      </div>
      <button type="button" id="btn-copy-ext-url" class="btn-drawer-action" style="margin-top: 4px;">
        Copy "chrome://extensions"
      </button>
    `;
    const copyBtn = banner.querySelector("#btn-copy-ext-url");
    if (copyBtn) {
      copyBtn.addEventListener("click", () => {
        navigator.clipboard.writeText("chrome://extensions");
        showToast("Copied chrome://extensions to clipboard");
      });
    }
    bookmarksList.appendChild(banner);
    return;
  }

  const query = (bookmarksSearchInput?.value || "").trim().toLowerCase();

  const filtered = allBookmarks.filter((bm) => {
    const matchesFolder = activeBookmarkFolder === "All" || bm.folder === activeBookmarkFolder;
    if (!matchesFolder) return false;
    if (!query) return true;
    return (
      bm.title.toLowerCase().includes(query) ||
      bm.url.toLowerCase().includes(query)
    );
  });

  if (filtered.length === 0) {
    const empty = document.createElement("div");
    empty.className = "bookmarks-empty";
    empty.textContent = query
      ? `No bookmarks matching "${query}"`
      : "No bookmarks in this folder";
    bookmarksList.appendChild(empty);
    return;
  }

  filtered.forEach((bm) => {
    let hostname = "";
    try {
      hostname = new URL(bm.url).hostname.replace(/^www./, "");
    } catch {
      hostname = bm.url;
    }

    const item = document.createElement("div");
    item.className = "bookmark-item";
    item.setAttribute("role", "button");
    item.tabIndex = 0;

    const left = document.createElement("div");
    left.className = "bookmark-left";

    const img = document.createElement("img");
    img.className = "bookmark-icon";
    img.src = `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`;
    img.alt = "";
    img.onerror = () => {
      img.style.display = "none";
      const letter = document.createElement("div");
      letter.className = "bookmark-letter-icon";
      letter.textContent = (bm.title || hostname || "?").charAt(0).toUpperCase();
      left.prepend(letter);
    };

    const info = document.createElement("div");
    info.className = "bookmark-info";

    const title = document.createElement("span");
    title.className = "bookmark-title";
    title.textContent = bm.title;

    const domain = document.createElement("span");
    domain.className = "bookmark-domain";
    domain.textContent = hostname;

    if (activeBookmarkFolder === "All" && bm.folder) {
      const folderBadge = document.createElement("span");
      folderBadge.className = "bookmark-folder-badge";
      folderBadge.textContent = "📁 " + bm.folder;
      domain.append(folderBadge);
    }

    info.append(title, domain);
    left.append(img, info);

    const actions = document.createElement("div");
    actions.className = "bookmark-actions";

    item.draggable = true;
    item.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("application/json", JSON.stringify({
        name: bm.title,
        url: bm.url,
      }));
      e.dataTransfer.effectAllowed = "copy";
      item.classList.add("is-dragging");
    });
    item.addEventListener("dragend", () => {
      item.classList.remove("is-dragging");
    });

    const pinBtn = document.createElement("button");
    pinBtn.type = "button";
    pinBtn.className = "btn-pin-chip";
    pinBtn.textContent = "+ Pin";
    pinBtn.title = "Add to shortcut chips (or drag onto any chip)";
    pinBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      pinBookmarkToChips(bm);
    });

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "btn-delete-bookmark";
    delBtn.textContent = "×";
    delBtn.title = "Delete bookmark";
    delBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      if (confirm(`Delete bookmark "${bm.title}"?`)) {
        if (typeof chrome !== "undefined" && chrome?.bookmarks?.remove) {
          try {
            await new Promise((res) => chrome.bookmarks.remove(bm.id, res));
          } catch (err) {
            console.warn("Remove bookmark error:", err);
          }
        }
        allBookmarks = allBookmarks.filter((b) => b.id !== bm.id);
        item.remove();
        showToast(`Deleted "${bm.title}"`);
      }
    });

    actions.append(pinBtn, delBtn);
    item.append(left, actions);

    const openBookmark = () => {
      if (settings.openInNewTab) {
        window.open(bm.url, "_blank", "noopener,noreferrer");
      } else {
        window.location.href = bm.url;
      }
    };

    item.addEventListener("click", openBookmark);
    item.addEventListener("keydown", (e) => {
      if (e.key === "Enter") openBookmark();
    });

    bookmarksList.appendChild(item);
  });
}

async function pinBookmarkToChips(bm) {
  let hostname = "";
  try {
    hostname = new URL(bm.url).hostname.replace(/^www./, "");
  } catch {
    hostname = bm.url;
  }
  const cleanName = bm.title.trim().length > 0 ? bm.title.trim().slice(0, 18) : hostname;

  const emptyIndex = shortcuts.findIndex((c) => isEmptyChip(c));
  if (emptyIndex >= 0) {
    shortcuts[emptyIndex] = {
      id: shortcuts[emptyIndex].id || `custom-${Date.now()}`,
      name: cleanName,
      url: bm.url,
    };
  } else if (shortcuts.length < MAX_CHIPS) {
    shortcuts.push({
      id: `custom-${Date.now()}`,
      name: cleanName,
      url: bm.url,
    });
  } else {
    shortcuts[MAX_CHIPS - 1] = {
      id: `custom-${Date.now()}`,
      name: cleanName,
      url: bm.url,
    };
  }

  await persistShortcuts();
  renderChips();
  showToast(`Pinned "${cleanName}" to chips`);
}

async function syncBookmarksToChips() {
  if (allBookmarks.length === 0) {
    showToast("No bookmarks found to sync");
    return;
  }

  const candidatePool = allBookmarks.filter((b) =>
    activeBookmarkFolder !== "All" ? b.folder === activeBookmarkFolder : true
  );
  const toSync = (candidatePool.length > 0 ? candidatePool : allBookmarks).slice(0, MAX_CHIPS);

  shortcuts = toSync.map((bm, idx) => {
    let hostname = "";
    try {
      hostname = new URL(bm.url).hostname.replace(/^www./, "");
    } catch {
      hostname = bm.url;
    }
    const cleanName = bm.title.trim().length > 0 ? bm.title.trim().slice(0, 18) : hostname;
    return {
      id: `synced-${idx}-${Date.now()}`,
      name: cleanName,
      url: bm.url,
    };
  });

  await persistShortcuts();
  renderChips();
  showToast(`Synced ${toSync.length} bookmarks to shortcut chips!`);
}

function openBookmarksDrawer() {
  if (!bookmarksDrawer) return;
  loadBookmarks();
  bookmarksDrawer.classList.remove("hidden");
  if (bookmarksBackdrop) bookmarksBackdrop.classList.remove("hidden");
  document.body.classList.add("drawer-open");
  if (bookmarksSearchInput) {
    bookmarksSearchInput.value = "";
    setTimeout(() => bookmarksSearchInput.focus(), 150);
  }
}

function closeBookmarksDrawer() {
  if (!bookmarksDrawer) return;
  bookmarksDrawer.classList.add("hidden");
  if (bookmarksBackdrop) bookmarksBackdrop.classList.add("hidden");
  document.body.classList.remove("drawer-open");
}

function toggleBookmarksDrawer() {
  if (bookmarksDrawer && !bookmarksDrawer.classList.contains("hidden")) {
    closeBookmarksDrawer();
  } else {
    openBookmarksDrawer();
  }
}

function setupBookmarksBridge() {
  const btnNewBookmark = document.getElementById("btn-new-bookmark");
  const bookmarksAddForm = document.getElementById("bookmarks-add-form");
  const btnCancelAddBm = document.getElementById("btn-cancel-add-bm");
  const bmInputTitle = document.getElementById("bm-input-title");
  const bmInputUrl = document.getElementById("bm-input-url");

  if (bookmarksDrawer) {
    bookmarksDrawer.addEventListener("wheel", (e) => {
      e.stopPropagation();
    }, { passive: true });
  }
  if (btnBookmarks) {
    btnBookmarks.addEventListener("click", toggleBookmarksDrawer);
  }
  if (btnCloseBookmarks) {
    btnCloseBookmarks.addEventListener("click", closeBookmarksDrawer);
  }
  if (bookmarksBackdrop) {
    bookmarksBackdrop.addEventListener("click", closeBookmarksDrawer);
  }
  if (bookmarksSearchInput) {
    bookmarksSearchInput.addEventListener("input", renderBookmarksList);
  }
  if (btnSyncBookmarksChips) {
    btnSyncBookmarksChips.addEventListener("click", syncBookmarksToChips);
  }

  if (btnNewBookmark && bookmarksAddForm) {
    btnNewBookmark.addEventListener("click", () => {
      bookmarksAddForm.classList.toggle("hidden");
      if (!bookmarksAddForm.classList.contains("hidden")) {
        bmInputTitle.focus();
      }
    });
  }
  if (btnCancelAddBm && bookmarksAddForm) {
    btnCancelAddBm.addEventListener("click", () => {
      bookmarksAddForm.classList.add("hidden");
    });
  }
  if (bookmarksAddForm) {
    bookmarksAddForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const title = (bmInputTitle.value || "").trim();
      let url = (bmInputUrl.value || "").trim();
      if (!title || !url) return;
      if (!/^https?:\/\//i.test(url)) url = "https://" + url;

      if (typeof chrome !== "undefined" && chrome?.bookmarks?.create) {
        try {
          await new Promise((res) => chrome.bookmarks.create({ title, url }, res));
        } catch (err) {
          console.warn("Create bookmark error:", err);
        }
      } else {
        allBookmarks.unshift({
          id: `bm-${Date.now()}`,
          title,
          url,
          folder: activeBookmarkFolder === "All" ? "Bookmarks Bar" : activeBookmarkFolder,
        });
      }

      showToast(`Added "${title}" to bookmarks!`);
      bookmarksAddForm.reset();
      bookmarksAddForm.classList.add("hidden");
      await loadBookmarks();
    });
  }
}

// -------------------------------------------------------------

function setupCuriosityFocus() {
  const targets = document.querySelectorAll(".chip, #clock, blockquote, #top-controls button, #zoom-controls button");
  targets.forEach((target) => {
    if (target.dataset.hasCuriosityListener) return;
    target.dataset.hasCuriosityListener = "true";

    target.addEventListener("mouseenter", () => {
      if (!eyesDisplay) return;
      const rect = target.getBoundingClientRect();
      eyesDisplay.setFocusTarget({
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      });
    });

    target.addEventListener("mouseleave", () => {
      if (!eyesDisplay) return;
      eyesDisplay.setFocusTarget(null);
    });
  });
}


// Immediate synchronous warm render from cache to eliminate CLS / pop-in
try {
  tick();
  const syncQuote = localStorage.getItem("quoteCache");
  if (syncQuote) {
    const q = JSON.parse(syncQuote);
    if (q && q.text) renderQuote(q);
  }
  const syncShortcuts = localStorage.getItem("shortcuts");
  if (syncShortcuts) {
    const sc = JSON.parse(syncShortcuts);
    if (Array.isArray(sc) && sc.length) {
      shortcuts = sc;
      renderChips();
    }
  }
} catch {}

// Initialization
// -------------------------------------------------------------
async function init() {
  tick();
  setInterval(tick, 1000);

  settings = await loadSettings();
  shortcuts = await loadShortcuts();

  eyesDisplay = new EyesDisplay(ascii, {
    variant: settings.eyeVariant,
    ramp: settings.eyeRamp,
    follow: settings.eyeFollow,
    blinkRate: settings.eyeBlinkRate,
    idleSleep: settings.eyeIdleSleep,
  });

  applySettings(settings, true);
  setupSettingsTabs();
  setupSettingsListeners();
  setupQuoteCopy();
  setupLongPress();
  setupCursorAura();
  setupClickRipples();
  setupScrollPhysics();
  loadQuote();
  renderChips();
  setupIdleAndHotkeys();
  setupBookmarksBridge();
  setupSearchBar();
  setupCuriosityFocus();

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      mainEl?.classList.add("ready");
    });
  });
}

init();
