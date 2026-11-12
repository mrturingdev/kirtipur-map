/* ------------------------------------------------------------------ */
/* Dey Pukhu, in true metres, from the OSM outline (a 25.3 x 12.6 m    */
/* tank in its open square, the Narayan shrine at the west end) and    */
/* the photos (kirtipur-hill/ref/street): a sunken tank with brick     */
/* walls, a grey band at the water, a niched brick parapet, stairs     */
/* down at the far corners, clear dark water; the white Narayan       */
/* shrine with a small pagoda and a stone pillar beside it.           */
/* Local frame: origin at the tank centre, +x along its long side.     */
/* ------------------------------------------------------------------ */
const PUKHU = (() => {
  const w = MAP.water.find((f) => Math.abs(f.filter((_, k) => k % 2 === 0).reduce((a, b) => a + b, 0) / (f.length / 2) + 21.9) < 3);
  const fp = footprint(w), F = placeModel(group(0, 0, 0, S), fp);
  const c = Math.cos(fp.ang), s = Math.sin(fp.ang);
  // Stand on the square's paving beside the tank, not on the floor of the cut under its centre
  const ex = fp.cx - (fp.short / 2 + 4) * s, ez = fp.cz + (fp.short / 2 + 4) * c;
  F.position.y = groundY(wX(ex), wZ(ez));
  return { fp, F, local: (x, z) => [(x - fp.cx) * c + (z - fp.cz) * s, -(x - fp.cx) * s + (z - fp.cz) * c], L: fp.long / 2, D: fp.short / 2 };
})();
(() => {
  const { F, L, D } = PUKHU, DEEP = 3, WATER = -1.7;
  // Retaining walls: brick, a grey plastered band at the water line, thick enough to cover the cut in the ground
  const wall = (cx, cz, w, d) => {
    box(w, DEEP, d, '#b5603f', cx, -DEEP / 2, cz, F);
    for (let y = -0.4; y > -DEEP; y -= 0.5) box(w + 0.03, 0.05, d + 0.03, '#9e3b26', cx, y, cz, F, false);
  };
  const T = 1.6; // wall thickness, mostly outside the water's edge
  wall(0, -D - T / 2 + 0.4, 2 * L + 2 * T, T); wall(0, D + T / 2 - 0.4, 2 * L + 2 * T, T);
  wall(-L - T / 2 + 0.4, 0, T, 2 * D); wall(L + T / 2 - 0.4, 0, T, 2 * D);
  for (const s of [-1, 1]) { // the grey band just above the water, on the inner faces
    box(2 * L - 0.8, 0.6, 0.06, '#968e85', 0, WATER + 0.3, s * (D - 0.43), F, false);
    box(0.06, 0.6, 2 * D - 0.8, '#968e85', s * (L - 0.43), WATER + 0.3, 0, F, false);
  }
  // Water: clear, dark open water with a lighter sheen band - no fountain, the tank is a still rain-fed reservoir
  box(2 * L - 0.8, 0.06, 2 * D - 0.8, '#2f4a52', 0, WATER, 0, F, false);
  for (let i = 0; i < 6; i++) box(rnd(1.5, 4), 0.07, 0.12, '#4f7480', rnd(-L + 2, L - 2), WATER + 0.01, rnd(-D + 1, D - 1), F, false);
  // Stairs down to a ledge at the far (east) end, one at each corner, and the brick pier between them
  for (const s of [-1, 1]) {
    const n = 7;
    for (let k = 0; k < n; k++) box(1.4, 0.24, (DEEP - 1.2) / n + 0.4, '#cfc8c0', L - 0.4 - 0.7 - k * 0.5, -0.12 - k * (-WATER - 0.2) / n, s * (D - 1.4), F, false);
  }
  box(0.9, 0.12, 2 * D - 0.8, '#cfc8c0', L - 0.9, WATER + 0.18, 0, F, false); // the ledge
  diyaRow(F, L - 0.9, WATER + 0.24, -D + 0.6, L - 0.9, D - 0.6, 0.4); // diyas along it, at the water
  box(1.2, 2.6, 1.4, '#9e3b26', L - 1, WATER + 1.1, 0, F);
  // The parapet: brick, a lighter coping, small square niches; gaps at the stair heads
  const para = (cx, cz, w, d, alongX) => {
    box(w, 0.9, d, '#b5603f', cx, 0.45, cz, F); box(w + 0.08, 0.1, d + 0.08, '#e3b08e', cx, 0.92, cz, F, false);
    const n = Math.floor((alongX ? w : d) / 1.2);
    for (let i = 0; i < n; i++) { const t = -(alongX ? w : d) / 2 + 0.6 + i * 1.2; box(alongX ? 0.22 : w + 0.02, 0.22, alongX ? d + 0.02 : 0.22, '#5c554e', alongX ? cx + t : cx, 0.6, alongX ? cz : cz + t, F, false); }
  };
  for (const s of [-1, 1]) para(-1.2, s * (D + 0.2), 2 * L - 2.6, 0.4, true);
  para(-L - 0.2, 0, 0.4, 2 * D + 0.8, false);
  para(L + 0.2, 0, 0.4, 2 * D - 3.8, false);
  // Benches and a planter tree on the east side, as in the photos
  for (const z of [-3, 3]) { box(1.6, 0.45, 0.5, '#6e422c', L + 2.2, 0.45, z, F); box(1.6, 0.6, 0.08, '#6e422c', L + 2.45, 0.85, z, F); }
  box(0.8, 0.8, 0.8, '#968e85', L + 2.2, 0.4, 0, F); box(1.4, 1.6, 1.4, '#63964d', L + 2.2, 1.9, 0, F);
  // Solar lamps along the long sides
  for (const s of [-1, 1]) for (const x of [-8, 0, 8]) { box(0.1, 4, 0.1, '#787067', x, 2, s * (D + 1.4), F); box(0.8, 0.06, 0.4, '#388296', x, 4.03, s * (D + 1.4), F); }
})();

