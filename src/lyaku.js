/* ------------------------------------------------------------------ */
/* Lyaku, the old palace quarter, in true metres (Mapillary photos of  */
/* the lane; OSM for the museum's building, the steps and the strip    */
/* of open ground): the museum in a Newar palace house, the dry-stone  */
/* rubble wall along the stepped lane, the carved gateway over it.     */
/* ------------------------------------------------------------------ */
const LYAKU = (() => {
  const fp = footprint(MAP.buildings.find((b) => b.id === 342148871).p);
  const F = placeModel(group(0, 0, 0, S), fp);
  // Turn the frame so +z faces the forecourt (south of the house), whichever edge OSM listed first
  const F_ = focusOf('lyaku'), dx = F_.at[0] - fp.cx, dz = F_.at[1] - fp.cz, c = Math.cos(fp.ang), s = Math.sin(fp.ang);
  const lz = -dx * s + dz * c;
  if (lz < 0) F.rotation.y += Math.PI;
  return { fp, F };
})();
const rubbleMat = new THREE.MeshLambertMaterial({ map: (() => { const t = canvasTex(16, 12, (g) => {
  g.fillStyle = '#5c554e'; g.fillRect(0, 0, 16, 12);
  for (const [x, y, w, h, c] of [[0, 0, 5, 3, '#787067'], [6, 0, 4, 4, '#968e85'], [11, 1, 5, 3, '#787067'], [0, 4, 3, 4, '#968e85'], [4, 5, 6, 3, '#787067'], [11, 5, 4, 4, '#968e85'], [1, 9, 6, 3, '#787067'], [8, 9, 4, 3, '#968e85'], [13, 10, 3, 2, '#787067']]) { g.fillStyle = c; g.fillRect(x, y, w, h); }
}); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 1); return t; })() });
(() => {
  const { F, fp } = LYAKU, L = fp.long, W = fp.short, H = 3 * 3.0, BR = '#b5603f';
  footing(F, L, W, BR);
  box(L, H, W, BR, 0, H / 2, 0, F);
  for (let k = 1; k < 3; k++) box(L + 0.06, 0.14, W + 0.06, '#e8d2bc', 0, k * 3.0, 0, F, false); // floor bands
  // The front: a carved timber arcade, a plain carved wood door (this is the old palace, not a temple - no gilding), latticed windows, a carved balcony
  const fz = W / 2;
  for (let i = 0; i <= 6; i++) box(0.24, 2.6, 0.24, WOOD, -L / 2 + 0.6 + i * (L - 1.2) / 6, 1.3, fz + 0.3, F);
  box(L - 0.8, 0.3, 0.6, WOOD, 0, 2.7, fz + 0.3, F);
  box(L - 1.2, 2.4, 0.05, '#26221f', 0, 1.2, fz + 0.03, F, false);
  box(1.6, 2.2, 0.08, WOOD, 0, 1.1, fz + 0.05, F, false);
  diyaRow(F, -0.7, 0.02, fz + 0.45, 0.7, fz + 0.45, 0.25); // diyas on the palace threshold
  box(2.2, 0.5, 0.1, carvedMat, 0, 2.3, fz + 0.52, F); // carved wood lintel above the door
  box(3, 0.5, 0.06, '#26221f', 0, 3.4, fz + 0.05, F, false); // the museum's signboard
  for (let i = 0; i < 4; i++) box(0.4, 0.2, 0.07, '#f5b841', -1 + i * 0.66, 3.4, fz + 0.09, F, false);
  for (let i = 0; i < 5; i++) box(1.1, 1.5, 0.08, carvedMat, -L / 2 + 1.4 + i * (L - 2.8) / 4, 4.6, fz + 0.05, F, false); // tiki windows
  box(L * 0.7, 1.6, 0.9, carvedMat, 0, 7.4, fz + 0.45, F); // the projecting sanjhya
  box(L * 0.72, 0.2, 1.1, WOOD, 0, 6.5, fz + 0.5, F);
  for (const s of [-1, 1]) for (let i = 0; i < 4; i++) box(1.0, 1.4, 0.08, carvedMat, -L / 2 + 1.5 + i * (L - 3) / 3, 4.6 + (i % 2) * 2.8, s * fz + s * 0.05, F, false); // windows round the back
  // Tiled roof with struts and three gilded finials on the ridge
  const rise = W * 0.22;
  for (const s of [-1, 1]) { const r = box(L + 1.4, 0.22, W / 2 + 1.4, '#5c554e', 0, H + rise / 2 + 0.1, s * (W / 4 + 0.3), F); r.rotation.x = s * 0.45; }
  box(L + 1.5, 0.3, 0.35, '#403a35', 0, H + rise + 0.2, 0, F);
  for (const s of [-1, 1]) for (const t of [-0.4, -0.2, 0, 0.2, 0.4]) { const st = box(0.14, 1.1, 0.14, WOOD, t * L, H - 0.3, s * (fz + 0.45), F); st.rotation.x = s * 0.5; }
  // The square lookout tower on the roof, set toward one end - the building's clearest identifying feature in photos
  const twx = -L * 0.3, twy = H + rise + 0.35, tws = Math.min(1.7, W * 0.55);
  box(tws, 1.5, tws, BR, twx, twy + 0.75, 0, F);
  box(tws - 0.3, 0.9, 0.04, carvedMat, twx, twy + 0.85, tws / 2 - 0.01, F, false);
  box(tws - 0.3, 0.9, 0.04, carvedMat, twx, twy + 0.85, -tws / 2 + 0.01, F, false);
  pyramid(tws * 0.8, 0.8, '#5c554e', twx, twy + 1.5 + 0.4, 0, F);
  // The forecourt: a stone water spout and a little shrine, as round the quarter
  box(1.6, 0.7, 1.0, '#968e85', -L / 2 + 1, 0.35, fz + 4.5, F); box(0.25, 0.2, 0.5, '#d99926', -L / 2 + 1, 0.8, fz + 4.1, F);
  box(1.4, 1.4, 1.4, '#b5ada4', L / 2 - 1.2, 0.7, fz + 4.5, F); pyramid(0.95, 1.4, '#968e85', L / 2 - 1.2, 2.1, fz + 4.5, F);
})();
// The stepped lane east of the museum (OSM steps): a dry-stone rubble wall along it, the carved gateway over it
(() => {
  const st = MAP.roads.find((r) => r.t === 'steps' && Math.hypot(r.p[0] + 124, r.p[1] - 8) < 3) || { p: [-124, 8, -118, -3] };
  const [ax, az, bx, bz] = [st.p[0], st.p[1], st.p[st.p.length - 2], st.p[st.p.length - 1]], len = Math.hypot(bx - ax, bz - az);
  const ux = (bx - ax) / len, uz = (bz - az) / len, nx = -uz, nz = ux, ang = Math.atan2(uz, ux);
  // The wall: on the far side of the steps from the museum, the height of a storey
  const side = (nx * (LYAKU.fp.cx - ax) + nz * (LYAKU.fp.cz - az)) > 0 ? -1 : 1;
  const wx_ = (ax + bx) / 2 + nx * side * 2.2, wz_ = (az + bz) / 2 + nz * side * 2.2;
  const w = atMapPoint(wx_, wz_, ang);
  box(len + 2, 6, 1.2, rubbleMat, 0, 0, 0, w); // reaches down the slope too
  box(len + 2.2, 0.2, 1.3, '#63964d', 0, 3.05, 0, w, false); // grass on its top
  for (let x = -len / 2; x <= len / 2; x += 1.2) box(0.05, 1.1, 0.05, '#5c554e', x, 3.6, 0.4, w); // iron rail along it
  box(len + 2, 0.05, 0.05, '#5c554e', 0, 4.15, 0.4, w, false);
  // The gateway, a third of the way down the steps: brick piers, a carved lintel, the dark sign board
  const gx = ax + ux * len * 0.35, gz = az + uz * len * 0.35, g = atMapPoint(gx, gz, ang + Math.PI / 2);
  for (const s of [-1, 1]) box(0.7, 3.6, 0.7, '#9e3b26', s * 1.9, 1.8, 0, g);
  box(4.6, 0.6, 0.8, carvedMat, 0, 3.8, 0, g);
  box(3.4, 0.6, 0.06, '#26221f', 0, 4.5, 0.42, g, false);
  for (let i = 0; i < 5; i++) box(0.4, 0.18, 0.07, i % 2 ? '#fffaf2' : '#f5b841', -1.2 + i * 0.6, 4.5, 0.46, g, false);
  pyramid(2.8, 0.7, '#5c554e', 0, 4.45, 0, g, 1, 0.35);
})();
