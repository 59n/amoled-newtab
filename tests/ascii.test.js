import { test } from "node:test";
import assert from "node:assert/strict";
import { RAMP, pixelsToAscii, truncateQuote, normalizeArt, artFits, isDividerLabel } from "../ascii.js";
import { renderEyes, randomEyeParams, EYE_PRESETS } from "../eyes.js";

function rgba(w, h, fill) {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    data.set(fill, i * 4);
  }
  return data;
}

function glyphs(art) {
  return [...art].filter((c) => c !== "\n");
}

test("black pixels become the darkest ramp char", () => {
  const art = pixelsToAscii(rgba(8, 8, [0, 0, 0, 255]), 8, 8, 8, 8);
  assert.ok(glyphs(art).every((c) => c === RAMP[0]));
});

test("white pixels become the lightest ramp char", () => {
  const art = pixelsToAscii(rgba(8, 8, [255, 255, 255, 255]), 8, 8, 8, 8);
  const last = RAMP[RAMP.length - 1];
  assert.ok(glyphs(art).every((c) => c === last));
});

test("caps rows at maxRows", () => {
  const art = pixelsToAscii(rgba(10, 100, [128, 128, 128, 255]), 10, 100, 10, 4);
  assert.equal(art.split("\n").length, 4);
});

test("truncateQuote caps at 140 with ellipsis", () => {
  assert.equal(truncateQuote("short"), "short");
  const long = "a".repeat(141);
  const out = truncateQuote(long);
  assert.equal(out.length, 140);
  assert.equal(out.endsWith("…"), true);
});

test("normalizeArt unifies newlines", () => {
  assert.equal(normalizeArt("a\r\nb\rc"), "a\nb\nc");
});

test("artFits rejects tiny, huge, and empty", () => {
  assert.equal(artFits("/\\_/\\\n( o.o )\n > ^ <"), true);
  assert.equal(artFits("hi"), false);
  assert.equal(artFits(["x".repeat(200), "y", "z"].join("\n")), false);
  assert.equal(artFits(""), false);
});

test("isDividerLabel skips divider categories", () => {
  assert.equal(isDividerLabel("Art and design,Dividers"), true);
  assert.equal(isDividerLabel("Animals,Cats"), false);
});

test("renderEyes draws a pair of eyes", () => {
  const art = renderEyes({ name: "open", lid: 0.12, cols: 88, rows: 16 });
  const lines = art.split("\n");
  assert.ok(lines.length >= 5);
  assert.ok(art.includes("S") || art.includes("X") || art.includes("#"));
  const nonempty = lines.filter((l) => /[^\s.]/.test(l));
  assert.ok(nonempty.length >= 4);
});

test("eye presets each produce unique output", () => {
  const seen = new Set(EYE_PRESETS.map((p) => renderEyes({ ...p })));
  assert.ok(seen.size >= EYE_PRESETS.length - 1);
});

test("randomEyeParams stays in range", () => {
  for (let i = 0; i < 20; i++) {
    const p = randomEyeParams();
    assert.ok(p.lid >= 0 && p.lid <= 1);
    assert.ok(p.lookX >= -0.5 && p.lookX <= 0.5);
  }
});
