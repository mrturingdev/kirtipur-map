/* ------------------------------------------------------------------ */
/* Lohan Dega, the stone temple, in true metres (Mapillary photos;     */
/* OSM for its spot, the two golden Buddhas and the water pump): a     */
/* four-step stone plinth, an arcaded shrine storey, corner pavilions  */
/* and a tall ribbed shikhara with its finial, in a little brick square*/
/* ------------------------------------------------------------------ */
(() => {
  const F_ = focusOf('lohan'), g = atMapPoint(F_.at[0], F_.at[1], 0);
  g.scale.multiplyScalar(1.45); // the iconic sites stand a little larger than true size
  const ST = '#b5ada4', ST_L = '#cfc8c0', ST_D = '#968e85', ST_SOOT = '#4d453d';
  footing(g, 7.6, 7.6, ST_D);
  let y = 0;
  for (const w of [7.6, 6.7, 5.8, 5.0]) { box(w, 0.45, w, ST, 0, y + 0.22, 0, g); box(w + 0.04, 0.06, w + 0.04, ST_L, 0, y + 0.45, 0, g, false); y += 0.45; }
  for (let k = 0; k < 4; k++) box(1.4, 0.45 * (k + 1), 0.4, ST_L, 0, 0.22 * (k + 1), 3.8 + 0.4 * (3 - k) - 0.2, g); // the front stair
  [7.6, 6.7, 5.8, 5.0].forEach((w, i) => { for (const s of [-1, 1]) diyaRow(g, s * 0.85, 0.45 * (i + 1) + 0.03, w / 2 - 0.12, s * (w / 2 - 0.2), w / 2 - 0.12, 0.35); }); // diyas on each step's front edge
  // The shrine storey: a stone cella inside an arcade of small columns, soot-darkened like the photos, a dark doorway at the front
  box(3.4, 2.4, 3.4, ST_SOOT, 0, y + 1.2, 0, g);
  box(0.9, 1.6, 0.06, '#26221f', 0, y + 0.8, 1.73, g, false);
  diyaRow(g, -0.4, y, 2.0, 0.4, 2.0, 0.2); // and on the shrine's threshold
  for (let i = 0; i < 4; i++) for (const s of [-1, 1]) { const t = -1.9 + i * 1.27; box(0.24, 2.2, 0.24, ST_SOOT, t, y + 1.1, s * 2.3, g); box(0.24, 2.2, 0.24, ST_SOOT, s * 2.3, y + 1.1, t, g); }
  box(5.0, 0.35, 5.0, stoneCarveMat, 0, y + 2.35, 0, g); // the carved stone cornice over the arcade
  y += 2.55;
  // The doorway: a gilded frame and torana, a hanging bell, and stone lions guarding the stair
  box(1.3, 0.15, 0.2, '#f5b841', 0, y - 0.9, 1.78, g, false);
  for (const s of [-1, 1]) { box(0.15, 1.7, 0.2, '#f5b841', s * 0.55, y - 1.75, 1.78, g, false); box(0.9, 0.5, 0.9, ST_D, s * 1.2, 0.7, 4.7, g); box(0.5, 0.8, 0.5, ST_L, s * 1.2, 1.35, 4.65, g); box(0.4, 0.4, 0.4, ST_L, s * 1.2, 1.95, 4.8, g); }
  const tor = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.06, 6, 14, Math.PI), lam('#f5b841')); tor.position.set(0, y - 0.9 + 0.08, 1.8); g.add(tor);
  cyl(0.18, 0.28, 0.4, 10, '#d99926', 0, y - 0.85, 2.4, g); cyl(0.03, 0.03, 0.3, 6, '#5c554e', 0, y - 0.5, 2.4, g);
  // Niches with a gilded deity on the other three faces of the cella, and a rail of stone balusters round the plinth
  for (let a = 1; a < 4; a++) { const p = group(0, y - 2.55, 0, g); p.rotation.y = a * Math.PI / 2; box(0.9, 1.4, 0.08, '#26221f', 0, 1.0, 1.73, p, false); box(0.4, 0.6, 0.1, '#f5b841', 0, 0.9, 1.76, p, false); }
  for (let t = -3.4; t <= 3.41; t += 0.68) for (const [x, z] of [[t, -3.55], [t, 3.55], [-3.55, t], [3.55, t]]) if (!(z > 3 && Math.abs(x) < 0.9)) box(0.14, 0.5, 0.14, ST_L, x, 0.7, z, g);
  // (the corner pavilions below are built after the shikhara's helpers)
  // The shikhara: one curved tower of stone courses, near upright at the foot and drawing in toward
  // the top, with a projecting rib down the middle of every face; then the amalaka and finial
  const H = 6.82, prof = [[0, 0]];
  for (let i = 0; i <= 8; i++) { const t = i / 8; prof.push([1 - 0.62 * t ** 1.7, t * H]); }
  prof.push([0, H]);
  const courses = (a, b) => new THREE.MeshLambertMaterial({ map: canvasTex(2, 8, (c) => { c.fillStyle = a; c.fillRect(0, 0, 2, 4); c.fillStyle = b; c.fillRect(0, 4, 2, 4); c.fillStyle = ST_D; c.fillRect(0, 3, 2, 1); c.fillRect(0, 7, 2, 1); }, { repeat: [1, 1] }) });
  const core = courses(ST_L, ST), rib = courses(ST, ST_D);
  const spire = (prf, hw, hd, m, x, y0, z) => { const o = new THREE.Mesh(loftGeo(prf, hw, hd, 1 / 1.24, true), m); o.position.set(x, y0, z); o.castShadow = o.receiveShadow = true; g.add(o); }; // a texture repeat is two 0.62 m courses
  for (const [hw, hd, m] of [[1.5, 1.5, core], [0.54, 1.62, rib], [1.62, 0.54, rib]]) spire(prof, hw, hd, m, 0, y, 0);
  // Four little pavilions at the corners, each with its own small curved spire
  const mini = [[0, 0], ...[0, 1, 2, 3, 4].map((i) => [1 - 0.7 * (i / 4) ** 1.7, i / 4 * 1.3]), [0, 1.3]];
  for (const [x, z] of [[-1.9, -1.9], [1.9, -1.9], [-1.9, 1.9], [1.9, 1.9]]) {
    box(1.0, 1.2, 1.0, ST, x, y + 0.6, z, g); box(1.1, 0.12, 1.1, ST_D, x, y + 1.25, z, g, false);
    spire(mini, 0.5, 0.5, core, x, y + 1.3, z); cyl(0.02, 0.07, 0.3, 6, '#d99926', x, y + 2.75, z, g);
  }
  y += H;
  cyl(0.75, 0.75, 0.35, 12, ST_D, 0, y + 0.17, 0, g); // amalaka
  cyl(0.35, 0.55, 0.45, 10, ST, 0, y + 0.57, 0, g);
  cyl(0.03, 0.16, 0.9, 8, '#f5b841', 0, y + 1.25, 0, g);
})();
// The two golden Buddhas and the water pump, where OSM maps them
(() => {
  const pois = MAP.pois.filter((P) => Math.hypot(P.x - 106.7, P.z - 173.6) < 25);
  const buddhas = pois.find((P) => /Buddha/.test(P.n)), pump = pois.find((P) => /pump/i.test(P.n));
  if (buddhas) {
    const g = atMapPoint(buddhas.x, buddhas.z, 0);
    box(3.2, 0.9, 1.6, '#b5ada4', 0, 0.45, 0, g);
    for (const s of [-1, 1]) { box(0.9, 0.5, 0.7, '#d99926', s * 0.8, 1.15, 0, g); box(0.6, 0.8, 0.45, '#f5b841', s * 0.8, 1.8, 0, g); box(0.35, 0.4, 0.35, '#f5b841', s * 0.8, 2.4, 0, g); }
    for (const [x, z] of [[-1.5, -0.7], [1.5, -0.7], [-1.5, 0.7], [1.5, 0.7]]) box(0.1, 2.6, 0.1, '#5c554e', x, 2.2, z, g);
    roof(g, 3.45, 1.41, 0.71, 0, 0.7, '#9e3b26');
  }
  if (pump) { const g = atMapPoint(pump.x, pump.z, 0); box(0.3, 1.0, 0.3, '#388296', 0, 0.5, 0, g); box(0.7, 0.1, 0.1, '#388296', 0.2, 1.0, 0, g); box(0.8, 0.15, 0.8, '#968e85', 0, 0.07, 0, g); }
})();
