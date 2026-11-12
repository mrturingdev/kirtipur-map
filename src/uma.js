/* ------------------------------------------------------------------ */
/* Uma Maheshwar and its hilltop plaza, in true metres, from the OSM   */
/* outline and the reference photos (kirtipur-hill/ref): a square      */
/* three-roofed temple on a tall three-step brick plinth, stone        */
/* elephants at its stair, a brick plaza with a railed parapet, and    */
/* the arched brick gate in a whitewashed wall over the steps down.    */
/* Local frame: origin at the plinth centre, +x toward the steps.      */
/* ------------------------------------------------------------------ */
const UMA = (() => { const fp = frameOf(323644534); return { fp, F: placeModel(group(0, 0, 0, S), fp, ICON) }; })();
const MAROON = '#73281b', ROOF_B = '#6e422c';
(() => {
  const F = UMA.F;
  // Plaza edge: a brick parapet with an iron railing on three sides; the fourth (+x) is the gate side
  const X0 = -12.2, X1 = 11.6, Z0 = -15.6, Z1 = 9.9;
  const para = (x0, x1, z0, z1) => { box(x1 - x0, 0.8, z1 - z0, '#b5603f', (x0 + x1) / 2, 0.4, (z0 + z1) / 2, F); box(x1 - x0, 0.08, z1 - z0, '#5c554e', (x0 + x1) / 2, 1.5, (z0 + z1) / 2, F, false); };
  para(X0, X0 + 0.4, Z0, Z1); para(X0, X1, Z0, Z0 + 0.4); para(X0, X1, Z1 - 0.4, Z1);
  for (let x = X0; x <= X1; x += 2) for (const z of [Z0 + 0.2, Z1 - 0.2]) box(0.3, 1.5, 0.3, '#9e3b26', x, 0.75, z, F);
  for (let z = Z0; z <= Z1; z += 2) box(0.3, 1.5, 0.3, '#9e3b26', X0 + 0.2, 0.75, z, F);
  // The gate side: a whitewashed retaining wall down to the lane, the steps, and the arched brick gate
  const drop = clamp(UMA.F.position.y - groundY(...(() => { const c = Math.cos(UMA.fp.ang), s = Math.sin(UMA.fp.ang); const x = UMA.fp.cx + 18 * ICON * c, z = UMA.fp.cz + 18 * ICON * s; return [wX(x), wZ(z)]; })()), 0, 30) / U;
  box(0.6, drop + 0.8, Z1 - Z0, '#e6e1dc', X1 + 0.3, 0.4 - drop / 2, (Z0 + Z1) / 2, F);
  const n = Math.max(4, Math.round(drop / 0.3));
  for (let i = 0; i < n; i++) box(6.2 / n + 0.02, (drop / n) * (n - i), 2.4, i % 2 ? '#cfc8c0' : '#b5ada4', X1 + 0.6 + (i + 0.5) * 6.2 / n, -drop + (drop / n) * (n - i) / 2, 0, F);
  for (const s of [-1, 1]) box(0.8, 3.4, 0.8, '#b5603f', X1 + 0.3, 1.7, s * 1.7, F);
  box(0.9, 0.6, 4.2, '#b5603f', X1 + 0.3, 3.5, 0, F);
  box(0.95, 0.35, 2.6, '#9e3b26', X1 + 0.3, 3.05, 0, F, false); // the arch
  // Solar street lamps on the plaza, as in the photos
  for (const [x, z] of [[8, -12], [-9, 7], [8, 7]]) { box(0.12, 4, 0.12, '#787067', x, 2, z, F); box(0.9, 0.08, 0.5, '#388296', x, 4.05, z, F); }
})();

