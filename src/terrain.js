/* ------------------------------------------------------------------ */
/* Scale. One world unit is 4 m, the same on every axis, so distances  */
/* and heights on the board are true to the map. Map coordinates are   */
/* metres from Bagh Bhairab (x east, z south), from MAP (mapdata.js).  */
/* Core Old Town (MAP.core) uses 2 m cells; surrounding Kirtipur       */
/* areas (MAP.bounds outside core) use 10 m cells covered by fog until */
/* clicked/focused.                                                    */
/* ------------------------------------------------------------------ */
const U = 0.25; // world units per metre
const [BX0, BX1, BZ0, BZ1] = MAP.bounds;
const [CX0, CX1, CZ0, CZ1] = MAP.core || MAP.bounds;
const MCX = (CX0 + CX1) / 2, MCZ = (CZ0 + CZ1) / 2; // world origin stays at Old Town centre
const wX = (x) => (x - MCX) * U, wZ = (z) => (z - MCZ) * U; // map metres to world
const mX = (x) => x / U + MCX, mZ = (z) => z / U + MCZ; // and back
const inCore = (x, z) => x >= CX0 && x <= CX1 && z >= CZ0 && z <= CZ1;
const ELEV0 = Math.min(...MAP.elev.h); // the lowest ground on the board sits at y = 0
const CONTOUR = 2; // metres between the cut layers
const CELL = 2; // metres per core ground cell
const NX = (CX1 - CX0) / CELL, NZ = (CZ1 - CZ0) / CELL;
const OCELL = 10; // metres per outer ground cell
const ONX = (BX1 - BX0) / OCELL, ONZ = (BZ1 - BZ0) / OCELL;
const BASE = 3; // depth of the earth block below the lowest ground, world units

function sampleElevGrid(E, x, z) {
  const fx = clamp((x - E.x0) / E.step, 0, E.nx - 1.001), fz = clamp((z - E.z0) / E.step, 0, E.nz - 1.001);
  const i = Math.floor(fx), j = Math.floor(fz), u = fx - i, v = fz - j, h = (a, b) => E.h[b * E.nx + a];
  return (h(i, j) * (1 - u) + h(i + 1, j) * u) * (1 - v) + (h(i, j + 1) * (1 - u) + h(i + 1, j + 1) * u) * v - ELEV0;
}
// Ground elevation in metres above ELEV0, blending 20 m core SRTM smoothly into 40 m full-town SRTM
function elevAt(x, z) {
  const outer = sampleElevGrid(MAP.elev, x, z);
  if (!MAP.elevCore || !inCore(x, z)) return outer;
  const edge = Math.min(x - CX0, CX1 - x, z - CZ0, CZ1 - z);
  const t = clamp(edge / 20, 0, 1);
  return outer * (1 - t) + sampleElevGrid(MAP.elevCore, x, z) * t;
}

