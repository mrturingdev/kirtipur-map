/* ------------------------------------------------------------------ */
/* Street detail, from OSM points and outlines, dressed as the         */
/* Mapillary photos show the lanes: pati shelters, shopfronts with     */
/* goods hanging at the door, Sankhadhar Sakhwa's statue, poles with   */
/* bundles of wires, parked motorbikes and cars, blue water drums.     */
/* Pati are drawn wherever OSM maps them; the rest fills the stretch   */
/* from Bagh Bhairab's gate down to Dey Pukhu and the lanes round each */
/* of the six places.                                                 */
/* ------------------------------------------------------------------ */
const ZONE = { x0: -55, x1: 35, z0: 18, z1: 100 }; // map metres: Bhairab's gate to below Dey Pukhu
const inStretch = (x, z) => x > ZONE.x0 && x < ZONE.x1 && z > ZONE.z0 && z < ZONE.z1;
const inZone = (x, z) => inStretch(x, z) || nearPlace(x, z); // street detail also round all six places
const inAnySite = (x, z) => Object.values(SITES).some((S_) => inPoly(S_.poly, x, z));

/* Pati: brick plinth, wooden posts, a tiled roof with a red frill, on its OSM outline */
for (const sh of MAP.shelters) {
  const f = footprint(sh.p), g = atMapPoint(f.cx, f.cz, f.ang), L = Math.max(3, f.long), W = Math.max(2.4, f.short);
  footing(g, L, W, '#9e3b26');
  box(L, 0.6, W, '#b5603f', 0, 0.3, 0, g);
  for (let x = -L / 2 + 0.3; x <= L / 2 - 0.2; x += Math.max(1.2, (L - 0.6) / Math.round((L - 0.6) / 1.6))) for (const s of [-1, 1]) box(0.2, 2.2, 0.2, WOOD, x, 1.7, s * (W / 2 - 0.3), g);
  box(L * 0.9, 1.4, 0.15, '#b5603f', 0, 1.3, -W / 2 + 0.15, g); // the back wall
  for (const s of [-1, 1]) { const r = box(L + 0.8, 0.2, W / 2 + 0.9, '#9e3b26', 0, 3.05, s * (W / 4 + 0.25), g); r.rotation.x = s * 0.42; }
  box(L + 0.8, 0.35, 0.06, '#c45134', 0, 2.65, W / 2 + 0.68, g, false);
}

/* Shopfronts at the mapped shops, cafes and restaurants, and the statue on Prajaa Dabu */
const GOODS = ['#e06d44', '#f5b841', '#4fa3b8', '#fa9e7d', '#63964d', '#fffaf2', '#c45134'];
for (const P of MAP.pois) {
  if (!inZone(P.x, P.z) || inAnySite(P.x, P.z)) continue;
  const r = rand(P.x * 7 + P.z), g = atMapPoint(P.x, P.z, r * TAU);
  if (P.t === 'monument') { // Sankhadhar Sakhwa: a dark bronze figure on a stone pedestal under a little canopy
    box(1.6, 1.4, 1.6, '#b5ada4', 0, 0.7, 0, g); box(1.8, 0.15, 1.8, '#cfc8c0', 0, 1.45, 0, g);
    box(0.5, 0.9, 0.35, '#403a35', 0, 2.0, 0, g); box(0.3, 0.3, 0.3, '#403a35', 0, 2.6, 0, g); box(0.7, 0.12, 0.2, '#403a35', 0, 2.25, 0.12, g);
    for (const [x, z] of [[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]]) box(0.1, 2.2, 0.1, '#5c554e', x, 2.6, z, g);
    roof(g, 3.6, 0.99, 0.99, 0, 0.6, '#9e3b26');
    continue;
  }
  if (!['shop', 'cafe', 'restaurant'].includes(P.t)) continue;
  box(2.6, 0.3, 1.2, '#b5ada4', 0, 0.15, 0, g); // the stone step
  box(2.4, 2.2, 0.1, '#26221f', 0, 1.4, -0.55, g, false); // the open doorway
  for (let i = 0; i < 10; i++) box(0.22, 0.4, 0.06, GOODS[i % GOODS.length], -1 + (i % 5) * 0.5, 2.1 - Math.floor(i / 5) * 0.5, -0.45, g, false); // packets on strings
  box(2.6, 0.5, 0.06, GOODS[Math.floor(r * GOODS.length)], 0, 2.9, -0.5, g); // signboard
  if (P.t !== 'shop') { box(1.6, 0.8, 0.5, '#9c785d', 0.4, 0.7, 0.3, g); for (let i = 0; i < 4; i++) box(0.1, 0.15, 0.1, '#fffaf2', 0 + i * 0.25, 1.18, 0.3, g, false); } // tea counter
  else for (let i = 0; i < 3; i++) box(0.4, 0.4, 0.4, GOODS[(i + 3) % GOODS.length], -0.9 + i * 0.5, 0.5, 0.2, g, false); // sacks and crates out front
}

