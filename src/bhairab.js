/* ------------------------------------------------------------------ */
/* Bagh Bhairab and its compound, in true metres. Sources: the OSM     */
/* outlines and ~90 Wikimedia Commons photos (kirtipur-map/ref/bhairab).*/
/* Local frame: origin at the temple's OSM footprint centre, +x along  */
/* its long side, +z toward the court, the gate and Dey Pukhu (SSW).  */
/* The temple fronts the court on its long side; the three-storey west */
/* range on the left as you enter, the shrines on the right, the back  */
/* on the valley edge. Each shrine's spot is estimated from the photos.*/
/* ------------------------------------------------------------------ */
const bells = [];
const BB = (() => {
  const fp = footprint(MAP.buildings.find((b) => b.id === LANDMARK_IDS.bhairab).p);
  // Unturned, the footprint frame's +z points south-south-west, straight at Dey Pukhu: the front and the gate face it
  return { fp, F: placeModel(group(0, 0, 0, S), fp, ICON) };
})();
const STONE = '#b5ada4', STONE_L = '#cfc8c0', BRICK = '#b5603f', BRICK_D = '#9e3b26', TILE = '#9e3b26', GOLD = '#f5b841', CREAM = '#e8d2bc';
const ROOF_M = '#968e85'; // the grey metal top roof

