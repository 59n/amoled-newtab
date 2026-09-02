import {
  loadShortcuts,
  saveShortcuts,
  saveWithToast,
  isEmptyChip,
  newId,
  normalizeUrl,
  loadQuoteCache,
  saveQuoteCache,
} from "./storage.js";
import { loadAscii, loadFallbacks, truncateQuote } from "./ascii.js";

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

ascii.addEventListener("click", () => loadAscii(ascii));
loadAscii(ascii);
loadQuote();

const chipsEl = document.getElementById("chips");
const toastEl = document.getElementById("toast");
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
    const el = document.createElement("button");
    el.type = "button";
    el.className = "chip" + (isEmptyChip(chip) ? " empty" : "");
    el.dataset.id = chip.id;
    if (isEmptyChip(chip)) {
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
    el.addEventListener("click", () => {
      if (isEmptyChip(chip)) openEditor(chip.id);
      else location.assign(chip.url);
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

function openEditor(_id) {
  /* Task 8 */
}

async function bootChips() {
  shortcuts = await loadShortcuts();
  renderChips();
}

bootChips();
