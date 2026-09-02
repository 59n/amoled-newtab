import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_SHORTCUTS,
  isEmptyChip,
  normalizeUrl,
  loadShortcuts,
  saveShortcuts,
  loadArtCache,
  saveArtCache,
  loadQuoteCache,
  saveQuoteCache,
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

class MapStorage {
  constructor() { this.m = new Map(); }
  getItem(k) { return this.m.has(k) ? this.m.get(k) : null; }
  setItem(k, v) { this.m.set(k, String(v)); }
}
