import {
  loadShortcuts,
  saveShortcuts,
  saveWithToast,
  isEmptyChip,
  newId,
  normalizeUrl,
  loadQuoteCache,
  saveQuoteCache,
  loadScale,
  saveScale,
  clampScale,
  SCALE_STEP,
} from "./storage.js";
import { loadFallbacks, truncateQuote } from "./ascii.js";
import { EyesDisplay } from "./eyes-display.js";

const clock = document.getElementById("clock");
const ascii = document.getElementById("ascii");
const quoteEl = document.getElementById("quote");
const authorEl = document.getElementById("author");

function formatTime(d) {
  const pad = (n) => String(n).padStart(2, "0");
  let h = d.getHours();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${pad(d.getMinutes())}:${pad(d.getSeconds())} ${ampm}`;
}

function tick() {
  clock.textContent = formatTime(new Date());
}

tick();
setInterval(tick, 1000);

function renderQuote(q) {
  quoteEl.textContent = `"${truncateQuote(q.text)}"`;
  authorEl.textContent = q.author || "";
}

async function loadQuote() {
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

new EyesDisplay(ascii);
loadQuote();

const chipsEl = document.getElementById("chips");
const toastEl = document.getElementById("toast");
const menu = document.getElementById("menu");
const overlay = document.getElementById("overlay");
const overlayList = document.getElementById("overlay-list");
const overlayAdd = document.getElementById("overlay-add");
const gear = document.getElementById("gear");
const MAX_CHIPS = 8;
let shortcuts = [];

function favicon(url) {
  try {
    return `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=32`;
  } catch {
    return "";
  }
}

function renderChips() {
  chipsEl.replaceChildren();
  for (const chip of shortcuts) {
    const empty = isEmptyChip(chip);
    const el = document.createElement(empty ? "button" : "a");
    if (empty) el.type = "button";
    else {
      el.href = chip.url;
      el.rel = "noopener noreferrer";
    }
    el.className = "chip" + (empty ? " empty" : "");
    el.dataset.id = chip.id;
    if (empty) {
      el.setAttribute("aria-label", "Empty shortcut");
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
      el.append(chip.name);
    }
    el.addEventListener("click", (e) => {
      if (empty) {
        openEditor(chip.id);
        return;
      }
      if (e.button === 1 || e.metaKey || e.ctrlKey) return;
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
      await persist();
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

function letterEl(name) {
  const s = document.createElement("span");
  s.className = "letter";
  s.textContent = (name || "?").slice(0, 1).toUpperCase();
  return s;
}

const modal = document.getElementById("modal");
const fieldName = document.getElementById("field-name");
const fieldUrl = document.getElementById("field-url");
const modalError = document.getElementById("modal-error");
const modalTitle = document.getElementById("modal-title");
let editingId = null; // null means append on save

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

async function persist() {
  await saveWithToast(() => saveShortcuts(shortcuts), toastEl);
}

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
      await persist();
      renderChips();
    });
  }
  item("Delete", async () => {
    shortcuts = shortcuts.filter((c) => c.id !== chip.id);
    await persist();
    renderChips();
  });
  menu.classList.remove("hidden");
  menu.style.left = `${x}px`;
  menu.style.top = `${y}px`;
}

function closeMenu() {
  menu.classList.add("hidden");
}

document.addEventListener("click", () => closeMenu());

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
  await persist();
  renderChips();
  renderOverlay();
  closeModal();
}

document.getElementById("modal-save").addEventListener("click", saveEditor);
document.getElementById("modal-cancel").addEventListener("click", closeModal);
modal.addEventListener("click", (e) => {
  if (e.target === modal) closeModal();
});

function renderOverlay() {
  overlayList.replaceChildren();
  shortcuts.forEach((chip, index) => {
    const li = document.createElement("li");
    const label = document.createElement("span");
    label.textContent = isEmptyChip(chip) ? "empty" : chip.name;
    const actions = document.createElement("div");
    actions.className = "actions";
    const btn = (text, fn) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = text;
      b.addEventListener("click", fn);
      return b;
    };
    if (index > 0) actions.append(btn("up", () => moveChip(chip.id, -1)));
    if (index < shortcuts.length - 1) actions.append(btn("down", () => moveChip(chip.id, 1)));
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
  await persist();
  renderChips();
  renderOverlay();
}

async function clearChip(id) {
  shortcuts = shortcuts.map((c) => (c.id === id ? { ...c, name: "", url: "" } : c));
  await persist();
  renderChips();
  renderOverlay();
}

async function deleteChip(id) {
  shortcuts = shortcuts.filter((c) => c.id !== id);
  await persist();
  renderChips();
  renderOverlay();
}

function openOverlay() {
  renderOverlay();
  overlay.classList.remove("hidden");
}
function closeOverlay() {
  overlay.classList.add("hidden");
}

gear.addEventListener("click", openOverlay);
overlayAdd.addEventListener("click", () => openEditor(null));
overlay.addEventListener("click", (e) => {
  if (e.target === overlay) closeOverlay();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeOverlay();
    closeModal();
    closeMenu();
  }
});

async function bootChips() {
  shortcuts = await loadShortcuts();
  renderChips();
}

let pageScale = 1;
const scaleRange = document.getElementById("scale-range");
const scaleLabel = document.getElementById("scale-label");

function applyScale(n, persist = true) {
  pageScale = clampScale(n);
  document.documentElement.style.setProperty("--page-scale", String(pageScale));
  const pct = Math.round(pageScale * 100);
  scaleRange.value = String(pct);
  scaleLabel.textContent = `${pct}%`;
  if (persist) saveWithToast(() => saveScale(pageScale), toastEl);
}

document.getElementById("zoom-out").addEventListener("click", () => {
  applyScale(pageScale - SCALE_STEP);
});
document.getElementById("zoom-in").addEventListener("click", () => {
  applyScale(pageScale + SCALE_STEP);
});
document.getElementById("scale-down").addEventListener("click", () => {
  applyScale(pageScale - SCALE_STEP);
});
document.getElementById("scale-up").addEventListener("click", () => {
  applyScale(pageScale + SCALE_STEP);
});
scaleRange.addEventListener("input", () => {
  applyScale(Number(scaleRange.value) / 100, false);
});
scaleRange.addEventListener("change", () => {
  applyScale(Number(scaleRange.value) / 100);
});

bootChips();
loadScale().then((n) => applyScale(n, false));