/* ------------------------------------------------------------------ */
/* The temple, in metres, front (door, torana, lions) on +z           */
/* ------------------------------------------------------------------ */
(() => {
  const g = group(0, 0, 0, BB.F);
  const W = 9.6, D = 8.3; // the OSM footprint: along the front, front to back
  footing(g, W, D, STONE);
  box(W, 0.45, D, STONE_L, 0, 0.22, 0, g);
  box(W - 0.6, 0.15, D - 0.6, STONE, 0, 0.52, 0, g);
  for (let k = 0; k < 3; k++) box(2.4, 0.15, 0.4, STONE_L, 0, 0.07 + k * 0.15, D / 2 + 0.2 + (2 - k) * 0.35, g); // steps up to the door
  let y = 0.6;
  // Ground storey: cream walls in a dark timber frame, an outer ring of black posts carrying the first roof
  const cw = W - 2.2, cd = D - 2.2;
  box(cw, 2.6, cd, CREAM, 0, y + 1.3, 0, g);
  for (let i = 0; i <= 4; i++) for (const s of [-1, 1]) { box(0.16, 2.6, 0.12, WOOD, -cw / 2 + i * cw / 4, y + 1.3, s * (cd / 2 + 0.03), g); }
  for (let i = 0; i <= 5; i++) for (const s of [-1, 1]) { box(0.12, 2.6, 0.16, WOOD, s * (cw / 2 + 0.03), y + 1.3, -cd / 2 + i * cd / 5, g); }
  for (const s of [-1, 1]) box(cw + 0.1, 0.14, 0.14, WOOD, 0, y + 0.9, s * (cd / 2 + 0.04), g, false);
  for (let i = 0; i <= 6; i++) for (const s of [-1, 1]) box(0.2, 2.7, 0.2, '#26221f', -W / 2 + 0.35 + i * (W - 0.7) / 6, y + 1.35, s * (D / 2 - 0.35), g);
  for (let i = 1; i < 7; i++) for (const s of [-1, 1]) box(0.2, 2.7, 0.2, '#26221f', s * (W / 2 - 0.35), y + 1.35, -D / 2 + 0.35 + i * (D - 0.7) / 7, g);
  // The main door: gilded torana, golden lions, bells
  box(1.6, 2.1, 0.06, '#26221f', 0, y + 1.05, cd / 2 + 0.06, g, false);
  torana(g, 0, y + 2.1, cd / 2 + 0.1, 1.1);
  diyaRow(g, -0.9, y, cd / 2 + 0.4, 0.9, cd / 2 + 0.4, 0.3); // diyas on the threshold before the door
  for (const s of [-1, 1]) { box(0.45, 0.7, 0.6, GOLD, s * 1.35, y + 0.35, cd / 2 + 0.6, g); box(0.35, 0.4, 0.35, GOLD, s * 1.35, y + 0.85, cd / 2 + 0.75, g); }
  for (const s of [-1, 1]) {
    const piv = group(s * 2.6, y + 2.2, cd / 2 + 1.4, g);
    piv.userData.live = true;
    box(0.12, 2.5, 0.12, '#5c554e', s * 2.6, y + 1.2, cd / 2 + 1.4, g);
    box(0.5, 0.55, 0.5, '#d99926', 0, -0.35, 0, piv);
    bells.push({ g: piv, swing: 0 });
  }
  box(W - 0.4, 0.22, D - 0.4, WOOD, 0, y + 2.8, 0, g);
  struts(g, y + 3.1, W / 2 - 0.35, D / 2 - 0.35, 7);
  roof(g, y + 2.85, W / 2 + 1.0, D / 2 + 1.0, 0.55, 2.0, TILE); // the tiled first roof, deep eaves
  for (const s of [-1, 1]) { box(W + 2.1, 0.45, 0.06, '#c45134', 0, y + 2.68, s * (D / 2 + 1.02), g, false); box(0.06, 0.45, D + 2.1, '#c45134', s * (W / 2 + 1.02), y + 2.68, 0, g, false); }
  y += 4.85;
  // Second storey: a brick base with carved windows, the carved timber band, weapons hung under the eaves
  const w2 = W * 0.62, d2 = D * 0.64;
  box(w2, 1.0, d2, BRICK, 0, y + 0.5, 0, g);
  box(w2 + 0.02, 1.9, d2 + 0.02, carvedMat, 0, y + 1.95, 0, g);
  for (const s of [-1, 1]) { for (const t of [-1, 0, 1]) box(1.0, 0.9, 0.1, latticeMat, t * w2 * 0.3, y + 1.8, s * (d2 / 2 + 0.05), g, false); for (const t of [-1, 1]) box(0.1, 0.9, 1.0, latticeMat, s * (w2 / 2 + 0.05), y + 1.8, t * d2 * 0.25, g, false); } // carved lattice windows
  for (let i = 0; i < 6; i++) for (const s of [-1, 1]) box(0.08, 0.6, 0.05, '#968e85', -w2 / 2 + 0.4 + i * (w2 - 0.8) / 5, y + 2.3, s * (d2 / 2 + 0.06), g, false);
  struts(g, y + 2.6, w2 / 2, d2 / 2, 5);
  roof(g, y + 2.9, w2 / 2 + 1.2, d2 / 2 + 1.2, 0.5, 1.5, '#6e422c'); bellFringe(g, y + 2.9, w2 / 2 + 1.2, d2 / 2 + 1.2);
  y += 4.4;
  const w3 = W * 0.42, d3 = D * 0.44;
  box(w3, 0.7, d3, BRICK, 0, y + 0.35, 0, g);
  box(w3 + 0.02, 1.3, d3 + 0.02, carvedMat, 0, y + 1.35, 0, g);
  struts(g, y + 1.7, w3 / 2, d3 / 2, 3);
  roof(g, y + 2.0, w3 / 2 + 1.0, d3 / 2 + 1.0, 0.25, 1.5, ROOF_M);
  y += 3.5;
  box(0.3, 0.16, d3 * 0.9, '#d99926', 0, y + 0.05, 0, g); // ridge with its row of eleven finials
  for (let i = 0; i < 11; i++) if (i !== 5) cyl(0.02, 0.08, 0.5, 6, GOLD, 0, y + 0.35, -d3 * 0.42 + i * d3 * 0.084, g);
  box(0.8, 0.55, 0.8, WOOD, 0, y + 0.35, 0, g); roof(g, y + 0.6, 0.5, 0.5, 0, 0.5, ROOF_M);
  gajur(g, y + 1.05, 0.9);
  for (const [dx, c, w] of [[-0.35, '#5c554e', 0.1], [0, '#787067', 0.1], [0.35, GOLD, 0.12]]) { // banners to the first roof
    beam(dx, y - 0.4, d3 / 2 + 0.6, dx * 2.2, 4.6, D / 2 + 0.9, w, c, g);
    cyl(0.12, 0.05, 0.25, 6, '#d99926', dx * 2.2, 4.45, D / 2 + 0.92, g);
  }
  landmarks.bhairab = { fp: BB.fp, top: (y + 2.2) * U, scale: 1.2 };
})();

