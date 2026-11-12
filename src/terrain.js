/* ------------------------------------------------------------------ */
/* Scale. One world unit is 4 m, the same on every axis, so distances  */
/* and heights on the board are true to the map. Map coordinates are   */
/* metres from Bagh Bhairab (x east, z south), from MAP (mapdata.js).  */
/* ------------------------------------------------------------------ */
const U = 0.25; // world units per metre
const [BX0, BX1, BZ0, BZ1] = MAP.bounds;
const MCX = (BX0 + BX1) / 2, MCZ = (BZ0 + BZ1) / 2;
const wX = (x) => (x - MCX) * U, wZ = (z) => (z - MCZ) * U; // map metres to world
const mX = (x) => x / U + MCX, mZ = (z) => z / U + MCZ; // and back
const ELEV0 = Math.min(...MAP.elev.h); // the lowest ground on the board sits at y = 0
const CONTOUR = 2; // metres between the cut layers
const CELL = 2; // metres per ground cell
const NX = (BX1 - BX0) / CELL, NZ = (BZ1 - BZ0) / CELL;
const BASE = 3; // depth of the earth block below the lowest ground, world units

// Ground elevation in metres above ELEV0, bilinear between the SRTM samples
function elevAt(x, z) {
  const E = MAP.elev, fx = clamp((x - E.x0) / E.step, 0, E.nx - 1.001), fz = clamp((z - E.z0) / E.step, 0, E.nz - 1.001);
  const i = Math.floor(fx), j = Math.floor(fz), u = fx - i, v = fz - j, h = (a, b) => E.h[b * E.nx + a];
  return (h(i, j) * (1 - u) + h(i + 1, j) * u) * (1 - v) + (h(i, j + 1) * (1 - u) + h(i + 1, j + 1) * u) * v - ELEV0;
}

