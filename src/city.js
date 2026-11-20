// A model built in metres around its own origin, placed on the map at true scale
function placeModel(g, fp, scale = 1) {
  g.position.set(wX(fp.cx), groundY(wX(fp.cx), wZ(fp.cz)), wZ(fp.cz));
  g.rotation.y = -fp.ang;
  g.scale.setScalar(U * scale);
  return g;
}

// A group in metres at a map point, turned by yaw (radians, map frame), standing on the ground
function atMapPoint(x, z, yaw = 0, parent = S) {
  const g = group(wX(x), groundY(wX(x), wZ(z)), wZ(z), parent);
  g.rotation.y = -yaw; g.scale.setScalar(U);
  return g;
}
const rand = (seed) => { const v = Math.sin(seed * 12.9898) * 43758.5453; return v - Math.floor(v); }; // fixed per spot

/* ------------------------------------------------------------------ */
/* Which OSM buildings become ordinary houses (built in houses.js)     */
/* ------------------------------------------------------------------ */
const LANDMARK_IDS = { bhairab: 317754748, uma: 323644534, stupa: 1074769020, stupaBase: 1074769018 };
const SKIP = new Set([...Object.values(LANDMARK_IDS), ...FOCUS.flatMap((F_) => F_.own || [])]);
const SHRINES = new Set(['place_of_worship', 'temple']);
const shrines = [], chaityas = [], houseList = [];
for (const b of MAP.buildings) {
  if (SKIP.has(b.id)) continue;
  const fp = footprint(b.p);
  // The temple sites and Dey Pukhu are built in detail in bhairab.js, uma.js, chilancho.js and pukhu.js
  if (inSite(fp.cx, fp.cz) || fp.p.some(([x, z]) => Object.values(SITES).some((S_) => inPoly(S_.poly, x, z)))) continue;
  if (SHRINES.has(b.k) && fp.long < 9) { shrines.push(fp); continue; }
  if (fp.long < 3) { chaityas.push(fp); continue; } // the little stupas round Chilancho are mapped as buildings
  // Height in metres from prep.py (OSM levels, else the local GHSL average varied by plot); very slim plots stay lower
  const hm = Math.min(b.h, Math.max(6, fp.short * 3));
  let lo = Infinity, hi = -Infinity;
  for (const [x, z] of [...fp.p, [fp.cx, fp.cz]]) { const y = groundY(wX(x), wZ(z)); lo = Math.min(lo, y); hi = Math.max(hi, y); }
  houseList.push({ id: b.id, fp, hm, lo, hi, hsh: (b.id * 2654435761) >>> 0, rank: ((Math.imul(b.id, 0x85ebca6b) >>> 0) >>> 7) % 1000 / 1000 });
}

