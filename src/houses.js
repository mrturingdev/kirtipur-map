/* ------------------------------------------------------------------ */
/* Houses in the Kirtipur Hill style, on their real footprints:        */
/* Newar brick with carved windows on every storey, a tiled two-slope  */
/* roof, a ridge and carved struts; or newer painted concrete with     */
/* glazed windows, a rolling shutter, a flat roof and a water tank.    */
/* Each house is the rectangle of its OSM footprint (long side, angle, */
/* centre) at its GHSL height in 2.9 m storeys, seated on the slope.   */
/* All parts go into one merged mesh per material in rank order, so   */
/* the Fewer houses slider is just a shorter draw range per mesh.      */
/* ------------------------------------------------------------------ */
const FLOOR = 2.9;
const HOUSE_MATS = []; // facade materials that glow after dark
// Houses near a focus sink to stubs (close-ups of the temples): x, z, radius in world units, and how far (0..1)
const COLLAPSE = { focus: { value: new THREE.Vector3(0, 0, 0) }, amount: { value: 0 } };
const collapseShader = (sh) => {
  sh.uniforms.uFocus = COLLAPSE.focus; sh.uniforms.uCollapse = COLLAPSE.amount;
  sh.vertexShader = sh.vertexShader
    .replace('#include <common>', '#include <common>\nattribute vec3 hc;\nuniform vec3 uFocus;\nuniform float uCollapse;')
    .replace('#include <begin_vertex>', `#include <begin_vertex>
      float hk = uCollapse * (1.0 - smoothstep(uFocus.z * 0.8, uFocus.z, distance(hc.xy, uFocus.xy)));
      transformed.y = mix(transformed.y, hc.z + (transformed.y - hc.z) * 0.12, hk);`);
};
const collapseDepth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
collapseDepth.onBeforeCompile = collapseShader;
const _hm = {};
function houseMat(key, make) {
  if (!_hm[key]) {
    _hm[key] = make();
    _hm[key].onBeforeCompile = collapseShader;
    _hm[key].customProgramCacheKey = () => 'collapse';
    if (_hm[key].map) { _hm[key].map.wrapS = THREE.RepeatWrapping; _hm[key].map.needsUpdate = true; HOUSE_MATS.push(_hm[key]); }
  }
  return _hm[key];
}
const plainMat = (c) => houseMat('c' + c, () => new THREE.MeshLambertMaterial({ color: c }));
// One bay of a Newar facade per storey: the wide sanjhya on top, tiki windows between, door and shop windows below
const newarFacade = (fl) => houseMat('n' + fl, () => new THREE.MeshLambertMaterial({ emissive: '#ffc77a', emissiveIntensity: 0, map: canvasTex(26, fl * 13 + 1, (g, w, h) => {
  g.fillStyle = '#b5603f'; g.fillRect(0, 0, w, h);
  for (let y = 1; y < h; y += 2) { g.fillStyle = '#9e3b26'; g.fillRect(0, y, w, 1); }
  const win = (x, y, ww, hh, lattice) => {
    g.fillStyle = '#47291b'; g.fillRect(x - 1, y - 1, ww + 2, hh + 2);
    g.fillStyle = '#6e422c'; g.fillRect(x, y, ww, hh);
    if (lattice) { g.fillStyle = '#47291b'; for (let i = 0; i < ww; i += 2) for (let j = (i / 2) % 2; j < hh; j += 2) g.fillRect(x + i, y + j, 1, 1); }
  };
  for (let f = 0; f < fl; f++) {
    const y = f * 13;
    if (f === 0) win(4, y + 5, 18, 5, true);
    else if (f === fl - 1) { win(11, y + 4, 4, 9, false); win(3, y + 6, 3, 4, false); win(20, y + 6, 3, 4, false); }
    else { win(4, y + 4, 4, 6, true); win(18, y + 4, 4, 6, true); win(11, y + 3, 4, 7, true); }
    if (f) { g.fillStyle = '#e8d2bc'; g.fillRect(0, y, w, 1); }
  }
}) }));
// A bay of a painted concrete facade: glazed windows above, a rolling shutter at street level
const modernFacade = (fl, col) => houseMat('m' + fl + col, () => new THREE.MeshLambertMaterial({ emissive: '#ffc77a', emissiveIntensity: 0, map: canvasTex(24, fl * 12, (g, w, h) => {
  g.fillStyle = col; g.fillRect(0, 0, w, h);
  for (let f = 0; f < fl; f++) {
    const y = f * 12;
    if (f === fl - 1) { g.fillStyle = '#968e85'; g.fillRect(3, y + 3, 18, 9); g.fillStyle = '#787067'; for (let j = y + 4; j < y + 12; j += 2) g.fillRect(3, j, 18, 1); }
    else for (const x of [3, 14]) { g.fillStyle = '#fffaf2'; g.fillRect(x - 1, y + 3, 9, 7); g.fillStyle = '#388296'; g.fillRect(x, y + 4, 7, 5); }
    g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(0, y + 11, w, 1);
  }
}) }));
const PAINT_COLS = ['#e6e1dc', '#fa9e7d', '#f28b50', '#f2e2d0', '#e6e1dc'];
// Close-up detail for the houses round the six places, as the 2022 Mapillary lane photos show them
const doorMat = houseMat('hdoor', () => new THREE.MeshLambertMaterial({ map: canvasTex(4, 8, (g) => { // grey-green painted plank doors
  g.fillStyle = '#5d6f6b'; g.fillRect(0, 0, 4, 8); g.fillStyle = '#46524f'; g.fillRect(1, 0, 1, 8); g.fillRect(0, 3, 4, 1); g.fillStyle = '#26221f'; g.fillRect(0, 0, 4, 1);
}) }));
const shutterMat = houseMat('shut', () => new THREE.MeshLambertMaterial({ map: canvasTex(4, 12, (g) => { // a ribbed steel rolling shutter
  g.fillStyle = '#968e85'; g.fillRect(0, 0, 4, 12); g.fillStyle = '#787067'; for (let y = 1; y < 12; y += 2) g.fillRect(0, y, 4, 1); g.fillStyle = '#5c554e'; g.fillRect(0, 11, 4, 1);
}) }));
const houseLatMat = houseMat('hlat', () => new THREE.MeshLambertMaterial({ emissive: '#ffc77a', emissiveIntensity: 0, map: canvasTex(8, 8, (g) => { // a carved lattice window
  g.fillStyle = '#26221f'; g.fillRect(0, 0, 8, 8);
  g.fillStyle = '#6e422c'; for (let i = 1; i < 7; i++) for (let j = 1; j < 7; j++) if ((i + j) % 2) g.fillRect(i, j, 1, 1);
  g.fillStyle = '#47291b'; g.fillRect(0, 0, 8, 1); g.fillRect(0, 7, 8, 1); g.fillRect(0, 0, 1, 8); g.fillRect(7, 0, 1, 8);
}) }));
const nearPlace = (x, z) => Object.values(SITES).some((S_) => Math.hypot(x - S_.at[0], z - S_.at[1]) < 60); // map metres