/* Along the lanes of the stretch: poles and wires, parked motorbikes and cars, water drums */
(() => {
  const poles = [];
  for (const rd of MAP.roads) {
    let carry = 8; // metres since the last pole
    let last = null;
    for (let k = 0; k + 3 < rd.p.length; k += 2) {
      const ax = rd.p[k], az = rd.p[k + 1], bx = rd.p[k + 2], bz = rd.p[k + 3], len = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / (len || 1), uz = (bz - az) / (len || 1);
      for (let t = 0; t < len; t += 2) {
        const x = ax + ux * t, z = az + uz * t;
        if (!inZone(x, z) || inAnySite(x, z)) { last = null; continue; }
        carry += 2;
        const side = rand(x + z * 3) < 0.5 ? -1 : 1, sx = x - uz * side * 1.6, sz = z + ux * side * 1.6, r = rand(x * 3 + z);
        if (carry >= 22) { // a concrete pole, joined to the last one by three wires
          carry = 0;
          const top = groundY(wX(sx), wZ(sz)) + 8.5 * U, p = [wX(sx), top, wZ(sz)];
          const g = atMapPoint(sx, sz); box(0.25, 9, 0.25, '#968e85', 0, 4.5, 0, g); box(1.4, 0.12, 0.12, '#787067', 0, 8.3, 0, g);
          if (r < 0.2) box(0.8, 1.0, 0.6, '#5c554e', 0, 7.0, 0.4, g); // a transformer
          if (last) for (const dy of [0, -0.15, -0.3]) beam(last[0], last[1] + dy * U * 4, last[2], p[0], p[1] + dy * U * 4, p[2], 0.018, '#26221f', S);
          last = p; poles.push(p);
        } else if (r < 0.09) { // a parked motorbike
          const g = atMapPoint(sx, sz, Math.atan2(uz, ux) + (r < 0.045 ? 0 : Math.PI));
          box(1.7, 0.45, 0.32, GOODS[Math.floor(r * 77) % GOODS.length], 0, 0.75, 0, g); box(0.7, 0.15, 0.34, '#26221f', -0.2, 1.02, 0, g);
          for (const wx_ of [-0.62, 0.62]) box(0.55, 0.55, 0.14, '#26221f', wx_, 0.28, 0, g);
          box(0.08, 0.5, 0.6, '#5c554e', 0.75, 1.1, 0, g);
        } else if (r > 0.985) { // a car
          const g = atMapPoint(sx - uz * side * 0.6, sz + ux * side * 0.6, Math.atan2(uz, ux));
          const c = r > 0.993 ? '#c45134' : '#fffaf2';
          box(4, 0.8, 1.7, c, 0, 0.7, 0, g); box(2.2, 0.6, 1.5, '#bce4eb', -0.2, 1.4, 0, g);
          for (const [wx_, wz] of [[-1.3, -0.85], [1.3, -0.85], [-1.3, 0.85], [1.3, 0.85]]) box(0.6, 0.6, 0.2, '#26221f', wx_, 0.3, wz, g);
        } else if (r > 0.94 && r < 0.955) { // a blue water drum by a doorway
          const g = atMapPoint(sx, sz); cyl(0.35, 0.35, 0.9, 10, '#388296', 0, 0.45, 0, g);
        }
      }
    }
  }
})();

/* Tole names in the stretch, as small labels (hud.js draws them) */
const TOLES = MAP.pois.filter((P) => P.t === 'tole' && P.n && inStretch(P.x, P.z)); // labels stay to the stretch: more would crowd the island view