/* ------------------------------------------------------------------ */
/* Ground cells: a smooth height and a map colour for each 2 m cell   */
/* ------------------------------------------------------------------ */
// Hypsometric tints, low to high, then the painted map features
const TINTS = ['#a4cc8e', '#bcd69a', '#d3dfa6', '#e3dfb0', '#ecd9b4', '#f2e2d0'];
const PAINT = { green: '#63964d', paved: '#e6e1dc', brick: '#c48966', common: '#e3b08e', school: '#dbc0a6', water: '#4fa3b8', road: '#fffaf2', track: '#e6e1dc', path: '#cfc8c0' };
const PAL = [...TINTS, ...Object.values(PAINT)].map((c) => new THREE.Color(c));
const PI = {}; Object.keys(PAINT).forEach((k, i) => { PI[k] = TINTS.length + i; });
const HQ = new Float32Array(NX * NZ); // ground height per cell, world units
const COL = new Uint8Array(NX * NZ);
const TOPM = Math.max(...MAP.elev.h) - ELEV0;
for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
  const e = elevAt(BX0 + (i + 0.5) * CELL, BZ0 + (j + 0.5) * CELL), q = Math.floor(e / CONTOUR) * CONTOUR;
  HQ[j * NX + i] = e * U; // smooth height; the 2 m bands only tint the colour
  COL[j * NX + i] = Math.min(TINTS.length - 1, Math.floor(q / TOPM * TINTS.length));
}
const cellOf = (x, z) => [Math.floor((x - BX0) / CELL), Math.floor((z - BZ0) / CELL)];
function inPoly(f, x, z) {
  let c = false;
  for (let a = 0, b = f.length - 2; a < f.length; b = a, a += 2) {
    if ((f[a + 1] > z) !== (f[b + 1] > z) && x < (f[b] - f[a]) * (z - f[a + 1]) / (f[b + 1] - f[a + 1]) + f[a]) c = !c;
  }
  return c;
}
// Footprint of an OSM polygon: centre, long-edge direction and size
function footprint(f) {
  const p = [];
  for (let k = 0; k < f.length; k += 2) p.push([f[k], f[k + 1]]);
  if (p.length > 1 && p[0][0] === p[p.length - 1][0] && p[0][1] === p[p.length - 1][1]) p.pop();
  const cx = p.reduce((s, q) => s + q[0], 0) / p.length, cz = p.reduce((s, q) => s + q[1], 0) / p.length;
  const e = (k) => [p[(k + 1) % p.length][0] - p[k][0], p[(k + 1) % p.length][1] - p[k][1]];
  const [ax, az] = e(0), [bx, bz] = e(1), a = Math.hypot(ax, az), b = Math.hypot(bx, bz);
  const ang = a >= b ? Math.atan2(az, ax) : Math.atan2(bz, bx);
  return { p, cx, cz, long: Math.max(a, b), short: Math.min(a, b), ang };
}
// Distance (m) from a point to a polygon's outline
function nearEdge(f, x, z) {
  let d = Infinity;
  for (let k = 0; k + 3 < f.length; k += 2) {
    const ax = f[k], az = f[k + 1], dx = f[k + 2] - ax, dz = f[k + 3] - az, L = dx * dx + dz * dz;
    const t = L ? clamp(((x - ax) * dx + (z - az) * dz) / L, 0, 1) : 0;
    d = Math.min(d, Math.hypot(x - ax - t * dx, z - az - t * dz));
  }
  return d;
}
// Cells whose centre lies in a polygon (map metres)
function polyCells(f) {
  const xs = f.filter((_, k) => k % 2 === 0), zs = f.filter((_, k) => k % 2 === 1), out = [];
  const [i0, j0] = cellOf(Math.min(...xs), Math.min(...zs)), [i1, j1] = cellOf(Math.max(...xs), Math.max(...zs));
  for (let j = Math.max(0, j0); j <= Math.min(NZ - 1, j1); j++) for (let i = Math.max(0, i0); i <= Math.min(NX - 1, i1); i++) {
    if (inPoly(f, BX0 + (i + 0.5) * CELL, BZ0 + (j + 0.5) * CELL)) out.push(j * NX + i);
  }
  return out;
}
for (const g of MAP.green) for (const c of polyCells(g.p)) COL[c] = PI.green;
for (const a of MAP.areas) for (const c of polyCells(a.p)) COL[c] = a.t === 'common' ? PI.common : a.t === 'school' ? PI.school : PI.paved;
// The six focus places, each from its true outline: levelled to the temple's ground and paved, and the houses
// within `margin` metres of the outline are left out so the lanes round it open and the temple shows
function frameOf(id) { const f = footprint(MAP.buildings.find((b) => b.id === id).p); return f; }
// A rectangle in a building's own frame (+x along its long side) as a map polygon
function frameRect(id, x0, x1, z0, z1) {
  const f = frameOf(id), c = Math.cos(f.ang), s = Math.sin(f.ang), out = [];
  for (const [x, z] of [[x0, z0], [x1, z0], [x1, z1], [x0, z1], [x0, z0]]) out.push(f.cx + x * c - z * s, f.cz + x * s + z * c);
  return out;
}
// One site per focus place (places.js), resolved to a map polygon
function sitePoly(F_) {
  const s = F_.site;
  if (s.rect) return frameRect(...s.rect);
  if (s.area) return MAP.areas.find((a) => a.n === s.area).p;
  if (s.commonAt) return MAP.areas.find((a) => a.t === 'common' && !a.n && inPoly(a.p, ...F_.at)).p;
  const out = [];
  for (let k = 0; k <= 16; k++) out.push(F_.at[0] + Math.cos(k / 16 * TAU) * s.circle, F_.at[1] + Math.sin(k / 16 * TAU) * s.circle);
  return out;
}
const SITES = Object.fromEntries(FOCUS.map((F_) => [F_.key, { poly: sitePoly(F_), at: F_.at, paint: F_.paint, margin: F_.margin }]));
for (const S_ of Object.values(SITES)) {
  const [ti, tj] = cellOf(...S_.at), h = HQ[tj * NX + ti];
  for (const c of polyCells(S_.poly)) { HQ[c] = h; COL[c] = PI[S_.paint]; }
}
const inSite = (x, z) => Object.values(SITES).find((S_) => inPoly(S_.poly, x, z) || nearEdge(S_.poly, x, z) < S_.margin);
// Ponds: water a metre below the lowest bank around them; Dey Pukhu is cut 3 m deep for its walled tank (pukhu.js)
for (const w of MAP.water) {
  const cs = polyCells(w);
  if (!cs.length) continue;
  const lo = Math.min(...cs.map((c) => HQ[c])) - (inPoly(w, -21.9, 68.7) ? 3 : 1) * U;
  for (const c of cs) { HQ[c] = lo; COL[c] = PI.water; }
}
// Corner heights: each the mean of the cells round it, so the surface runs smooth from cell to cell
const CH = new Float32Array((NX + 1) * (NZ + 1));
for (let j = 0; j <= NZ; j++) for (let i = 0; i <= NX; i++) {
  let s = 0, n = 0;
  for (const [a, b] of [[i - 1, j - 1], [i, j - 1], [i - 1, j], [i, j]]) if (a >= 0 && b >= 0 && a < NX && b < NZ) { s += HQ[b * NX + a]; n++; }
  CH[j * (NX + 1) + i] = s / n;
}
// Height of the ground surface under a world point (people and props stand on this), bilinear on the corners
function groundY(x, z) {
  const fx = clamp((mX(x) - BX0) / CELL, 0, NX - 0.001), fz = clamp((mZ(z) - BZ0) / CELL, 0, NZ - 0.001);
  const i = Math.floor(fx), j = Math.floor(fz), u = fx - i, v = fz - j, c = (a, b) => CH[b * (NX + 1) + a];
  return (c(i, j) * (1 - u) + c(i + 1, j) * u) * (1 - v) + (c(i, j + 1) * (1 - u) + c(i + 1, j + 1) * u) * v;
}

