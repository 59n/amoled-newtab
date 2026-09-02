export const EYE_RAMP = " .':;-+*=oxXS#@$";

export const EYE_PRESETS = [
  { name: "abyss", lid: 0.58, lookX: 0, lookY: 0.06, angry: 0, sad: 0 },
  { name: "open", lid: 0.12, lookX: 0, lookY: 0, angry: 0, sad: 0 },
  { name: "wide", lid: 0.02, lookX: 0, lookY: 0, angry: 0, sad: 0, rx: 0.16, ry: 0.28 },
  { name: "sleepy", lid: 0.7, lookX: 0, lookY: 0.1, angry: 0, sad: 0.2 },
  { name: "left", lid: 0.22, lookX: -0.32, lookY: 0, angry: 0, sad: 0 },
  { name: "right", lid: 0.22, lookX: 0.32, lookY: 0, angry: 0, sad: 0 },
  { name: "up", lid: 0.18, lookX: 0, lookY: -0.24, angry: 0, sad: 0 },
  { name: "down", lid: 0.32, lookX: 0, lookY: 0.22, angry: 0, sad: 0.08 },
  { name: "glare", lid: 0.38, lookX: 0, lookY: 0, angry: 0.7, sad: 0 },
  { name: "sad", lid: 0.34, lookX: 0, lookY: 0.1, angry: 0, sad: 0.75 },
  { name: "winkL", lid: 0.2, lookX: 0.12, lookY: 0, winkL: 1, winkR: 0 },
  { name: "winkR", lid: 0.2, lookX: -0.12, lookY: 0, winkL: 0, winkR: 1 },
  { name: "closed", lid: 0.78, lookX: 0, lookY: 0, angry: 0, sad: 0 },
  { name: "far", lid: 0.22, lookX: 0, lookY: 0, spread: 0.42 },
  { name: "close", lid: 0.24, lookX: 0, lookY: 0, spread: 0.27 },
  { name: "tired", lid: 0.52, lookX: 0, lookY: 0.08, bags: 1 },
];

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function mix(a, b, t) {
  return a + (b - a) * t;
}

export function randomEyeParams() {
  const base = EYE_PRESETS[Math.floor(Math.random() * EYE_PRESETS.length)];
  return {
    cols: 88,
    rows: 16,
    spread: 0.33,
    rx: 0.145,
    ry: 0.26,
    winkL: 0,
    winkR: 0,
    bags: 0,
    angry: 0,
    sad: 0,
    ...base,
    lid: clamp((base.lid ?? 0.2) + (Math.random() - 0.5) * 0.06, 0, 0.95),
    lookX: clamp((base.lookX || 0) + (Math.random() - 0.5) * 0.1, -0.42, 0.42),
    lookY: clamp((base.lookY || 0) + (Math.random() - 0.5) * 0.06, -0.28, 0.28),
  };
}

function almond(nx, ny) {
  return Math.pow(Math.abs(nx), 2.05) + Math.pow(Math.abs(ny), 1.7);
}

function oneEye(nx, ny, p, extraLid) {
  const lid = clamp((p.lid || 0) + extraLid, 0, 1);
  const a = almond(nx, ny);
  if (a > 1.12) return 0;

  const edge = clamp(1 - a, 0, 1);
  const lidLine = mix(-0.92, 0.62, lid)
    + nx * nx * 0.28
    + (p.angry || 0) * Math.abs(nx) * 0.45
    - (p.sad || 0) * Math.abs(nx) * 0.4;

  if (ny < lidLine - 0.08) return 0;

  const lidBand = ny < lidLine + 0.14;
  let lum = 0;

  if (lidBand && ny >= lidLine - 0.08) {
    lum = mix(0.45, 0.85, edge);
  }

  if (ny >= lidLine) {
    lum = Math.max(lum, mix(0.28, 0.55, Math.pow(edge, 0.7)));

    const ix = nx - (p.lookX || 0);
    const iy = ny - (p.lookY || 0);
    const iris = (ix * ix) / 0.2 + (iy * iy) / 0.26;
    if (iris < 1) lum = mix(0.62, 0.92, 1 - iris * 0.7);

    const pupil = (ix * ix) / 0.038 + (iy * iy) / 0.05;
    if (pupil < 1) lum = mix(0.06, 0.22, pupil);

    const hx = ix - 0.13;
    const hy = iy + 0.08;
    if (hx * hx + hy * hy < 0.01) lum = 1;

    const lower = mix(0.62, 0.22, lid);
    if (ny > lower) lum *= clamp(1 - (ny - lower) * 3.4, 0, 1);
  }

  lum *= mix(0.25, 1, Math.pow(edge, 0.55));
  if (lid > 0.72) {
    const t = (lid - 0.72) / 0.28;
    const band = Math.exp(-Math.pow(ny * 4.2, 2));
    const slit = almond(nx, ny * 2.4) < 1 ? band * mix(0.55, 0.95, 1 - Math.abs(nx)) : 0;
    lum = mix(lum, Math.max(lum, slit), t);
  }
  return lum;
}

function trimFrame(art) {
  const lines = art.split("\n");
  const blank = (l) => !/[^\s.]/.test(l);
  let a = 0;
  let b = lines.length - 1;
  while (a < b && blank(lines[a])) a++;
  while (b > a && blank(lines[b])) b--;
  const pad = lines[0] ? " ".repeat(lines[0].length) : "";
  return [pad, ...lines.slice(Math.max(0, a - 1), b + 2), pad].join("\n");
}

export function renderEyes(p) {
  const cols = p.cols || 88;
  const rows = p.rows || 16;
  const cy = rows * 0.5;
  const spread = p.spread || 0.33;
  const cxL = cols * (0.5 - spread);
  const cxR = cols * (0.5 + spread);
  const rx = cols * (p.rx || 0.145);
  const ry = rows * (p.ry || 0.26);
  const ramp = EYE_RAMP;

  const lines = [];
  for (let y = 0; y < rows; y++) {
    let line = "";
    for (let x = 0; x < cols; x++) {
      let lum = 0;
      if ((x * 17 + y * 11) % 13 === 0) lum = 0.06;

      const nxl = (x + 0.5 - cxL) / rx;
      const nyl = (y + 0.5 - cy) / ry;
      const nxr = (x + 0.5 - cxR) / rx;
      const nyr = (y + 0.5 - cy) / ry;

      lum = Math.max(
        lum,
        oneEye(nxl, nyl, p, p.winkL ? 0.75 : 0),
        oneEye(nxr, nyr, p, p.winkR ? 0.75 : 0),
      );

      if (p.bags) {
        for (const cx of [cxL, cxR]) {
          const dx = (x + 0.5 - cx) / (rx * 0.85);
          const dy = (y + 0.5 - (cy + ry * 0.85)) / (ry * 0.32);
          const bag = dx * dx + (dy * dy) * 1.4;
          if (bag < 1 && dy > 0) lum = Math.max(lum, mix(0.2, 0.05, bag));
        }
      }

      const idx = clamp(Math.floor(lum * (ramp.length - 0.001)), 0, ramp.length - 1);
      line += ramp[idx];
    }
    lines.push(line);
  }
  return trimFrame(lines.join("\n"));
}

export function renderEyesBlink(p, amount) {
  return renderEyes({ ...p, lid: clamp((p.lid || 0) + amount, 0, 1), winkL: 0, winkR: 0 });
}