/* ------------------------------------------------------------------ */
/* Temple parts (metres): hipped roofs, carved storeys, struts         */
/* ------------------------------------------------------------------ */
const WOOD = '#47291b';
function pyramid(r, h, m, x, y, z, parent = S, sx = 1, sz = 1) {
  const o = new THREE.Mesh(new THREE.ConeGeometry(r, h, 4).rotateY(Math.PI / 4), typeof m === 'string' ? lam(m) : m);
  o.scale.set(sx, 1, sz); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; parent.add(o);
  return o;
}
// A loft: a square or oblong plan (half extents hw, hd) swept up a profile of [r, y] points, r a
// fraction of the half extents. Each side is a strip of flat quads, so hips stay sharp while the
// profile can curve. Indexed with position, normal and uv (metres, v times vs: along the slope, or
// by height with byH so courses line up level across faces of different depth), so bake() merges
// it with the boxes.
function loftGeo(prof, hw, hd, vs = 1, byH = false) {
  const pos = [], nor = [], uv = [], idx = [];
  for (const [dx, dz] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
    const lat = dz ? hw : hd, off = dz ? hd : hw; // half width along the side, distance out to it
    let v = 0;
    for (let i = 0; i + 1 < prof.length; i++) {
      const [ra, ya] = prof[i], [rb, yb] = prof[i + 1], de = (rb - ra) * off, dy = yb - ya, L = Math.hypot(de, dy) || 1;
      const b = pos.length / 3;
      for (const [r, y, vv] of [[ra, ya, v], [rb, yb, v + L]]) for (const s of [-1, 1]) { // s: left / right seen from outside
        pos.push(dx * r * off + s * dz * r * lat, y, dz * r * off - s * dx * r * lat);
        nor.push(dx * dy / L, -de / L, dz * dy / L); uv.push(s * r * lat, (byH ? y : vv) * vs);
      }
      idx.push(b, b + 1, b + 3, b, b + 3, b + 2);
      v += L;
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  return geo;
}
// A Newar roof (k: top size as a fraction of the eaves, 0 for a pyramid): a closed underside, a
// thick eave board, then the tiled slope sagging a little below the straight line to the top, so it
// leaves the eaves shallow and steepens toward the ridge
function roofProf(k, h) {
  const f = Math.min(0.16, h * 0.14), p = [[0, 0], [1, 0], [1, f]];
  for (let i = 1; i <= 5; i++) { const t = i / 5; p.push([1 - (1 - k) * t, f + (h - f) * (t - 0.12 * Math.sin(Math.PI * t))]); }
  if (k > 0) p.push([0, h]);
  return p;
}
// Jhingati: rows of small fired tiles laid down the slope, a texture per roof colour
const _roof = {};
const roofMat = (col) => _roof[col] || (_roof[col] = new THREE.MeshLambertMaterial({ map: canvasTex(8, 8, (g) => {
  const c = new THREE.Color(col), tone = (k) => '#' + c.clone().multiplyScalar(k).getHexString();
  g.fillStyle = col; g.fillRect(0, 0, 8, 8);
  g.fillStyle = tone(0.55); for (let x = 0; x < 8; x += 2) g.fillRect(x, 0, 1, 8); // the channels between tile rows
  g.fillStyle = tone(0.75); g.fillRect(0, 3, 8, 1); g.fillRect(0, 7, 8, 1);    // each course's lower lip
  g.fillStyle = tone(1.25); for (let x = 1; x < 8; x += 2) { g.fillRect(x, 0, 1, 1); g.fillRect(x, 4, 1, 1); }
}, { repeat: [1.6, 1.4], mip: true }) }));
function roof(g, y, hw, hd, k, h, col) {
  const o = new THREE.Mesh(loftGeo(roofProf(k, h), hw, hd), roofMat(col));
  o.position.y = y; o.castShadow = o.receiveShadow = true; g.add(o);
  return o;
}
// Carved roof struts (tundal): a deity under a gilded halo, robed in red, an attendant below, on a
// plank of the strut's wood, as on Newar temple struts
const _strut = {};
const strutMat = (col) => _strut[col] || (_strut[col] = new THREE.MeshLambertMaterial({ map: canvasTex(6, 20, (g) => {
  g.fillStyle = col; g.fillRect(0, 0, 6, 20);
  g.fillStyle = '#26221f'; g.fillRect(0, 0, 6, 1); g.fillRect(0, 19, 6, 1);
  g.fillStyle = '#d99926'; g.fillRect(1, 2, 4, 1); g.fillRect(1, 3, 1, 2); g.fillRect(4, 3, 1, 2);
  g.fillStyle = '#c8956a'; g.fillRect(2, 4, 2, 2); g.fillRect(1, 7, 1, 3); g.fillRect(4, 7, 1, 3);
  g.fillStyle = '#9e3b26'; g.fillRect(2, 6, 2, 5);
  g.fillStyle = '#6e422c'; g.fillRect(1, 12, 4, 3); g.fillStyle = '#d99926'; g.fillRect(2, 13, 2, 1);
  g.fillStyle = '#26221f'; g.fillRect(1, 16, 4, 2);
}) }));
function struts(g, y, hw, hd, n, col = WOOD) {
  const mat = strutMat(col);
  for (const [sx, sz] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
    const len = sz ? hw : hd, m = sz ? n : Math.max(2, n - 1);
    for (let i = 0; i < m; i++) {
      const t = (i + 0.5) / m * 2 - 1, st = box(sz ? 0.34 : 0.1, 1.1, sz ? 0.1 : 0.34, mat, sz ? t * len * 0.85 : sx * (hw + 0.25), y, sz ? sz * (hd + 0.25) : t * len * 0.85, g);
      st.rotation.set(sz * 0.55, 0, -sx * 0.55);
    }
  }
}
const carvedMat = new THREE.MeshLambertMaterial({ map: canvasTex(16, 8, (g) => {
  g.fillStyle = '#47291b'; g.fillRect(0, 0, 16, 8);
  g.fillStyle = '#26221f'; g.fillRect(0, 0, 16, 1); g.fillRect(0, 7, 16, 1);
  for (let x = 1; x < 16; x += 5) { g.fillStyle = '#6e422c'; g.fillRect(x, 2, 3, 4); g.fillStyle = '#26221f'; g.fillRect(x + 1, 2, 1, 4); g.fillRect(x, 3, 3, 1); }
}) });
// A torana: the carved, gilded half-round panel over a temple door (a deity and two attendants on a beaded rim)
const toranaMat = new THREE.MeshLambertMaterial({ side: THREE.DoubleSide, map: canvasTex(16, 16, (g) => {
  g.fillStyle = '#d99926'; g.fillRect(0, 0, 16, 16);
  g.fillStyle = '#9c6a1e'; for (let x = 0; x < 16; x += 2) g.fillRect(x, 0, 1, 1);
  g.fillStyle = '#f5b841'; g.fillRect(6, 1, 4, 7); g.fillStyle = '#9c6a1e'; g.fillRect(7, 2, 2, 2); g.fillRect(6, 6, 4, 1);
  for (const x of [2, 12]) { g.fillStyle = '#f5b841'; g.fillRect(x, 3, 2, 5); g.fillStyle = '#9c6a1e'; g.fillRect(x, 4, 2, 1); }
}) }); // CircleGeometry maps the top half of the canvas onto a half disc: the carving lives in rows 0-7
function torana(parent, x, y, z, r, ry = 0) {
  const o = new THREE.Mesh(new THREE.CircleGeometry(r, 16, 0, Math.PI), toranaMat);
  o.position.set(x, y, z); o.rotation.y = ry; parent.add(o);
  return o;
}
// The fringe of little bells (kinkinimala) hanging along a roof's eaves
function bellFringe(g, y, hw, hd, gap = 0.35) {
  for (const [x0, z0, x1, z1] of [[-hw, hd, hw, hd], [-hw, -hd, hw, -hd], [hw, -hd, hw, hd], [-hw, -hd, -hw, hd]]) {
    const n = Math.round(Math.hypot(x1 - x0, z1 - z0) / gap);
    for (let i = 0; i <= n; i++) box(0.07, 0.22, 0.07, '#d99926', x0 + (x1 - x0) * i / n, y - 0.13, z0 + (z1 - z0) * i / n, g, false);
  }
}
// Carved wooden lattice windows (ankhijhyal) and a carved stone band
const latticeMat = new THREE.MeshLambertMaterial({ map: canvasTex(8, 8, (g) => {
  g.fillStyle = '#26221f'; g.fillRect(0, 0, 8, 8);
  g.fillStyle = '#6e422c'; for (let i = 1; i < 7; i++) for (let j = 1; j < 7; j++) if ((i + j) % 2) g.fillRect(i, j, 1, 1);
  g.fillStyle = '#47291b'; g.fillRect(0, 0, 8, 1); g.fillRect(0, 7, 8, 1); g.fillRect(0, 0, 1, 8); g.fillRect(7, 0, 1, 8);
}) });
const stoneCarveMat = new THREE.MeshLambertMaterial({ map: canvasTex(16, 4, (g) => {
  g.fillStyle = '#968e85'; g.fillRect(0, 0, 16, 4);
  g.fillStyle = '#787067'; for (let x = 0; x < 16; x += 4) g.fillRect(x + 1, 1, 2, 2);
  g.fillStyle = '#b5ada4'; g.fillRect(0, 0, 16, 1); g.fillStyle = '#5c554e'; g.fillRect(0, 3, 16, 1);
}, { repeat: [5, 1] }) });
// The gilded finial (gajur), turned as one lathe: a lotus base, a bell-shaped pot, rings, a spire
const GAJUR = new THREE.LatheGeometry([[0, 0], [0.26, 0], [0.3, 0.06], [0.18, 0.13], [0.27, 0.3], [0.21, 0.42], [0.09, 0.48], [0.14, 0.53], [0.06, 0.59], [0.1, 0.65], [0.03, 0.71], [0.02, 1.2], [0, 1.3]].map(([r, y]) => new THREE.Vector2(r, y)), 8);
const gajur = (g, y, s = 1) => { const o = new THREE.Mesh(GAJUR, lam('#f5b841')); o.position.y = y; o.scale.setScalar(s); o.castShadow = o.receiveShadow = true; g.add(o); };
const footing = (g, w, d, col) => box(w, 4, d, col, 0, -2, 0, g); // reaches down to the ground on a slope
// Diyas sit on each temple's own lamp places (racks, plinth edges, thresholds, the stupa terrace):
// world positions gathered while the models are built, drawn as one instanced mesh in lamps.js
const DIYAS = [];
function diyaRow(parent, x0, y, z0, x1, z1, gap = 0.45) {
  parent.updateWorldMatrix(true, false);
  const n = Math.max(1, Math.round(Math.hypot(x1 - x0, z1 - z0) / gap));
  for (let i = 0; i <= n; i++) DIYAS.push(parent.localToWorld(new THREE.Vector3(x0 + (x1 - x0) * i / n, y, z0 + (z1 - z0) * i / n)));
}
function diyaRing(parent, r, y, n) {
  parent.updateWorldMatrix(true, false);
  for (let i = 0; i < n; i++) DIYAS.push(parent.localToWorld(new THREE.Vector3(Math.cos(i / n * TAU) * r, y, Math.sin(i / n * TAU) * r)));
}
// LED strings along a roof's eaves and hips (k, h as for roof()); with h = 0 just the square edge
// loop, as on a plinth step. One shared material, so lamps.js can light them all at dusk.
const LED_MAT = new THREE.MeshBasicMaterial({ color: '#5c554e' });
function ledRoof(g, y, hw, hd, k = 1, h = 0) {
  const c = [[1, 1], [-1, 1], [-1, -1], [1, -1]], hip = h ? roofProf(k, h).slice(2, k > 0 ? -1 : undefined) : []; // the hips follow the roof's curve
  c.forEach(([sx, sz], i) => {
    const [tx, tz] = c[(i + 1) % 4];
    beam(sx * hw, y, sz * hd, tx * hw, y, tz * hd, 0.1, LED_MAT, g, false);
    for (let j = 0; j + 1 < hip.length; j++) { const [ra, ya] = hip[j], [rb, yb] = hip[j + 1]; beam(sx * hw * ra, y + ya, sz * hd * ra, sx * hw * rb, y + yb, sz * hd * rb, 0.1, LED_MAT, g, false); }
  });
}

const landmarks = {};
const ICON = 1.3; // the iconic sites are built a little larger than true size

/* ------------------------------------------------------------------ */
/* The small shrines and dyochhen on the map: little pagodas           */
/* ------------------------------------------------------------------ */
for (const fp of shrines) {
  const w = Math.max(2.5, fp.short), g = placeModel(group(0, 0, 0, inCore(fp.cx, fp.cz) ? S : outerS), fp);
  footing(g, w, w, '#b5ada4');
  box(w, 0.5, w, '#cfc8c0', 0, 0.25, 0, g);
  box(w * 0.6, 2, w * 0.6, '#9e3b26', 0, 1.5, 0, g);
  roof(g, 2.4, w * 0.75, w * 0.75, 0.4, 1, '#6e422c');
  box(w * 0.4, 1, w * 0.4, carvedMat, 0, 3.9, 0, g);
  roof(g, 4.4, w * 0.39, w * 0.39, 0, 1.1, '#6e422c');
  gajur(g, 5.4, 0.6);
}

// Chaityas: a small white stupa on a step, at each mapped spot
for (const fp of chaityas) {
  const g = placeModel(group(0, 0, 0, inCore(fp.cx, fp.cz) ? S : outerS), fp), w = Math.max(1.2, fp.long);
  footing(g, w, w, '#cfc8c0');
  box(w, 0.6, w, '#e6e1dc', 0, 0.3, 0, g);
  const d = new THREE.Mesh(new THREE.SphereGeometry(w * 0.38, 8, 5, 0, TAU, 0, Math.PI / 2), lam('#fffaf2'));
  d.position.y = 0.6; d.castShadow = true; g.add(d);
  cyl(0.05, w * 0.16, w * 0.7, 6, '#f5b841', 0, 0.6 + w * 0.38 + w * 0.3, 0, g);
}
