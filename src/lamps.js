/* ------------------------------------------------------------------ */
/* Night lights: street lamps along the paved lanes, each throwing a   */
/* soft pool on the ground; diyas (clay oil lamps) on the temples'    */
/* own lamp places, each site warmed by one flickering glow; and the   */
/* LED strings on Uma Maheshwar. nightLights(L) fades it all with dusk.*/
/* ------------------------------------------------------------------ */
const LAMP_GAP = 24, LAMP_H = 3.2, POOL_R = 5; // metres: spacing along a lane, bulb height, pool radius

// Matrix for a thing standing at world (x, z): on the ground, tilted to the slope when `tilt`
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _n = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0), _p = new THREE.Vector3(), _s = new THREE.Vector3();
function standAt(x, z, y, sx, sy, sz, tilt = false) {
  if (tilt) _n.set(groundY(x - U, z) - groundY(x + U, z), 2 * U, groundY(x, z - U) - groundY(x, z + U)).normalize();
  _q.setFromUnitVectors(_up, tilt ? _n : _up);
  return _m.compose(_p.set(x, groundY(x, z) + y, z), _q, _s.set(sx, sy, sz));
}
function instanced(geo, mat, spots, place) {
  const m = new THREE.InstancedMesh(geo, mat, spots.length);
  spots.forEach((s, i) => m.setMatrixAt(i, place(s)));
  m.visible = false; scene.add(m);
  return m;
}

// Street lamps: one every LAMP_GAP metres on each paved lane (runs are resampled every metre),
// on alternate sides, never closer than 10 m to another lamp or inside a landmark site
const lampSpots = [];
for (const [kind, list] of Object.entries(_ribbons)) {
  if (kind === 'earth') continue; // field tracks stay dark
  for (const { run, half } of list) {
    for (let i = LAMP_GAP >> 1; i < run.length; i += LAMP_GAP) {
      const [cx, cz] = run[i], a = run[i - 1], b = run[Math.min(run.length - 1, i + 1)], tl = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      if (inAnySite(cx, cz) || lampSpots.some((l) => Math.hypot(l.cx - cx, l.cz - cz) < 10)) continue;
      const o = (half + 0.3) * (lampSpots.length % 2 ? 1 : -1);
      lampSpots.push({ cx, cz, x: wX(cx - (b[1] - a[1]) / tl * o), z: wZ(cz + (b[0] - a[0]) / tl * o) });
    }
  }
}
const poolTex = canvasTex(64, 64, (g) => {
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, '#fff'); r.addColorStop(0.45, 'rgba(255,255,255,0.45)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 64, 64);
});
poolTex.magFilter = poolTex.minFilter = THREE.LinearFilter; // a smooth falloff, not pixel steps
const poolMat = new THREE.MeshBasicMaterial({ map: poolTex, color: '#ffb35c', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
const bulbMat = new THREE.MeshBasicMaterial({ color: '#5c554e' });
const BULB_OFF = new THREE.Color('#5c554e'), BULB_ON = new THREE.Color('#fff1c9');
const lampPosts = instanced(UNIT, lam('#3d3833'), lampSpots, (l) => standAt(l.x, l.z, LAMP_H * U / 2, 0.12 * U, LAMP_H * U, 0.12 * U));
const lampBulbs = instanced(UNIT, bulbMat, lampSpots, (l) => standAt(l.x, l.z, LAMP_H * U, 0.35 * U, 0.22 * U, 0.35 * U));
const lampPools = instanced(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), poolMat, lampSpots,
  (l) => standAt(wX(l.cx), wZ(l.cz), 0.06, POOL_R * 2 * U, 1, POOL_R * 2 * U, true));
lampPools.renderOrder = 2;
lampPosts.visible = lampBulbs.visible = true; // the lamps themselves stand in daylight too

// One warm light over each landmark site, flickering like a crowd of small flames
const siteGlows = [];
for (const S_ of Object.values(SITES)) {
  const P = S_.poly.flatMap((v, i, f) => (i % 2 ? [] : [[v, f[i + 1]]])); // site polys are flat [x0, z0, x1, z1, ...]
  // at least 14 m, so the small sites (Lohan Dega, Lyaku) still read as lit from the whole-island view
  const r = Math.max(14, ...P.map((p) => Math.hypot(p[0] - S_.at[0], p[1] - S_.at[1]))), x = wX(S_.at[0]), z = wZ(S_.at[1]);
  const light = new THREE.PointLight('#ffa64d', 0, r * 1.8 * U, 1.6);
  light.position.set(x, groundY(x, z) + r * 0.45 * U, z); // above the court, low enough not to blow out the top roof
  scene.add(light);
  siteGlows.push({ light, power: r * r * U * U * 0.8, phase: rnd(0, TAU) });
}
// Diyas: a clay saucer and a flame on each spot the temple models set out (DIYAS, city.js),
// sized like the models (built larger than life by ICON)
const DS = U * ICON, _id = new THREE.Quaternion();
const diyaAt = (v, y, sx, sy) => _m.compose(_p.set(v.x, v.y + y * DS, v.z), _id, _s.set(sx * DS, sy * DS, sx * DS));
const diyaBases = instanced(UNIT, lam('#8a4a2b'), DIYAS, (v) => diyaAt(v, 0.06, 0.3, 0.12));
const diyaFlames = instanced(UNIT, new THREE.MeshBasicMaterial({ color: '#ffc75e' }), DIYAS, (v) => diyaAt(v, 0.27, 0.11, 0.3));
diyaBases.visible = true; // the clay saucers sit there by day too
const LED_OFF = new THREE.Color('#5c554e'), LED_ON = new THREE.Color('#fff4d6');

// L is the engine's lamp level: 0 by day, 0.8 at dusk, 1.25 at night
function nightLights(L) {
  const on = L > 0.02, k = clamp(L, 0, 1), t = performance.now() / 1000;
  lampPools.visible = diyaFlames.visible = on;
  poolMat.opacity = k * 0.9;
  bulbMat.color.lerpColors(BULB_OFF, BULB_ON, k);
  LED_MAT.color.lerpColors(LED_OFF, LED_ON, k);
  for (const G of siteGlows) G.light.intensity = on ? G.power * k * (1 + 0.07 * Math.sin(t * 7 + G.phase) * Math.sin(t * 2.3 + G.phase * 2)) : 0;
}