/* ------------------------------------------------------------------ */
/* Ranges round the court: brick, carved windows, an arcade facing in  */
/* ------------------------------------------------------------------ */
// face: which side is toward the court ('x+', 'x-', 'z+', 'z-')
function sattal(x0, x1, z0, z1, storeys, face, gate) {
  const w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, h = storeys * 2.8, F = BB.F;
  box(w, h, d, BRICK, cx, h / 2, cz, F);
  for (let k = 1; k < storeys; k++) box(w + 0.06, 0.12, d + 0.06, '#e8d2bc', cx, k * 2.8, cz, F, false);
  const ax = face[0] === 'z', sgn = face[1] === '+' ? 1 : -1, along = ax ? w : d;
  const fx = ax ? cx : (sgn > 0 ? x1 : x0), fz = ax ? (sgn > 0 ? z1 : z0) : cz; // centre of the court face
  const at = (t, off) => (ax ? [cx + t, fz + sgn * off] : [fx + sgn * off, cz + t]);
  for (let k = 1; k < storeys; k++) { const [x, z] = at(0, 0.04); box(ax ? w * 0.86 : 0.08, 1.1, ax ? 0.08 : d * 0.86, carvedMat, x, k * 2.8 + 1.3, z, F, false); }
  { const [x, z] = at(0, 0.03); box(ax ? w * 0.92 : 0.05, 2.1, ax ? 0.05 : d * 0.92, '#26221f', x, 1.05, z, F, false); }
  for (let t = -along / 2 + 0.4; t < along / 2 - 0.3; t += 1.6) { const [x, z] = at(t, 0.15); box(0.2, 2.3, 0.2, WOOD, x, 1.15, z, F); }
  if (gate !== undefined) { const [x, z] = at(gate, 0); box(ax ? 2.4 : d + 0.2, 2.6, ax ? d + 0.2 : 2.4, '#26221f', ax ? x : cx, 1.3, ax ? cz : z, F, false); } // a passage through
  const long = w >= d, L = (long ? w : d) + 0.8, half = (long ? d : w) / 2 + 0.7;
  for (const s of [-1, 1]) {
    const r = box(long ? L : half * 1.15, 0.22, long ? half * 1.15 : L, '#787067', long ? cx : cx + s * half / 2, h + 0.5, long ? cz + s * half / 2 : cz, F);
    if (long) r.rotation.x = s * 0.45; else r.rotation.z = -s * 0.45;
  }
  box(long ? L : 0.3, 0.25, long ? 0.3 : L, '#5c554e', cx, h + 0.95, cz, F);
}
sattal(-14.2, -7.9, -3.1, 23.7, 3, 'x+'); // the west range (OSM): the three-storey house on the left as you enter
sattal(12.4, 15.4, 9, 24.8, 2, 'x-');      // a lower range along the east side of the court