/* ------------------------------------------------------------------ */
/* Ground cells: core (2 m) + outer Kirtipur (10 m)                    */
/* ------------------------------------------------------------------ */
const TINTS = ['#a4cc8e', '#bcd69a', '#d3dfa6', '#e3dfb0', '#ecd9b4', '#f2e2d0'];
const PAINT = { green: '#63964d', paved: '#e6e1dc', brick: '#c48966', common: '#e3b08e', school: '#dbc0a6', water: '#4fa3b8', road: '#fffaf2', track: '#e6e1dc', path: '#cfc8c0' };
const PAL = [...TINTS, ...Object.values(PAINT)].map((c) => new THREE.Color(c));
const PI = {}; Object.keys(PAINT).forEach((k, i) => { PI[k] = TINTS.length + i; });
const HQ = new Float32Array(NX * NZ); // core ground height per cell, world units
const COL = new Uint8Array(NX * NZ);
const TOPM = Math.max(...MAP.elev.h, ...(MAP.elevCore ? MAP.elevCore.h : [])) - ELEV0;
for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
  const e = elevAt(CX0 + (i + 0.5) * CELL, CZ0 + (j + 0.5) * CELL), q = Math.floor(e / CONTOUR) * CONTOUR;
  HQ[j * NX + i] = e * U;
  COL[j * NX + i] = Math.min(TINTS.length - 1, Math.floor(q / TOPM * TINTS.length));
}
const cellOf = (x, z) => [Math.floor((x - CX0) / CELL), Math.floor((z - CZ0) / CELL)];
function inPoly(f, x, z) {
  let c = false;
  for (let a = 0, b = f.length - 2; a < f.length; b = a, a += 2) {
    if ((f[a + 1] > z) !== (f[b + 1] > z) && x < (f[b] - f[a]) * (z - f[a + 1]) / (f[b + 1] - f[a + 1]) + f[a]) c = !c;
  }
  return c;
}
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
function nearEdge(f, x, z) {
  let d = Infinity;
  for (let k = 0; k + 3 < f.length; k += 2) {
    const ax = f[k], az = f[k + 1], dx = f[k + 2] - ax, dz = f[k + 3] - az, L = dx * dx + dz * dz;
    const t = L ? clamp(((x - ax) * dx + (z - az) * dz) / L, 0, 1) : 0;
    d = Math.min(d, Math.hypot(x - ax - t * dx, z - az - t * dz));
  }
  return d;
}
function polyCellsGrid(f, x0, z0, cell, nx, nz) {
  const xs = f.filter((_, k) => k % 2 === 0), zs = f.filter((_, k) => k % 2 === 1), out = [];
  const i0 = Math.floor((Math.min(...xs) - x0) / cell), j0 = Math.floor((Math.min(...zs) - z0) / cell);
  const i1 = Math.floor((Math.max(...xs) - x0) / cell), j1 = Math.floor((Math.max(...zs) - z0) / cell);
  for (let j = Math.max(0, j0); j <= Math.min(nz - 1, j1); j++) for (let i = Math.max(0, i0); i <= Math.min(nx - 1, i1); i++) {
    if (inPoly(f, x0 + (i + 0.5) * cell, z0 + (j + 0.5) * cell)) out.push(j * nx + i);
  }
  return out;
}
const polyCells = (f) => polyCellsGrid(f, CX0, CZ0, CELL, NX, NZ);
for (const g of MAP.green) for (const c of polyCells(g.p)) COL[c] = PI.green;
for (const a of MAP.areas) for (const c of polyCells(a.p)) COL[c] = a.t === 'common' ? PI.common : a.t === 'school' ? PI.school : PI.paved;

function frameOf(id) { const f = footprint(MAP.buildings.find((b) => b.id === id).p); return f; }
function frameRect(id, x0, x1, z0, z1) {
  const f = frameOf(id), c = Math.cos(f.ang), s = Math.sin(f.ang), out = [];
  for (const [x, z] of [[x0, z0], [x1, z0], [x1, z1], [x0, z1], [x0, z0]]) out.push(f.cx + x * c - z * s, f.cz + x * s + z * c);
  return out;
}
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
for (const w of MAP.water) {
  const cs = polyCells(w);
  if (!cs.length) continue;
  const lo = Math.min(...cs.map((c) => HQ[c])) - (inPoly(w, -21.9, 68.7) ? 3 : 1) * U;
  for (const c of cs) { HQ[c] = lo; COL[c] = PI.water; }
}
const CH = new Float32Array((NX + 1) * (NZ + 1));
for (let j = 0; j <= NZ; j++) for (let i = 0; i <= NX; i++) {
  let s = 0, n = 0;
  for (const [a, b] of [[i - 1, j - 1], [i, j - 1], [i - 1, j], [i, j]]) if (a >= 0 && b >= 0 && a < NX && b < NZ) { s += HQ[b * NX + a]; n++; }
  CH[j * (NX + 1) + i] = s / n;
}

/* Outer 10 m grid (covers BX0..BX1, BZ0..BZ1 outside the 2 m core) */
const OHQ = new Float32Array(ONX * ONZ);
const OCOL = new Uint8Array(ONX * ONZ);
for (let j = 0; j < ONZ; j++) for (let i = 0; i < ONX; i++) {
  const e = elevAt(BX0 + (i + 0.5) * OCELL, BZ0 + (j + 0.5) * OCELL), q = Math.floor(e / CONTOUR) * CONTOUR;
  OHQ[j * ONX + i] = e * U;
  OCOL[j * ONX + i] = Math.min(TINTS.length - 1, Math.floor(q / TOPM * TINTS.length));
}
for (const g of MAP.green) for (const c of polyCellsGrid(g.p, BX0, BZ0, OCELL, ONX, ONZ)) OCOL[c] = PI.green;
for (const a of MAP.areas) for (const c of polyCellsGrid(a.p, BX0, BZ0, OCELL, ONX, ONZ)) OCOL[c] = a.t === 'common' ? PI.common : a.t === 'school' ? PI.school : PI.paved;
for (const w of MAP.water) {
  const cs = polyCellsGrid(w, BX0, BZ0, OCELL, ONX, ONZ);
  if (!cs.length) continue;
  const lo = Math.min(...cs.map((c) => OHQ[c])) - 1 * U;
  for (const c of cs) { OHQ[c] = lo; OCOL[c] = PI.water; }
}
const OCH = new Float32Array((ONX + 1) * (ONZ + 1));
for (let j = 0; j <= ONZ; j++) for (let i = 0; i <= ONX; i++) {
  const ox = BX0 + i * OCELL, oz = BZ0 + j * OCELL;
  if (ox >= CX0 && ox <= CX1 && oz >= CZ0 && oz <= CZ1) {
    const ci = Math.round((ox - CX0) / CELL), cj = Math.round((oz - CZ0) / CELL);
    OCH[j * (ONX + 1) + i] = CH[cj * (NX + 1) + ci];
  } else {
    let s = 0, n = 0;
    for (const [a, b] of [[i - 1, j - 1], [i, j - 1], [i - 1, j], [i, j]]) if (a >= 0 && b >= 0 && a < ONX && b < ONZ) { s += OHQ[b * ONX + a]; n++; }
    OCH[j * (ONX + 1) + i] = s / n;
  }
}

