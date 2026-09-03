import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_SHORTCUTS,
  DEFAULT_SETTINGS,
  isEmptyChip,
  normalizeUrl,
  loadShortcuts,
  saveShortcuts,
  loadArtCache,
  saveArtCache,
  loadQuoteCache,
  saveQuoteCache,
  clampScale,
  loadScale,
  saveScale,
  loadSettings,
  saveSettings,
  DEFAULT_SCALE,
} from "../storage.js";

test("defaults are four sites plus three empty slots", () => {
  assert.equal(DEFAULT_SHORTCUTS.length, 7);
  assert.equal(DEFAULT_SHORTCUTS[0].name, "YouTube");
  assert.equal(DEFAULT_SHORTCUTS[0].url, "https://www.youtube.com");
  assert.equal(DEFAULT_SHORTCUTS[1].name, "GitHub");
  assert.equal(DEFAULT_SHORTCUTS[1].url, "https://github.com");
  assert.equal(DEFAULT_SHORTCUTS[2].name, "Reddit");
  assert.equal(DEFAULT_SHORTCUTS[2].url, "https://www.reddit.com");
  assert.equal(DEFAULT_SHORTCUTS[3].name, "Cronometer");
  assert.equal(DEFAULT_SHORTCUTS[3].url, "https://cronometer.com");
  assert.equal(DEFAULT_SHORTCUTS.filter(isEmptyChip).length, 3);
});

test("isEmptyChip requires both name and url blank", () => {
  assert.equal(isEmptyChip({ name: "", url: "" }), true);
  assert.equal(isEmptyChip({ name: "x", url: "" }), false);
});

test("normalizeUrl prefixes https and accepts absolute URLs", () => {
  assert.equal(normalizeUrl("youtube.com"), "https://youtube.com/");
  assert.equal(normalizeUrl("https://github.com"), "https://github.com/");
});

test("normalizeUrl rejects empty and garbage", () => {
  assert.throws(() => normalizeUrl(""));
  assert.throws(() => normalizeUrl("http://"));
});

test("loadShortcuts seeds defaults once, then persists edits", async () => {
  globalThis.localStorage = new MapStorage();
  const first = await loadShortcuts();
  assert.equal(first.length, 7);
  first[0] = { ...first[0], name: "YT" };
  await saveShortcuts(first);
  const second = await loadShortcuts();
  assert.equal(second[0].name, "YT");
  assert.equal(second.length, 7);
});

test("art and quote caches round-trip", async () => {
  globalThis.localStorage = new MapStorage();
  assert.equal(await loadArtCache(), null);
  await saveArtCache("@@@");
  assert.equal(await loadArtCache(), "@@@");
  await saveQuoteCache({ text: "hi", author: "x" });
  assert.deepEqual(await loadQuoteCache(), { text: "hi", author: "x" });
});

test("clampScale keeps zoom between 70% and 200%", () => {
  assert.equal(clampScale(1), 1);
  assert.equal(clampScale(0.1), 0.7);
  assert.equal(clampScale(9), 2);
  assert.equal(clampScale("nope"), DEFAULT_SCALE);
});

test("scale persists", async () => {
  globalThis.localStorage = new MapStorage();
  assert.equal(await loadScale(), DEFAULT_SCALE);
  await saveScale(1.4);
  assert.equal(await loadScale(), 1.4);
});

test("loadSettings merges defaults and persists changes", async () => {
  globalThis.localStorage = new MapStorage();
  const settings = await loadSettings();
  assert.equal(settings.theme, "amoled");
  assert.equal(settings.timeFormat, "12h");
  assert.equal(settings.eyeVariant, "classic");

  await saveSettings({ ...settings, theme: "matrix", timeFormat: "24h", eyeVariant: "wide" });
  const updated = await loadSettings();
  assert.equal(updated.theme, "matrix");
  assert.equal(updated.timeFormat, "24h");
  assert.equal(updated.eyeVariant, "wide");
  assert.equal(updated.showClock, true);
});

test("corrupt localStorage is treated as a cache miss", async () => {
  globalThis.localStorage = new MapStorage();
  localStorage.setItem("sync:shortcuts", "not-json");
  localStorage.setItem("sync:settings", "not-json");
  localStorage.setItem("local:drawnArt", "not-json");
  const shortcuts = await loadShortcuts();
  assert.equal(shortcuts.length, 7);
  const settings = await loadSettings();
  assert.equal(settings.theme, DEFAULT_SETTINGS.theme);
  assert.equal(await loadArtCache(), null);
});

class MapStorage {
  constructor() { this.m = new Map(); }
  getItem(k) { return this.m.has(k) ? this.m.get(k) : null; }
  setItem(k, v) { this.m.set(k, String(v)); }
}