/* ------------------------------------------------------------------ */
/* The court: stone path, chaitya planter, pillars; the shrines on the */
/* right as you enter; the railed valley edge and trees behind          */
/* ------------------------------------------------------------------ */
// Small shrine builders (metres)
function whiteShikhara(F, x, z, s, domeCol, yaw = 0) { // Narayan / Ram Chandra: white, red base, a dome
  const g = group(x, 0, z, F); g.scale.setScalar(s); g.rotation.y = yaw;
  box(2.6, 0.5, 2.6, STONE, 0, 0.25, 0, g); box(2, 0.5, 2, '#c45134', 0, 0.75, 0, g);
  box(1.8, 1.9, 1.8, '#fffaf2', 0, 1.95, 0, g); box(0.8, 1.2, 0.05, '#9e3b26', 0, 1.7, 0.92, g, false);
  box(2.0, 0.25, 2.0, '#c45134', 0, 2.95, 0, g); box(1.4, 0.6, 1.4, '#fffaf2', 0, 3.4, 0, g);
  const d = new THREE.Mesh(new THREE.SphereGeometry(0.75, 10, 5, 0, TAU, 0, Math.PI / 2), lam(domeCol)); d.position.y = 3.7; d.castShadow = true; g.add(d);
  cyl(0.03, 0.14, 0.6, 6, GOLD, 0, 4.7, 0, g);
}
function stoneShikhara(F, x, z, s, yaw = 0) { // Bhawani Shankar: stone, on a stepped plinth
  const g = group(x, 0, z, F); g.scale.setScalar(s); g.rotation.y = yaw;
  box(3, 0.4, 3, STONE, 0, 0.2, 0, g); box(2.4, 0.4, 2.4, STONE_L, 0, 0.6, 0, g);
  box(1.6, 1.6, 1.6, STONE, 0, 1.6, 0, g); box(0.6, 0.9, 0.05, '#26221f', 0, 1.4, 0.82, g, false);
  pyramid(1.2, 2.4, STONE, 0, 3.6, 0, g); cyl(0.02, 0.1, 0.4, 6, GOLD, 0, 5.0, 0, g);
}
function pagodaShrine(F, x, z, s, yaw = 0) { // Yamaleshwar: a two-roofed brick pagoda on a plinth
  const g = group(x, 0, z, F); g.scale.setScalar(s); g.rotation.y = yaw;
  box(3.4, 0.8, 3.4, STONE, 0, 0.4, 0, g); box(2, 2.2, 2, BRICK_D, 0, 1.9, 0, g); box(0.8, 1.3, 0.06, '#d99926', 0, 1.6, 1.02, g, false);
  for (let i = 0; i < 4; i++) for (const t of [-1, 1]) box(0.1, 2.2, 0.1, WOOD, -1.05 + i * 0.7, 1.9, t * 1.15, g);
  roof(g, 3.0, 2.0, 2.0, 0.35, 0.9, TILE); box(1.1, 1.0, 1.1, BRICK, 0, 4.4, 0, g); roof(g, 4.9, 0.92, 0.92, 0, 0.9, TILE); gajur(g, 5.7, 0.55);
}
(() => {
  const F = BB.F, front = 4.15 + 0.9, GATE = 25.3, R = -Math.PI / 2, Lf = Math.PI / 2; // R / Lf turn a shrine to face the path
  const wall = (x0, x1, z0, z1, h = 1.8) => { box(x1 - x0, h, z1 - z0, BRICK, (x0 + x1) / 2, h / 2, (z0 + z1) / 2, F); box(x1 - x0 + 0.2, 0.18, z1 - z0 + 0.2, '#787067', (x0 + x1) / 2, h + 0.08, (z0 + z1) / 2, F, false); };
  // The main gate in the south wall, facing Dey Pukhu, under a tiled roof
  wall(-15.6, -1.7, GATE - 0.25, GATE + 0.25); wall(1.7, 15.6, GATE - 0.25, GATE + 0.25);
  wall(-15.6, -15.1, -9.6, GATE); wall(15.1, 15.6, -9.6, GATE);
  for (const s of [-1, 1]) box(0.8, 3.8, 0.8, BRICK_D, s * 1.8, 1.9, GATE, F);
  box(4.6, 0.3, 1.4, WOOD, 0, 3.9, GATE, F); box(3.4, 0.6, 0.12, GOLD, 0, 3.4, GATE + 0.5, F, false);
  roof(group(0, 0, GATE, F), 4.0, 1.98, 0.8, 0, 1.0, TILE);
  // The back, on the valley edge: a low wall and an iron railing, big trees beyond
  wall(-15.6, 15.6, -9.6, -9.1, 0.9);
  for (let x = -15; x <= 15; x += 1.5) box(0.08, 1.2, 0.08, '#26221f', x, 1.1, -9.35, F);
  box(31, 0.06, 0.1, '#26221f', 0, 1.7, -9.35, F, false);
  // Each tree: a trunk down the slope and a crown of faceted blobs. The blobs' flat-shaded material
  // keeps them in their own bake() batch, as icosahedra are not indexed like the boxes.
  const crown = new THREE.IcosahedronGeometry(1, 0);
  for (const [x, s] of [[-9, 1.2], [3, 1.4], [12, 1.1]]) {
    cyl(0.28 * s, 0.42 * s, 4 * s + 8, 6, '#6e422c', x, 2 * s - 4, -13, F);
    for (const [dx, dy, dz, r, col] of [[0, 5.2, 0, 2.9, '#497837'], [1.5, 6.6, -0.7, 2.1, '#63964d'], [-1.3, 6.9, 0.9, 1.9, '#497837'], [0.3, 8.0, 0.2, 1.5, '#63964d']]) {
      const o = new THREE.Mesh(crown, lam(col, { flatShading: true }));
      o.position.set(x + dx * s, dy * s, -13 + dz * s); o.scale.set(r * s, r * s * 0.82, r * s); o.rotation.y = x + dy;
      o.castShadow = o.receiveShadow = true; F.add(o);
    }
  }
  // The long stone path from the gate to the temple steps
  for (let z = front; z < GATE - 0.4; z += 0.8) for (const x of [-0.8, 0, 0.8]) box(0.76, 0.08, 0.76, (Math.round(z * 5) + x * 5) % 2 ? STONE_L : STONE, x, 0.04, z + 0.4, F, false);
  // Left of the path: the stone chaitya on its planter and the tall pillar with a gilded figure; a brick platform by the west range
  box(2, 0.9, 2, STONE, -4.2, 0.45, 9.5, F); box(1.6, 0.25, 1.6, '#63964d', -4.2, 0.95, 9.5, F, false);
  box(0.8, 0.6, 0.8, STONE_L, -4.2, 1.35, 9.5, F); pyramid(0.6, 1.6, STONE, -4.2, 2.45, 9.5, F); cyl(0.02, 0.1, 0.4, 6, GOLD, -4.2, 3.4, 9.5, F);
  cyl(0.2, 0.26, 3.4, 8, STONE, -2.1, 1.7, 7.2, F); box(0.5, 0.25, 0.5, STONE_L, -2.1, 3.45, 7.2, F); box(0.3, 0.45, 0.4, GOLD, -2.1, 3.8, 7.2, F);
  cyl(0.16, 0.2, 2.0, 8, STONE, 2.1, 1.0, 7.2, F);
  box(1.4, 0.5, 24, BRICK_D, -7.2, 0.25, 11.5, F);
  // Right of the path as you enter: Yamaleshwar, Narayan beside it, the gilded bull, Bhawani Shankar, Ram Chandra
  pagodaShrine(F, 6.2, 11, 0.9, R);
  whiteShikhara(F, 6.4, 7.0, 0.85, GOLD, R);
  box(1.5, 0.5, 0.9, STONE, 2.9, 0.25, 14, F); box(1.1, 0.45, 0.5, '#d99926', 2.9, 0.75, 14, F); box(0.35, 0.4, 0.35, '#d99926', 2.9, 0.95, 13.4, F);
  stoneShikhara(F, 6.4, 15.5, 0.8, R);
  whiteShikhara(F, 6.6, 19.5, 0.7, '#fffaf2', R);
  // Left side further down: Mana Binayek, and Mul Ganesh just inside the gate
  { const g = group(-4.4, 0, 17.5, F); g.scale.setScalar(0.8); g.rotation.y = Lf; box(2.4, 0.4, 2.4, STONE, 0, 0.2, 0, g); box(1.8, 1.8, 1.8, '#e6e1dc', 0, 1.3, 0, g); box(0.7, 1.1, 0.05, '#26221f', 0, 1.0, 0.92, g, false); pyramid(1.5, 1.2, '#787067', 0, 2.8, 0, g); }
  { const g = group(-4.6, 0, 22.4, F); g.scale.setScalar(0.65); g.rotation.y = Lf; box(4, 3.4, 3.4, BRICK, 0, 1.7, 0, g); box(1.4, 2.2, 0.06, '#26221f', 0, 1.1, 1.73, g, false); roof(g, 3.4, 2.6, 2.3, 0.4, 1.0, TILE); box(1.4, 1.0, 1.4, carvedMat, 0, 4.9, 0, g); roof(g, 5.4, 0.92, 0.92, 0, 0.8, TILE); gajur(g, 6.1, 0.5); }
  // Indrayani's shrine-house in the east range's corner; Nasa Deu's open pavilion behind the temple on the valley side
  { const g = group(10, 0, 22.4, F); g.rotation.y = R; box(5, 5.6, 4, BRICK, 0, 2.8, 0, g); box(1.2, 2, 0.06, '#d99926', 0, 1.6, 2.03, g, false); box(4, 1.0, 0.06, carvedMat, 0, 4.0, 2.03, g, false); box(5.6, 0.3, 4.6, '#787067', 0, 5.75, 0, g); }
  { const g = group(10.5, 0, -5.4, F); box(4.4, 0.4, 3.6, STONE, 0, 0.2, 0, g); for (const [x, z] of [[-1.9, -1.5], [1.9, -1.5], [-1.9, 1.5], [1.9, 1.5]]) box(0.22, 2.6, 0.22, '#26221f', x, 1.7, z, g);
    box(1.6, 1.6, 1.0, '#e6e1dc', 0, 1.2, 0, g); box(0.9, 0.4, 0.05, '#c45134', 0, 1.9, 0.52, g, false); roof(g, 3.0, 2.8, 2.4, 0.3, 1.0, TILE); }
  // Brass lamp racks at the temple's ends
  for (const s of [-1, 1]) { box(0.1, 1.1, 2.6, '#5c554e', s * 6.4, 0.55, 0.5, F); for (let k = 0; k < 3; k++) { box(0.3, 0.06, 2.6, '#d99926', s * 6.4, 0.4 + k * 0.32, 0.5, F, false); diyaRow(F, s * 6.4, 0.43 + k * 0.32, -0.7, s * 6.4, 1.7, 0.3); } }
  // Pigeons on the path
  for (let i = 0; i < 14; i++) { const x = rnd(-3, 3), z = rnd(front, GATE - 2); box(0.3, 0.2, 0.18, i % 3 ? '#968e85' : STONE_L, x, 0.2, z, F, false); }
})();