function groundY(x, z) {
  const mx = mX(x), mz = mZ(z);
  if (mx >= CX0 && mx <= CX1 && mz >= CZ0 && mz <= CZ1) {
    const fx = clamp((mx - CX0) / CELL, 0, NX - 0.001), fz = clamp((mz - CZ0) / CELL, 0, NZ - 0.001);
    const i = Math.floor(fx), j = Math.floor(fz), u = fx - i, v = fz - j, c = (a, b) => CH[b * (NX + 1) + a];
    return (c(i, j) * (1 - u) + c(i + 1, j) * u) * (1 - v) + (c(i, j + 1) * (1 - u) + c(i + 1, j + 1) * u) * v;
  }
  const fx = clamp((mx - BX0) / OCELL, 0, ONX - 0.001), fz = clamp((mz - BZ0) / OCELL, 0, ONZ - 0.001);
  const i = Math.floor(fx), j = Math.floor(fz), u = fx - i, v = fz - j, c = (a, b) => OCH[b * (ONX + 1) + a];
  return (c(i, j) * (1 - u) + c(i + 1, j) * u) * (1 - v) + (c(i, j + 1) * (1 - u) + c(i + 1, j + 1) * u) * v;
}

/* ------------------------------------------------------------------ */
/* The terrain meshes: 2 m core + 10 m outer Kirtipur with earth sides */
/* ------------------------------------------------------------------ */
function buildTerrainMesh(build, parent = scene) {
  const pos = [], nor = [], col = [], idx = [];
  const _a = new THREE.Vector3(), _b = new THREE.Vector3();
  const quad = (a, b, c, d, cl, n) => {
    if (!n) { _a.set(c[0] - a[0], c[1] - a[1], c[2] - a[2]); _b.set(d[0] - b[0], d[1] - b[1], d[2] - b[2]); _a.cross(_b).normalize(); n = [-_a.x, -_a.y, -_a.z]; if (n[1] < 0) n = n.map((v) => -v); }
    const v = pos.length / 3;
    for (const p of [a, b, c, d]) { pos.push(...p); nor.push(...n); col.push(cl.r, cl.g, cl.b); }
    idx.push(v, v + 1, v + 2, v, v + 2, v + 3);
  };
  build(quad);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true }));
  m.castShadow = m.receiveShadow = true;
  parent.add(m);
  clickables.push({ mesh: m, kind: 'ground', ref: null });
  return m;
}

const coreOnlyGroup = group(0, 0, 0);
const outerOnlyGroup = group(0, 0, 0);
const outerS = group(0, 0, 0, outerOnlyGroup);

const terrain = buildTerrainMesh((quad) => {
  const X = (i) => wX(CX0 + i * CELL), Z = (j) => wZ(CZ0 + j * CELL), C = (i, j) => CH[j * (NX + 1) + i];
  for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
    quad([X(i), C(i, j), Z(j)], [X(i), C(i, j + 1), Z(j + 1)], [X(i + 1), C(i + 1, j + 1), Z(j + 1)], [X(i + 1), C(i + 1, j), Z(j)], PAL[COL[j * NX + i]]);
  }
});

