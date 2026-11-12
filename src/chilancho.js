/* ------------------------------------------------------------------ */
/* Chilancho and its square, in true metres, from OSM (the base, the   */
/* dome, four corner stupas, the shrines and the ring of lanes) and    */
/* the photos (kirtipur-hill/ref and Mapillary): a brick base with a   */
/* shrine on each side, a white dome and a gilded thirteen-ring spire, */
/* white corner stupas, an iron fence with a decorated gate and stone  */
/* lions, brick shikhara chaityas, an open pati with a red frill.      */
/* Local frame: origin at the base centre, +x along its long side.     */
/* ------------------------------------------------------------------ */
const CHIL = (() => {
  const fp = frameOf(1074769018), F = placeModel(group(0, 0, 0, S), fp, ICON);
  const c = Math.cos(fp.ang), s = Math.sin(fp.ang);
  const local = (x, z) => [((x - fp.cx) * c + (z - fp.cz) * s) / ICON, (-(x - fp.cx) * s + (z - fp.cz) * c) / ICON]; // map metres to the scaled model frame
  // The dome is mapped as a circle: its size is its extent, not an edge length
  const d = MAP.buildings.find((b) => b.id === 1074769020).p, xs = d.filter((_, k) => k % 2 === 0);
  return { fp, F, local, domeR: (Math.max(...xs) - Math.min(...xs)) / 2 };
})();
const WHITE = '#fffaf2', GILT = '#f5b841', NICHE_STONE = '#8c8176';
// A stupa: square brick base, white dome, gilded harmika and ring spire (sizes in metres)
function stupa(g, base, baseH, r, rings, ringR) {
  box(base, baseH, base, '#b5603f', 0, baseH / 2, 0, g);
  box(base + 0.08, 0.12, base + 0.08, '#e3b08e', 0, baseH, 0, g, false);
  const dm = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 9, 0, TAU, 0, Math.PI / 2), lam(WHITE));
  dm.position.y = baseH; dm.castShadow = dm.receiveShadow = true; g.add(dm);
  const hy = baseH + r * 0.92;
  box(r * 0.5, r * 0.32, r * 0.5, GILT, 0, hy + r * 0.16, 0, g);
  const ry = hy + r * 0.32, step = ringR * 0.55;
  for (let i = 0; i < rings; i++) cyl(ringR * (1 - i / (rings + 2)), ringR * (1.05 - i / (rings + 2)), step, 10, i % 2 ? GILT : '#d99926', 0, ry + (i + 0.5) * step, 0, g);
  const top = ry + rings * step;
  cyl(ringR * 1.1, ringR * 0.5, step, 10, GILT, 0, top + step / 2, 0, g);
  cyl(0.03, ringR * 0.35, ringR * 1.4, 8, GILT, 0, top + step + ringR * 0.7, 0, g);
  return top + step + ringR * 1.4;
}
// A small brick shikhara chaitya: stepped base, a niche, a tall brick spire
function brickChaitya(F, x, z, s = 1) {
  const g = group(x, 0, z, F); g.scale.setScalar(s);
  box(2.2, 0.5, 2.2, '#9e3b26', 0, 0.25, 0, g); box(1.7, 0.4, 1.7, '#b5603f', 0, 0.7, 0, g);
  box(1.3, 1.3, 1.3, '#b5603f', 0, 1.55, 0, g); box(0.5, 0.7, 0.05, '#26221f', 0, 1.5, 0.66, g, false);
  pyramid(1.1, 2.0, '#9e3b26', 0, 3.2, 0, g); cyl(0.02, 0.12, 0.4, 6, '#d99926', 0, 4.4, 0, g);
}
(() => {
  const F = CHIL.F, fp = CHIL.fp;
  // Main stupa: two brick terraces, a base with a shrine on each side and spires at the corners, then dome and spire
  footing(F, fp.long, fp.short, '#e3b08e');
  box(fp.long, 1.0, fp.short, '#e3b08e', 0, 0.5, 0, F);
  box(fp.long - 1.6, 0.8, fp.short - 1.6, '#c48966', 0, 1.4, 0, F);
  const g = group(0, 1.8, 0, F), B = 7;
  box(B, 2.4, B, '#b5603f', 0, 1.2, 0, g);
  for (let y = 0.4; y < 2.4; y += 0.4) box(B + 0.04, 0.05, B + 0.04, '#9e3b26', 0, y, 0, g, false);
  for (let a = 0; a < 4; a++) {
    const p = group(0, 0, 0, g); p.rotation.y = a * Math.PI / 2;
    box(1.8, 2.0, 0.9, '#9e3b26', 0, 1.0, B / 2 + 0.35, p); box(0.7, 1.1, 0.05, '#26221f', 0, 0.9, B / 2 + 0.81, p, false);
    const tor = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.07, 6, 14, Math.PI), lam(NICHE_STONE)); tor.position.set(0, 1.35, B / 2 + 0.83); p.add(tor); // plain stone pediment arch, not gilded - the photos show bare weathered brick round each niche
    box(1.5, 0.12, 0.08, NICHE_STONE, 0, 0.1, B / 2 + 0.83, p, false);
    diyaRow(p, -0.6, 0.02, B / 2 + 1.05, 0.6, B / 2 + 1.05, 0.2); // butter lamps before each shrine
    for (const s of [-1, 1]) cyl(0.12, 0.12, 0.4, 8, NICHE_STONE, s * 1.05, 2.2, B / 2 + 0.35, p); // small stone finials beside the niche
    pyramid(1.2, 1.8, '#b5603f', 0, 2.9, B / 2 + 0.3, p);
    pyramid(0.6, 1.3, '#9e3b26', B / 2 - 0.4, 3.05, B / 2 - 0.4, p);
  }
  const sg = group(0, 2.4, 0, g);
  diyaRing(sg, Math.min(CHIL.domeR + 0.3, B / 2 - 0.2), 0.02, 40); // and a ring of them round the foot of the dome
  const top = 1.8 + 2.4 + stupa(sg, 0.01, 0.01, CHIL.domeR, 13, 0.85);
  // The Buddha eyes, brows, nose and third eye on all four faces of the harmika
  { const r = CHIL.domeR, w = r * 0.62, h = r * 0.4, hy = 0.01 + r * 0.92 + r * 0.17;
    box(w, h, w, GILT, 0, hy, 0, sg);
    for (let a = 0; a < 4; a++) {
      const p = group(0, hy, 0, sg); p.rotation.y = a * Math.PI / 2;
      for (const s of [-1, 1]) {
        box(w * 0.3, h * 0.16, 0.06, WHITE, s * w * 0.22, 0, w / 2 + 0.02, p, false); box(w * 0.1, h * 0.14, 0.07, '#1c1a1c', s * w * 0.22, 0, w / 2 + 0.04, p, false);
        box(w * 0.34, h * 0.04, 0.06, '#26221f', s * w * 0.22, h * 0.17, w / 2 + 0.02, p, false); // brow
      }
      box(w * 0.06, h * 0.07, 0.06, WHITE, 0, h * 0.2, w / 2 + 0.02, p, false); // third eye
      box(w * 0.07, h * 0.42, 0.07, '#c45134', 0, -h * 0.12, w / 2 + 0.03, p, false); // the curl that is the nose
    }
    box(w * 1.12, h * 0.1, w * 1.12, '#d99926', 0, hy + h / 2, 0, sg, false); }
  landmarks.stupa = { fp, top: (top + 1) * U * ICON };
  // The four white corner stupas, where OSM maps them
  const corners = [];
  for (const id of [1074769015, 1074769016, 1074769017, 1074769019]) {
    const f = footprint(MAP.buildings.find((b) => b.id === id).p), [x, z] = CHIL.local(f.cx, f.cz);
    const cg = group(x, 0, z, F);
    footing(cg, f.long, f.long, '#b5603f');
    corners.push([x, z, stupa(cg, f.long * 0.85, 1.3, f.long * 0.32, 9, 0.38)]);
  }
  // Prayer flags from the main spire to each corner spire
  const cols = ['#4fa3b8', WHITE, '#e06d44', '#63964d', GILT];
  for (const [x, z, h] of corners) {
    beam(0, top - 2, 0, x, h - 0.6, z, 0.04, '#e6e1dc', F);
    for (let i = 1; i < 12; i++) { const u = i / 12; box(0.35, 0.4, 0.04, cols[i % 5], x * u, (top - 2) + (h - 0.6 - top + 2) * u - 0.3 - Math.sin(u * Math.PI) * 0.6, z * u, F, false); }
  }
  // The iron fence round the stupa court, with the decorated gate and stone lions on the side facing the steps
  const X = 13, Z = 14.5;
  for (let x = -X; x <= X; x += 1.3) for (const z of [-Z, Z]) if (!(z > 0 && Math.abs(x) < 1.8)) box(0.08, 1.6, 0.08, '#26221f', x, 0.8, z, F);
  for (let z = -Z; z <= Z; z += 1.3) for (const x of [-X, X]) box(0.08, 1.6, 0.08, '#26221f', x, 0.8, z, F);
  for (const z of [-Z, Z]) for (const y of [0.5, 1.5]) { if (z > 0) { box(X - 1.8, 0.06, 0.06, '#26221f', -(X + 1.8) / 2, y, z, F, false); box(X - 1.8, 0.06, 0.06, '#26221f', (X + 1.8) / 2, y, z, F, false); } else box(2 * X, 0.06, 0.06, '#26221f', 0, y, z, F, false); }
  for (const x of [-X, X]) for (const y of [0.5, 1.5]) box(0.06, 0.06, 2 * Z, '#26221f', x, y, 0, F, false);
  box(0.25, 3.4, 0.25, '#388296', -1.8, 1.7, Z, F); box(0.25, 3.4, 0.25, '#388296', 1.8, 1.7, Z, F);
  const arch = new THREE.Mesh(new THREE.TorusGeometry(1.8, 0.12, 6, 16, Math.PI), lam(GILT));
  arch.position.set(0, 3.4, Z); F.add(arch);
  for (const s of [-1, 1]) { const l = group(s * 2.7, 0, Z + 0.6, F); box(0.8, 0.5, 1.2, '#968e85', 0, 0.25, 0, l); box(0.6, 0.8, 0.6, '#5c554e', 0, 0.9, -0.1, l); box(0.5, 0.5, 0.45, '#5c554e', 0, 1.45, 0.15, l); }
  // A row of prayer wheels along the inside of the east fence, on a low brick ledge
  box(1.0, 0.35, 2 * Z - 6, '#b5603f', X - 1.0, 0.18, 0, F);
  for (let z = -Z + 3; z <= Z - 3; z += 0.9) { cyl(0.26, 0.26, 0.7, 10, z % 1.8 < 0.9 ? '#c45134' : '#d99926', X - 1.0, 0.7, z, F); cyl(0.05, 0.05, 0.25, 6, GILT, X - 1.0, 1.15, z, F); }
  // Grass in the court and a brick path to the gate
  for (const [x, z, w, d] of [[-8, -10, 7, 6], [8, -10, 7, 6], [-8, 10, 6, 5], [8, 10, 6, 5]]) box(w, 0.04, d, '#82b36a', x, 0.02, z, F, false);
  box(2.4, 0.05, Z - fp.short / 2, '#c48966', 0, 0.025, (Z + fp.short / 2) / 2, F, false);
  // Brick chaityas round the square: the three OSM shrines on the east side and four more in the corners
  for (const id of [324488053, 324488167, 324488275]) { const f = footprint(MAP.buildings.find((b) => b.id === id).p); brickChaitya(F, ...CHIL.local(f.cx, f.cz), 1); }
  for (const [x, z] of [[-19, 17], [-20, -18], [17, -19], [18, 18]]) brickChaitya(F, x, z, 0.9);
  for (const x of [-5, 5]) { const w = group(x, 0, Z + 2.5, F); stupa(w, 1.4, 0.5, 0.55, 5, 0.18); } // two little white chaityas by the gate
  // An open pati along the west side and another along the north: brick plinth, wooden posts, tiled roof, red frill
  const pati = (x0, x1, z0, z1) => {
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, w = x1 - x0, d = z1 - z0, long = w > d;
    box(w, 0.6, d, '#b5603f', cx, 0.3, cz, F);
    for (let t = 0; t <= (long ? w : d); t += 1.6) for (const e of [0.3, (long ? d : w) - 0.3]) box(0.18, 2.2, 0.18, WOOD, long ? x0 + t : x0 + e, 1.7, long ? z0 + e : z0 + t, F);
    for (const s of [-1, 1]) { const r = box(long ? w + 0.8 : d / 2 + 0.9, 0.2, long ? d / 2 + 0.9 : d + 0.8, '#9e3b26', long ? cx : cx + s * (w / 4 + 0.3), 3.1, long ? cz + s * (d / 4 + 0.3) : cz, F); if (long) r.rotation.x = s * 0.4; else r.rotation.z = -s * 0.4; }
    box(long ? w + 0.8 : 0.06, 0.35, long ? 0.06 : d + 0.8, '#c45134', long ? cx : (x1 > 0 ? x0 - 0.45 : x1 + 0.45), 2.7, long ? (z1 > 0 ? z0 - 0.45 : z1 + 0.45) : cz, F, false);
  };
  pati(-23.5, -19.5, -14, 8);
  pati(-12, 9, -23.5, -20);
})();