/* ------------------------------------------------------------------ */
/* The temple                                                          */
/* ------------------------------------------------------------------ */
(() => {
  const g = group(0, 0, 0, UMA.F);
  g.rotation.y = Math.PI / 2; // build with the front on +z, then turn it to face the steps (+x)
  footing(g, 12.5, 12.5, '#b5603f');
  let y = 0;
  for (const w of [12.5, 10.4, 8.4]) { // three tall brick steps with stone edges
    box(w, 0.85, w, '#b5603f', 0, y + 0.42, 0, g);
    box(w + 0.06, 0.1, w + 0.06, '#cfc8c0', 0, y + 0.85, 0, g, false);
    ledRoof(g, y + 0.9, w / 2 + 0.03, w / 2 + 0.03);
    for (const s of [-1, 1]) diyaRow(g, s * 1.1, y + 0.9, w / 2 - 0.15, s * (w / 2 - 0.3), w / 2 - 0.15); // diyas along the step's front edge, either side of the stair
    y += 0.85;
  }
  for (let k = 0; k < 8; k++) box(1.8, 0.32 * (k + 1), 0.4, '#cfc8c0', 0, 0.16 * (k + 1), 6.25 + 1.2 - k * 0.32 + 0.2, g); // the front stair
  for (const s of [-1, 1]) { // stone elephants at the foot of the stair
    const e = group(s * 1.7, 0, 7.3, g);
    box(0.9, 0.8, 1.5, '#968e85', 0, 0.95, 0, e); box(0.7, 0.7, 0.5, '#968e85', 0, 1.4, 0.8, e); box(0.18, 0.8, 0.18, '#968e85', 0, 0.75, 1.1, e);
    for (const [lx, lz] of [[-0.3, -0.5], [0.3, -0.5], [-0.3, 0.5], [0.3, 0.5]]) box(0.26, 0.6, 0.26, '#968e85', lx, 0.3, lz, e);
  }
  // Ground storey: a maroon cella inside an open colonnade of carved posts
  box(4.2, 3, 4.2, '#9e3b26', 0, y + 1.5, 0, g);
  box(1.1, 2, 0.06, '#d99926', 0, y + 1.0, 2.12, g, false);
  diyaRow(g, -0.5, y, 2.45, 0.5, 2.45, 0.25); // and on the cella's threshold
  torana(g, 0, y + 2.0, 2.16, 0.75);
  for (let i = 0; i < 5; i++) for (const t of [-1, 1]) { const q = -2.6 + i * 1.3; box(0.2, 3, 0.2, MAROON, q, y + 1.5, t * 2.75, g); box(0.2, 3, 0.2, MAROON, t * 2.75, y + 1.5, q, g); }
  box(6, 0.25, 6, MAROON, 0, y + 3.1, 0, g);
  struts(g, y + 3.5, 2.75, 2.75, 5, MAROON);
  roof(g, y + 3.2, 4.8, 4.8, 0.45, 1.4, ROOF_B); ledRoof(g, y + 3.2, 4.8, 4.8, 0.45, 1.4); bellFringe(g, y + 3.2, 4.8, 4.8);
  y += 4.6;
  box(3.4, 2.0, 3.4, carvedMat, 0, y + 1.0, 0, g);
  for (let a = 0; a < 4; a++) { const p = group(0, 0, 0, g); p.rotation.y = a * Math.PI / 2; box(1.3, 0.95, 0.1, latticeMat, 0, y + 1.0, 1.72, p, false); } // a carved lattice window on each face
  struts(g, y + 1.6, 1.7, 1.7, 3, MAROON);
  roof(g, y + 2.0, 3.4, 3.4, 0.42, 1.1, ROOF_B); ledRoof(g, y + 2.0, 3.4, 3.4, 0.42, 1.1);
  y += 3.1;
  box(2.3, 1.6, 2.3, carvedMat, 0, y + 0.8, 0, g);
  roof(g, y + 1.6, 3.4 / Math.SQRT2, 3.4 / Math.SQRT2, 0, 1.6, ROOF_B); ledRoof(g, y + 1.6, 3.4 / Math.SQRT2, 3.4 / Math.SQRT2, 0, 1.6);
  gajur(g, y + 3.2, 1.1);
  landmarks.uma = { fp: UMA.fp, top: (y + 4.5) * U * ICON };
})();