/* ------------------------------------------------------------------ */
/* The terrain mesh: one smooth surface coloured cell by cell, and the */
/* earth sides of the block down to its base                           */
/* ------------------------------------------------------------------ */
const terrain = (() => {
  const pos = [], nor = [], col = [], idx = [];
  const SIDE = new THREE.Color('#996244');
  const _a = new THREE.Vector3(), _b = new THREE.Vector3();
  const quad = (a, b, c, d, cl, n) => {
    if (!n) { _a.set(c[0] - a[0], c[1] - a[1], c[2] - a[2]); _b.set(d[0] - b[0], d[1] - b[1], d[2] - b[2]); _a.cross(_b).normalize(); n = [-_a.x, -_a.y, -_a.z]; if (n[1] < 0) n = n.map((v) => -v); }
    const v = pos.length / 3;
    for (const p of [a, b, c, d]) { pos.push(...p); nor.push(...n); col.push(cl.r, cl.g, cl.b); }
    idx.push(v, v + 1, v + 2, v, v + 2, v + 3);
  };
  const X = (i) => wX(BX0 + i * CELL), Z = (j) => wZ(BZ0 + j * CELL), C = (i, j) => CH[j * (NX + 1) + i];
  for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
    quad([X(i), C(i, j), Z(j)], [X(i), C(i, j + 1), Z(j + 1)], [X(i + 1), C(i + 1, j + 1), Z(j + 1)], [X(i + 1), C(i + 1, j), Z(j)], PAL[COL[j * NX + i]]);
  }
  // The block's sides, from the ground's edge down to the base
  for (let i = 0; i < NX; i++) for (const [j, s] of [[0, -1], [NZ, 1]]) {
    const q = [[X(i), C(i, j), Z(j)], [X(i), -BASE, Z(j)], [X(i + 1), -BASE, Z(j)], [X(i + 1), C(i + 1, j), Z(j)]];
    if (s < 0) q.reverse();
    quad(...q, SIDE, [0, 0, s]);
  }
  for (let j = 0; j < NZ; j++) for (const [i, s] of [[0, -1], [NX, 1]]) {
    const q = [[X(i), C(i, j), Z(j)], [X(i), -BASE, Z(j)], [X(i), -BASE, Z(j + 1)], [X(i), C(i, j + 1), Z(j + 1)]];
    if (s > 0) q.reverse();
    quad(...q, SIDE, [s, 0, 0]);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true }));
  m.castShadow = m.receiveShadow = true;
  scene.add(m); // kept out of the merged world so clicks can find the ground
  clickables.push({ mesh: m, kind: 'ground', ref: null });
  return m;
})();

/* ------------------------------------------------------------------ */
/* Floating: the block is the top of an island of rock in the sky,     */
/* stepping in layer by layer underneath                               */
/* ------------------------------------------------------------------ */
const BW = (BX1 - BX0) * U, BD = (BZ1 - BZ0) * U;
(() => {
  // Each layer steps in less than its own height looks from the camera, so every layer shows
  const layers = [[1, 4, '#996244'], [0.93, 7, '#9c785d'], [0.84, 8, '#b5ada4'], [0.72, 8, '#968e85'], [0.57, 9, '#b5ada4'], [0.4, 9, '#968e85'], [0.22, 10, '#787067']];
  let y = -BASE;
  for (const [k, h, c] of layers) {
    const w = BW * k, d = BD * k, r = Math.min(w, d) * 0.12;
    box(w - r * 2, h, d, c, 0, y - h / 2, 0); // two crossed boxes make rounded corners
    box(w, h, d - r * 2, c, 0, y - h / 2, 0);
    y -= h;
  }
})();
function cyl(rt, rb, h, seg, m, x, y, z, parent = S, shadow = true) {
  const o = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), typeof m === 'string' ? lam(m) : m);
  o.position.set(x, y, z); o.castShadow = shadow; o.receiveShadow = true; parent.add(o);
  return o;
}