/* ------------------------------------------------------------------ */
/* The Narayan shrine at the west end, a small pagoda and a pillar     */
/* ------------------------------------------------------------------ */
(() => {
  const F = PUKHU.F, nb = MAP.buildings.find((b) => b.id === 317754819), nf = footprint(nb.p), [nx, nz] = PUKHU.local(nf.cx, nf.cz);
  const g = group(nx, 0, nz, F); g.rotation.y = Math.PI / 2; // front (+z) turned to face the tank (+x)
  box(7.5, 1.2, 7.5, '#cfc8c0', 0, 0.6, 0, g); box(7.6, 0.12, 7.6, '#e6e1dc', 0, 1.2, 0, g, false);
  for (let k = 0; k < 4; k++) box(2.4, 0.3 * (k + 1), 0.35, '#cfc8c0', 0, 0.15 * (k + 1), 3.75 + 1.2 - k * 0.35, g);
  box(5, 4.4, 5, '#fffaf2', 0, 3.4, 0, g);
  box(5.4, 0.35, 5.4, '#e6e1dc', 0, 5.75, 0, g); // cornice
  box(1.4, 2.4, 0.08, '#9e3b26', 0, 2.4, 2.52, g, false); // the red arched door
  const arch = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.08, 12, 1, false, 0, Math.PI).rotateX(Math.PI / 2).rotateZ(Math.PI / 2), lam('#9e3b26'));
  arch.position.set(0, 3.6, 2.53); g.add(arch);
  for (const s of [-1, 1]) box(0.5, 0.9, 0.06, '#e6e1dc', s * 1.6, 3.6, 2.53, g, false);
  for (const [x, z] of [[-2.3, -2.3], [2.3, -2.3], [-2.3, 2.3], [2.3, 2.3]]) { box(0.6, 1, 0.6, '#fffaf2', x, 6.4, z, g); const d = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 4, 0, TAU, 0, Math.PI / 2), lam('#fffaf2')); d.position.set(x, 6.9, z); g.add(d); }
  box(3.2, 1.2, 3.2, '#fffaf2', 0, 6.5, 0, g);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1.6, 12, 6, 0, TAU, 0, Math.PI / 2), lam('#968e85')); // weathered, mossy dome
  dome.position.y = 7.1; dome.castShadow = true; g.add(dome);
  cyl(0.3, 0.5, 0.4, 8, '#fffaf2', 0, 8.85, 0, g); cyl(0.03, 0.18, 1.0, 8, '#f5b841', 0, 9.5, 0, g);
  // A small two-roofed pagoda beside it and a stone pillar with a figure on the other side
  const p = group(nx + 1, 0, nz - 6.2, F);
  box(3, 0.7, 3, '#cfc8c0', 0, 0.35, 0, p); box(1.6, 2, 1.6, '#9e3b26', 0, 1.7, 0, p);
  roof(p, 2.7, 1.8, 1.8, 0.35, 0.8, '#9e3b26'); box(0.9, 0.8, 0.9, carvedMat, 0, 3.9, 0, p); roof(p, 4.3, 0.78, 0.78, 0, 0.8, '#9e3b26'); gajur(p, 5.0, 0.5);
  cyl(0.18, 0.24, 3.4, 8, '#968e85', nx + 2.5, 1.7, nz + 5.2, F); box(0.45, 0.6, 0.4, '#5c554e', nx + 2.5, 3.7, nz + 5.2, F);
  landmarks.pukhu = { fp: PUKHU.fp };
})();