const _parts = {}, _outerParts = {}; // material key -> [{ geo, rank }]
const _M = new THREE.Matrix4(), _P = new THREE.Matrix4(), _R = new THREE.Matrix4(), _hcen = [0, 0, 0]; // _hcen: the house's centre x, z and base y
let _bucket = _parts;
// A box part in a house's own frame (metres, +x along its long side), dropped into its material's bucket
function part(key, mat, w, h, d, x, y, z, rx, rank, rep = 0) {
  const geo = new THREE.BoxGeometry(w, h, d);
  if (rep) { const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * rep); }
  _P.makeTranslation(x, y, z);
  if (rx) _P.multiply(_R.makeRotationX(rx));
  geo.applyMatrix4(_P).applyMatrix4(_M);
  const hc = new Float32Array(geo.attributes.position.count * 3);
  for (let i = 0; i < hc.length; i += 3) { hc[i] = _hcen[0]; hc[i + 1] = _hcen[1]; hc[i + 2] = _hcen[2]; }
  geo.setAttribute('hc', new THREE.BufferAttribute(hc, 3));
  (_bucket[key] = _bucket[key] || { mat, list: [] }).list.push({ geo, rank });
}
for (const H of houseList) {
  const { fp, hm, lo, hi, hsh, rank } = H;
  _bucket = inCore(fp.cx, fp.cz) ? _parts : _outerParts;
  const L = fp.long, W = fp.short, fl = Math.max(2, Math.min(8, Math.round(hm / FLOOR))), base = (hi - lo) / U + 0.1;
  const top = base + fl * FLOOR;
  _hcen[0] = wX(fp.cx); _hcen[1] = wZ(fp.cz); _hcen[2] = lo;
  _M.makeTranslation(wX(fp.cx), lo - 0.1 * U, wZ(fp.cz)).multiply(_R.makeRotationY(-fp.ang)).multiply(new THREE.Matrix4().makeScale(U, U, U));
  const newar = hsh % 10 < 7, rep = Math.max(1, Math.round(L / 3.4));
  if (newar) {
    part('brick', plainMat('#b5603f'), L, top, W, 0, top / 2, 0, 0, rank);
    const fm = newarFacade(fl);
    for (const s of [-1, 1]) part('n' + fl, fm, L, fl * FLOOR, 0.06, 0, base + fl * FLOOR / 2, s * (W / 2 + 0.03), 0, rank, rep);
    // Tiled roof on the long sides, a dark ridge, carved struts under the eaves
    const rise = W * 0.22;
    for (const s of [-1, 1]) part('tile', plainMat('#9aa3ab'), L + 0.9, 0.2, W / 2 + 1.0, 0, top + rise / 2 + 0.05, s * (W / 4 + 0.25), s * 0.45, rank);
    part('ridge', plainMat('#6f7880'), L + 0.95, 0.25, 0.3, 0, top + rise + 0.15, 0, 0, rank);
    for (const s of [-1, 1]) for (const t of [-0.33, 0, 0.33]) part('strut', plainMat('#47291b'), 0.12, 0.9, 0.12, t * L, top - 0.25, s * (W / 2 + 0.35), s * 0.5, rank);
  } else {
    const col = PAINT_COLS[hsh % PAINT_COLS.length];
    part('c' + col, plainMat(col), L, top, W, 0, top / 2, 0, 0, rank);
    const fm = modernFacade(fl, col);
    for (const s of [-1, 1]) part('m' + fl + col, fm, L, fl * FLOOR, 0.06, 0, base + fl * FLOOR / 2, s * (W / 2 + 0.03), 0, rank, Math.max(1, Math.round(L / 3)));
    part('c' + col, plainMat(col), L + 0.1, 0.6, W + 0.1, 0, top + 0.3, 0, 0, rank); // parapet
    part('slab', plainMat('#b9bec2'), L - 0.4, 0.1, W - 0.4, 0, top + 0.56, 0, 0, rank);
    part('tank', plainMat('#4a4f55'), 1.0, 1.1, 1.0, L / 2 - 1, top + 1.15, -W / 2 + 1, 0, rank);
  }
  // Round the six places: a stone step along each front, carved lattice windows standing proud of the
  // brick (a wide one on the top floor), grey-green shop doors or rolling shutters, balconies on the new houses
  if (nearPlace(fp.cx, fp.cz)) {
    const bays = Math.max(1, Math.round(L / 3.4));
    for (const s of [-1, 1]) {
      part('dalan', plainMat('#b5ada4'), L, 0.4, 0.6, 0, base - 0.15, s * (W / 2 + 0.3), 0, rank);
      for (let i = 0; i < bays; i++) {
        const x = -L / 2 + (i + 0.5) * L / bays;
        if (newar) {
          part('hdoor', doorMat, 1.1, 2.0, 0.1, x, base + 1.0, s * (W / 2 + 0.06), 0, rank);
          for (let f = 1; f < fl; f++) { const wide = f === fl - 1; part('hlat', houseLatMat, wide ? 2.0 : 0.9, wide ? 0.9 : 1.2, 0.16, x, base + f * FLOOR + 1.3, s * (W / 2 + 0.08), 0, rank); }
        } else part('shut', shutterMat, Math.min(2.4, L / bays - 0.4), 2.3, 0.08, x, base + 1.15, s * (W / 2 + 0.06), 0, rank);
      }
    }
    if (!newar) for (let f = 1; f < fl; f++) {
      part('slab', plainMat('#b9bec2'), L * 0.5, 0.12, 0.9, 0, base + f * FLOOR, W / 2 + 0.45, 0, rank);
      part('rail', plainMat('#5c554e'), L * 0.5, 0.9, 0.05, 0, base + f * FLOOR + 0.5, W / 2 + 0.88, 0, rank);
    }
  }
}
// One mesh per material, its parts sorted by rank (highest first)
function buildHouseSets(parts, parent) {
  return Object.values(parts).map(({ mat, list }) => {
    list.sort((a, b) => b.rank - a.rank);
    const geo = mergeGeometries(list.map((p) => p.geo));
    let n = 0;
    const ends = list.map((p) => (n += p.geo.index.count));
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = m.receiveShadow = true;
    m.customDepthMaterial = collapseDepth; // shadows sink with the houses
    parent.add(m);
    return { m, ranks: list.map((p) => p.rank), ends };
  });
}
const houseSets = buildHouseSets(_parts, scene);
const outerHouseSets = buildHouseSets(_outerParts, outerOnlyGroup);
const allHouseSets = [...houseSets, ...outerHouseSets];
const HOUSES_TOTAL = houseList.length;
// Leave out `share` (0..1) of the houses, those with the lowest ranks; returns how many are drawn
function thinHouses(share) {
  for (const H of allHouseSets) {
    let k = 0;
    while (k < H.ranks.length && H.ranks[k] >= share) k++;
    H.m.geometry.setDrawRange(0, k ? H.ends[k - 1] : 0);
    H.m.visible = k > 0;
  }
  return houseList.filter((h) => h.rank >= share).length;
}
