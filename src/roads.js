/* ------------------------------------------------------------------ */
/* Roads and pavement. Every OSM way is a ribbon on its true line and  */
/* width, draped on the smooth ground, textured by surface as the      */
/* Mapillary photos show them: stone-flag lanes with dark stone        */
/* gutters, stepped lanes, the asphalt main road with dusty shoulders, */
/* concrete or earth tracks. Squares and temple courts get brick or    */
/* flagstone paving. Widths: OSM's where tagged, else by road type.    */
/* ------------------------------------------------------------------ */
// Textures are one tile each: across the full width (u) and `len` metres along (v)
// mipmapped: at the whole-island zoom the lanes read as calm tone, not shimmering pixel noise
function surfaceTex(w, h, draw) { const t = canvasTex(w, h, draw, { mip: true }); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.needsUpdate = true; return t; }
const SURF = {
  flags: { len: 2.6, tex: surfaceTex(24, 24, (g) => { // grey stone flags in staggered rows, dark gutters at both edges
    g.fillStyle = '#968e85'; g.fillRect(0, 0, 24, 24);
    for (let r = 0; r < 4; r++) for (let c = -1; c < 4; c++) { const x = 3 + c * 6 + (r % 2) * 3; g.fillStyle = (r + c) % 3 ? '#cfc8c0' : '#b5ada4'; g.fillRect(Math.max(3, x), r * 6 + 1, Math.min(5, 21 - Math.max(3, x)), 5); }
    g.fillStyle = '#787067'; g.fillRect(0, 0, 2, 24); g.fillRect(22, 0, 2, 24);
    g.fillStyle = '#5c554e'; g.fillRect(1, 0, 1, 24); g.fillRect(22, 0, 1, 24);
  }) },
  steps: { len: 0.7, tex: surfaceTex(24, 8, (g) => { // a tread and the shadowed riser below it
    g.fillStyle = '#cfc8c0'; g.fillRect(0, 0, 24, 8); g.fillStyle = '#b5ada4'; g.fillRect(0, 4, 24, 2);
    g.fillStyle = '#787067'; g.fillRect(0, 6, 24, 2); g.fillRect(0, 0, 2, 8); g.fillRect(22, 0, 2, 8);
  }) },
  asphalt: { len: 8, tex: surfaceTex(24, 32, (g) => { // dark asphalt, dashed centre line, dusty shoulders
    g.fillStyle = '#5c554e'; g.fillRect(0, 0, 24, 32);
    for (let i = 0; i < 40; i++) { g.fillStyle = i % 2 ? '#787067' : '#403a35'; g.fillRect((i * 7) % 20 + 2, (i * 13) % 32, 1, 1); }
    g.fillStyle = '#caa98e'; g.fillRect(0, 0, 2, 32); g.fillRect(22, 0, 2, 32);
    g.fillStyle = '#9c785d'; g.fillRect(2, 0, 1, 32); g.fillRect(21, 0, 1, 32);
    g.fillStyle = '#f2e2d0'; g.fillRect(11, 2, 2, 14);
  }) },
  concrete: { len: 3, tex: surfaceTex(16, 16, (g) => { // concrete slabs with joints
    g.fillStyle = '#cfc8c0'; g.fillRect(0, 0, 16, 16); g.fillStyle = '#b5ada4'; g.fillRect(0, 15, 16, 1); g.fillRect(8, 0, 1, 15);
    g.fillStyle = '#968e85'; g.fillRect(0, 0, 1, 16); g.fillRect(15, 0, 1, 16);
  }) },
  earth: { len: 4, tex: surfaceTex(16, 16, (g) => { // packed earth with two wheel ruts and pebbles
    g.fillStyle = '#caa98e'; g.fillRect(0, 0, 16, 16); g.fillStyle = '#9c785d'; g.fillRect(4, 0, 2, 16); g.fillRect(10, 0, 2, 16);
    for (let i = 0; i < 10; i++) { g.fillStyle = '#b5ada4'; g.fillRect((i * 5) % 15, (i * 7) % 15, 1, 1); }
  }) }
};
function surfaceOf(r) {
  if (r.t === 'steps') return ['steps', 2.6];
  if (['tertiary', 'secondary', 'primary'].includes(r.t) || r.s === 'asphalt') return ['asphalt', r.w || 6.5];
  if (r.t === 'residential' || r.t === 'unclassified') return ['flags', r.w || 4];
  if (r.t === 'track') return [r.s === 'paved' ? 'concrete' : 'earth', r.w || 3];
  return ['flags', r.w || 2.6]; // old-town paths and footways: stone flags
}
const LIFT = { earth: 0.022, concrete: 0.026, flags: 0.03, steps: 0.032, asphalt: 0.036 }; // world units, so crossings never flicker
const _ribbonsCore = { flags: [], steps: [], asphalt: [], concrete: [], earth: [] };
const _ribbonsOuter = { flags: [], steps: [], asphalt: [], concrete: [], earth: [] };
for (const r of MAP.roads) {
  const [kind, wM] = surfaceOf(r), half = wM / 2;
  // Resample the line every metre, inside the board
  const pts = [];
  for (let k = 0; k + 3 < r.p.length; k += 2) {
    const ax = r.p[k], az = r.p[k + 1], bx = r.p[k + 2], bz = r.p[k + 3], len = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.ceil(len));
    for (let i = 0; i < n; i++) pts.push([ax + (bx - ax) * i / n, az + (bz - az) * i / n]);
  }
  pts.push([r.p[r.p.length - 2], r.p[r.p.length - 1]]);
  const inB = (p) => p[0] > BX0 + 0.5 && p[0] < BX1 - 0.5 && p[1] > BZ0 + 0.5 && p[1] < BZ1 - 0.5;
  let runC = [], runO = [];
  const flushC = () => { if (runC.length > 1) _ribbonsCore[kind].push({ run: runC, half }); runC = []; };
  const flushO = () => { if (runO.length > 1) _ribbonsOuter[kind].push({ run: runO, half }); runO = []; };
  for (const p of pts) {
    if (!inB(p)) { flushC(); flushO(); continue; }
    if (inCore(p[0], p[1])) { runC.push(p); flushO(); }
    else { runO.push(p); flushC(); }
  }
  flushC(); flushO();
}
// The unit normal (in map metres) of a resampled lane run at point i
function laneNormal(run, i) {
  const a = run[Math.max(0, i - 1)], b = run[Math.min(run.length - 1, i + 1)], tx = b[0] - a[0], tz = b[1] - a[1], tl = Math.hypot(tx, tz) || 1;
  return [-tz / tl, tx / tl];
}
// Triangle strips draped on the ground, one mesh per call: u across the width, v along in tiles of len metres
function ribbonMesh(list, tex, len, lift, parent = scene) {
  const pos = [], uv = [], idx = [];
  for (const { run, half } of list) {
    let dist = 0;
    for (let i = 0; i < run.length; i++) {
      const [nx, nz] = laneNormal(run, i);
      if (i) dist += Math.hypot(run[i][0] - run[i - 1][0], run[i][1] - run[i - 1][1]);
      const v = pos.length / 3;
      for (const s of [-1, 1]) {
        const x = run[i][0] + nx * half * s, z = run[i][1] + nz * half * s, wx_ = wX(x), wz_ = wZ(z);
        pos.push(wx_, Math.max(groundY(wx_, wz_), groundY(wX(run[i][0]), wZ(run[i][1]))) + lift, wz_);
        uv.push(s < 0 ? 0 : 1, dist / len);
      }
      if (i) idx.push(v - 2, v, v - 1, v - 1, v, v + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ map: tex, side: THREE.DoubleSide }));
  m.receiveShadow = true; parent.add(m);
  return m;
}
const roadMeshes = Object.entries(_ribbonsCore).map(([kind, list]) => ribbonMesh(list, SURF[kind].tex, SURF[kind].len, LIFT[kind], scene));
const outerRoadMeshes = Object.entries(_ribbonsOuter).map(([kind, list]) => ribbonMesh(list, SURF[kind].tex, SURF[kind].len, LIFT[kind], outerOnlyGroup));
const _ribbons = _ribbonsCore;
// Round iron manhole covers along the paved lanes and the road in the core old town
for (const kind of ['flags', 'asphalt']) for (const { run, half } of _ribbonsCore[kind]) for (let i = 11; i < run.length; i += 23) {
  const [nx, nz] = laneNormal(run, i), wx_ = wX(run[i][0] + nx * half * 0.3), wz_ = wZ(run[i][1] + nz * half * 0.3);
  cyl(0.38 * U, 0.38 * U, 0.02, 10, '#403a35', wx_, groundY(wx_, wz_) + 0.045, wz_, S, false);
}