const CORE_BASE = Math.min(...CH) - BASE;
buildTerrainMesh((quad) => {
  const SIDE = new THREE.Color('#996244');
  const X = (i) => wX(CX0 + i * CELL), Z = (j) => wZ(CZ0 + j * CELL), C = (i, j) => CH[j * (NX + 1) + i];
  for (let i = 0; i < NX; i++) for (const [j, s] of [[0, -1], [NZ, 1]]) {
    const q = [[X(i), C(i, j), Z(j)], [X(i), CORE_BASE, Z(j)], [X(i + 1), CORE_BASE, Z(j)], [X(i + 1), C(i + 1, j), Z(j)]];
    if (s < 0) q.reverse();
    quad(...q, SIDE, [0, 0, s]);
  }
  for (let j = 0; j < NZ; j++) for (const [i, s] of [[0, -1], [NX, 1]]) {
    const q = [[X(i), C(i, j), Z(j)], [X(i), CORE_BASE, Z(j)], [X(i), CORE_BASE, Z(j + 1)], [X(i), C(i, j + 1), Z(j + 1)]];
    if (s > 0) q.reverse();
    quad(...q, SIDE, [s, 0, 0]);
  }
}, coreOnlyGroup);

const outerTerrain = buildTerrainMesh((quad) => {
  const SIDE = new THREE.Color('#996244');
  const X = (i) => wX(BX0 + i * OCELL), Z = (j) => wZ(BZ0 + j * OCELL), C = (i, j) => OCH[j * (ONX + 1) + i];
  const ci0 = (CX0 - BX0) / OCELL, ci1 = (CX1 - BX0) / OCELL, cj0 = (CZ0 - BZ0) / OCELL, cj1 = (CZ1 - BZ0) / OCELL;
  for (let j = 0; j < ONZ; j++) for (let i = 0; i < ONX; i++) {
    if (i >= ci0 && i < ci1 && j >= cj0 && j < cj1) continue; // covered at 2 m resolution by core terrain
    quad([X(i), C(i, j), Z(j)], [X(i), C(i, j + 1), Z(j + 1)], [X(i + 1), C(i + 1, j + 1), Z(j + 1)], [X(i + 1), C(i + 1, j), Z(j)], PAL[OCOL[j * ONX + i]]);
  }
  for (let i = 0; i < ONX; i++) for (const [j, s] of [[0, -1], [ONZ, 1]]) {
    const q = [[X(i), C(i, j), Z(j)], [X(i), -BASE, Z(j)], [X(i + 1), -BASE, Z(j)], [X(i + 1), C(i + 1, j), Z(j)]];
    if (s < 0) q.reverse();
    quad(...q, SIDE, [0, 0, s]);
  }
  for (let j = 0; j < ONZ; j++) for (const [i, s] of [[0, -1], [ONX, 1]]) {
    const q = [[X(i), C(i, j), Z(j)], [X(i), -BASE, Z(j)], [X(i), -BASE, Z(j + 1)], [X(i), C(i, j + 1), Z(j + 1)]];
    if (s > 0) q.reverse();
    quad(...q, SIDE, [s, 0, 0]);
  }
}, outerOnlyGroup);

/* ------------------------------------------------------------------ */
/* Floating: rock layers underneath for Kirtipur Hill & Full Kirtipur */
/* ------------------------------------------------------------------ */
const CW = (CX1 - CX0) * U, CD = (CZ1 - CZ0) * U;
const BW = (BX1 - BX0) * U, BD = (BZ1 - BZ0) * U;
const BCX = wX((BX0 + BX1) / 2), BCZ = wZ((BZ0 + BZ1) / 2);
function buildRockBase(bw, bd, cx, cz, topY, layers, parent) {
  let y = topY;
  for (const [k, h, c] of layers) {
    const w = bw * k, d = bd * k, r = Math.min(w, d) * 0.12;
    box(w - r * 2, h, d, c, cx, y - h / 2, cz, parent);
    box(w, h, d - r * 2, c, cx, y - h / 2, cz, parent);
    y -= h;
  }
}
buildRockBase(CW, CD, 0, 0, CORE_BASE, [[1, 4, '#996244'], [0.93, 7, '#9c785d'], [0.84, 8, '#b5ada4'], [0.72, 8, '#968e85'], [0.57, 9, '#b5ada4'], [0.4, 9, '#968e85'], [0.22, 10, '#787067']], coreOnlyGroup);
buildRockBase(BW, BD, BCX, BCZ, -BASE, [[1, 6, '#996244'], [0.93, 10, '#9c785d'], [0.84, 12, '#b5ada4'], [0.72, 12, '#968e85'], [0.57, 14, '#b5ada4'], [0.4, 14, '#968e85'], [0.22, 16, '#787067']], outerOnlyGroup);
function cyl(rt, rb, h, seg, m, x, y, z, parent = S, shadow = true) {
  const o = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), typeof m === 'string' ? lam(m) : m);
  o.position.set(x, y, z); o.castShadow = shadow; o.receiveShadow = true; parent.add(o);
  return o;
}