/* ------------------------------------------------------------------ */
/* Pavement on squares and temple courts: brick or stone flags on the  */
/* ground cells painted for them, following the smooth surface         */
/* ------------------------------------------------------------------ */
(() => {
  const brickTex = surfaceTex(16, 16, (g) => { // herringbone brick
    g.fillStyle = '#9e3b26'; g.fillRect(0, 0, 16, 16);
    for (let y = 0; y < 16; y += 4) for (let x = 0; x < 16; x += 4) { g.fillStyle = (x + y) % 8 ? '#c48966' : '#b5603f'; if ((x / 4 + y / 4) % 2) g.fillRect(x, y, 3, 1 + 2); else g.fillRect(x, y, 1 + 2, 3); }
  });
  const flagTex = surfaceTex(16, 16, (g) => { // square stone flags, no gutters
    g.fillStyle = '#968e85'; g.fillRect(0, 0, 16, 16);
    for (const [x, y, w, h, c] of [[1, 1, 6, 6, '#cfc8c0'], [8, 1, 7, 4, '#b5ada4'], [8, 6, 7, 4, '#cfc8c0'], [1, 8, 6, 7, '#b5ada4'], [8, 11, 7, 4, '#b5ada4']]) { g.fillStyle = c; g.fillRect(x, y, w, h); }
  });
  const sets = { brick: { tex: brickTex, cols: [PI.brick, PI.common] }, flags: { tex: flagTex, cols: [PI.paved, PI.school] } };
  for (const set of Object.values(sets)) {
    const pos = [], uv = [], idx = [];
    const X = (i) => wX(CX0 + i * CELL), Z = (j) => wZ(CZ0 + j * CELL), C = (i, j) => CH[j * (NX + 1) + i] + 0.012;
    for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
      if (!set.cols.includes(COL[j * NX + i])) continue;
      const v = pos.length / 3;
      pos.push(X(i), C(i, j), Z(j), X(i), C(i, j + 1), Z(j + 1), X(i + 1), C(i + 1, j + 1), Z(j + 1), X(i + 1), C(i + 1, j), Z(j));
      uv.push(0, 0, 0, 1, 1, 1, 1, 0);
      idx.push(v, v + 1, v + 2, v, v + 2, v + 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ map: set.tex }));
    m.receiveShadow = true; scene.add(m);
  }
})();
