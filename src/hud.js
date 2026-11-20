/* ------------------------------------------------------------------ */
/* Day clock: the real time in Kirtipur now (Nepal time, UTC+5:45),   */
/* lit by today's real sunrise and sunset there. The time slider       */
/* shifts it by an offset that keeps running; Now returns to live.     */
/* ------------------------------------------------------------------ */
const NPT = 5.75;
const day = { n: 1, hour: 12, offset: 0, labels: true }; // offset: hours slid away from live time
const liveHour = () => ((Date.now() / 3.6e6 + NPT) % 24 + 24) % 24;
// Today's sunrise and sunset in Kirtipur in local hours (NOAA's low-precision solar formulas)
function sunToday() {
  const d = new Date(Date.now() + NPT * 3.6e6), g = TAU / 365 * ((d - Date.UTC(d.getUTCFullYear(), 0, 1)) / 864e5);
  const eqt = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const dec = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
  const lat = 27.678 * Math.PI / 180, half = Math.acos(Math.cos(1.58533) / (Math.cos(lat) * Math.cos(dec)) - Math.tan(lat) * Math.tan(dec)) * 12 / Math.PI;
  const noon = (720 - 4 * 85.278 - eqt) / 60 + NPT;
  return { rise: noon - half, set: noon + half };
}
// Golden light and twilight around sunrise and sunset use the engine's dusk look, morning and evening
function phaseOf(h) {
  const S_ = sunToday();
  if (h >= S_.rise + 0.4 && h < S_.set - 0.3) return 'day';
  return (h >= S_.set - 0.3 && h < S_.set + 0.9) || (h >= S_.rise - 0.6 && h < S_.rise + 0.4) ? 'dusk' : 'night';
}
const clockStr = () => `${String(Math.floor(day.hour)).padStart(2, '0')}:${String(Math.floor((day.hour % 1) * 60)).padStart(2, '0')}`;
const setHour = (h) => { day.offset = ((h - liveHour()) % 24 + 24) % 24; day.hour = h; };
let selfTime = false;
envHooks.onTime = (mode) => { if (!selfTime) setHour({ day: 12, dusk: sunToday().set + 0.3, night: 21.5 }[mode]); };
// Map background: a flat paper/dark tone behind the island, not a sky gradient that shifts with
// the day cycle; tied to the UI theme (light/dark), re-applied whenever the theme toggles.
// The post pass (_engine/src/engine/post.js) quantises every pixel, including the sky backdrop,
// to the nearest of its 64-colour PALETTE in OkLab space and dithers between the two nearest
// entries for anything that does not land exactly on one; its uSkyTop/uSkyBot uniforms feed
// straight into that same OkLab lookup with no sRGB-to-linear step of their own, while the
// palette's own Lab table is built from hex strings via a gamma decode - so these two values are
// each that decode of a specific PALETTE hex, landing exactly on it with no dither margin either
// side: '#f9efe3' (paper) and '#171417' (near-black warm dark), both confirmed flat by sampling
// an empty screen corner in a built page (see NOTES-gnhf.md).
// Default to light theme
document.documentElement.dataset.theme = 'light';
syncThemeBtn();

const MAP_BG = { light: [0.94731, 0.86316, 0.76815], dark: [0.00857, 0.007, 0.00857] };
function applyMapBg() {
  const c = MAP_BG[effectiveTheme()];
  for (const t of Object.values(TIMES)) { t.top = c; t.bot = c; }
  selfTime = true; setTime(wx.time, true); selfTime = false;
}
applyMapBg();
$('btnTheme').addEventListener('click', applyMapBg);
function syncTime() {
  const m = phaseOf(day.hour);
  if (m === wx.time) return;
  selfTime = true; setTime(m); selfTime = false;
  for (const b of document.querySelectorAll('#segTime button')) b.setAttribute('aria-pressed', String(b.dataset.v === m));
}
day.hour = liveHour(); selfTime = true; setTime(phaseOf(day.hour), true); selfTime = false; // open on the live sky, no fade
sfx.define(({ ok, tone }) => ({
  templeBell() { if (ok('tb', 300)) { tone('sine', 520, 515, 1.6, 0.06); tone('sine', 1310, 1300, 1.1, 0.025); } },
  horn() { if (ok('hn', 600)) { tone('square', 392, 388, 0.25, 0.03); tone('square', 494, 490, 0.25, 0.025, 0.3); } },
  tick() { if (ok('tk', 80)) tone('triangle', 1800, 1700, 0.08, 0.02); }
}));

/* ------------------------------------------------------------------ */
/* Map labels: HTML text pinned to world points, like ink on a map     */
/* ------------------------------------------------------------------ */
const labelBox = $('mapLabels');
const LABELS = [];
function label(text, x, y, z, cls, onClick) {
  const el = document.createElement(onClick ? 'button' : 'span');
  if (onClick) { el.type = 'button'; el.addEventListener('click', onClick); }
  el.className = 'lbl ' + (cls || '');
  el.textContent = text;
  labelBox.appendChild(el);
  const L = { el, v: new THREE.Vector3(x, y, z) };
  LABELS.push(L);
  return L;
}
const atMap = (x, z, lift = 2) => [wX(x), groundY(wX(x), wZ(z)) + lift, wZ(z)];
// The six focus places: a big label over each
const siteGround = (F_) => (F_.key === 'pukhu' ? PUKHU.F.position.y : groundY(wX(F_.at[0]), wZ(F_.at[1])));
for (const F_ of FOCUS) label(F_.name, wX(F_.at[0]), siteGround(F_) + F_.h * U + 1.5, wZ(F_.at[1]), F_.key === 'pukhu' ? 'major water' : 'major');
for (const A of OUTER_AREAS) {
  const L = label(A.name, ...atMap(A.at[0], A.at[1], 10), 'area-chip', () => focusOuterArea(A));
  L.area = A;
}
for (const a of MAP.areas) if (a.n && a.t !== 'school' && !/Baghbhairab|Uma/.test(a.n)) { const f = footprint(a.p); const L = label(a.n, ...atMap(f.cx, f.cz, 3), 'minor'); L.mx = f.cx; L.mz = f.cz; }
for (const T of TOLES) label(T.n, ...atMap(T.x, T.z, 2.5), 'minor tole'); // tole names along the stretch
const measureLbl = label('', 0, 0, 0, 'measure');
const _pv = new THREE.Vector3();
function placeLabels() {
  labelBox.hidden = !day.labels;
  labelBox.classList.toggle('night', wx.time === 'night'); // light ink on the dark board
  if (!day.labels) return;
  const W = labelBox.clientWidth, H = labelBox.clientHeight;
  if (measure.text) { measureLbl.v.set((measure.a[0] + measure.b[0]) / 2, Math.max(measure.a[1], measure.b[1]) + POLE + 1.2, (measure.a[2] + measure.b[2]) / 2); measureLbl.el.textContent = measure.text; }
  measureLbl.el.hidden = !measure.text;
  // Place in priority order (measure, the six places, then outer area chips & small names): a small name that would cover
  // one already placed is left out; a big one steps up clear of it, at most twice so it stays by its place
  const placed = [], hit = (a) => placed.find((b) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0);
  for (const L of LABEL_ORDER) {
    if (L.el.hidden) continue;
    if (L.area && mapScope !== 'full') { L.el.style.visibility = 'hidden'; continue; }
    if (L.mx !== undefined && (mapScope !== 'full' ? !inCore(L.mx, L.mz) : !isFogRevealed(L.mx, L.mz))) { L.el.style.visibility = 'hidden'; continue; }
    if (L.area) L.el.classList.toggle('revealed', isFogRevealed(L.area.at[0], L.area.at[1]));
    if (!L.w || L.txt !== L.el.textContent) { L.w = L.el.offsetWidth; L.h = L.el.offsetHeight; L.txt = L.el.textContent; }
    _pv.copy(L.v).project(iso.cam);
    const x = (_pv.x + 1) / 2 * W, r = { x0: x - L.w / 2 - 2, x1: x + L.w / 2 + 2, y0: 0, y1: (1 - _pv.y) / 2 * H };
    r.y0 = r.y1 - L.h;
    const minor = L.el.classList.contains('minor');
    for (let k = 0, o; !minor && k < 2 && (o = hit(r)); k++) { r.y1 = o.y0 - 1; r.y0 = r.y1 - L.h; }
    const show = _pv.z < 1 && !hit(r);
    L.el.style.visibility = show ? '' : 'hidden';
    if (!show) continue;
    placed.push(r);
    L.el.style.transform = `translate(${x.toFixed(1)}px, ${r.y1.toFixed(1)}px) translate(-50%, -100%)`;
  }
}
const LABEL_ORDER = [measureLbl, ...LABELS.filter((L) => L !== measureLbl)];

/* ------------------------------------------------------------------ */
/* Map furniture: numbered pins, a north arrow and a true-metre scale  */
/* bar, all placed/sized each frame from the current camera (iso).     */
/* ------------------------------------------------------------------ */
const pinsBox = $('mapPins');
const PINS = FOCUS.map((F_, i) => {
  const el = document.createElement('button');
  el.type = 'button'; el.className = 'pin'; el.textContent = String(i + 1); el.dataset.v = F_.key;
  el.title = F_.name; el.setAttribute('aria-label', 'Open ' + F_.name);
  el.addEventListener('click', () => actOn('site', F_));
  pinsBox.appendChild(el);
  // Same world anchor as this place's own label (see the `label(F_.name, ...)` loop above): a
  // fixed *world*-space gap between the two would vanish at the whole-island zoom (too few
  // screen pixels per world unit there) and the pin ended up sitting on top of its own label -
  // host review finding. placePins() below instead pushes the pin up by a fixed *screen* pixel
  // amount, which clears the label's text at any zoom level.
  return { el, v: new THREE.Vector3(wX(F_.at[0]), siteGround(F_) + F_.h * U + 1.5, wZ(F_.at[1])) };
});
const PIN_LABEL_GAP_PX = 22; // clears a major label's text height (src/style.css's `.lbl.major`) plus a small gutter
function placePins() {
  const W = pinsBox.clientWidth, H = pinsBox.clientHeight;
  for (const P of PINS) {
    _pv.copy(P.v).project(iso.cam);
    const show = _pv.z < 1;
    P.el.style.visibility = show ? '' : 'hidden';
    if (!show) continue;
    const x = (_pv.x + 1) / 2 * W, y = (1 - _pv.y) / 2 * H - PIN_LABEL_GAP_PX;
    P.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%)`;
  }
}
// North arrow: map z increases southward (tools/prep.py's xy()), so world (0,0,-1) is true
// north; iso.right/iso.up are the camera's own screen-space basis vectors (camera.js), already
// updated for the current drag/turn each frame, so no separate bearing math is needed here.
const compassNeedle = $('compassNeedle'), worldNorth = new THREE.Vector3(0, 0, -1);
function updateCompass() {
  const deg = Math.atan2(worldNorth.dot(iso.right), worldNorth.dot(iso.up)) * 180 / Math.PI;
  compassNeedle.style.transform = `rotate(${deg.toFixed(1)}deg)`;
}
// Scale bar: px per world unit comes straight off the orthographic camera's current visible
// height (iso.viewH) over the stage's own pixel height; px per metre follows from 1 m = U units.
const scaleFill = $('scaleFill'), scaleLabel = $('scaleLabel'), NICE = [1, 2, 5, 10];
function updateScaleBar() {
  const pxPerMetre = ($('stage').clientHeight / iso.viewH) * U;
  const raw = 70 / pxPerMetre; // aim for a ~70px bar
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  let metres = mag;
  for (const s of NICE) { const v = mag * s; if (v <= raw) metres = v; }
  scaleFill.style.width = (metres * pxPerMetre).toFixed(1) + 'px';
  scaleLabel.textContent = metres >= 1000 ? `${metres / 1000} km` : `${metres} m`;
}

/* ------------------------------------------------------------------ */
/* Clicks, cast rail, controls                                         */
/* ------------------------------------------------------------------ */
// Real pointer bug: #stage's own pointerdown handler (engine/ui.js) calls setPointerCapture on
// #stage for every pointer, including ones that land on our own buttons/panel/pins, which are
// all DOM descendants of #stage (map UI lives inside the stage so it can overlay the canvas).
// Per the Pointer Events spec, once a pointer is captured by an ancestor, the browser retargets
// that pointer's later events - including the synthetic "click" - to the capturing element
// instead of the original hit-tested one, so a real mouse/touch click on any on-map control
// never reaches its own click listener (synthetic .click() calls are unaffected, which is why
// this stayed hidden: every control was only ever exercised via keys/.click() calls until this
// slice's Playwright pin/place-bar click checks caught it). Fixed from our own side, without
// touching _engine: a capture-phase pointerdown listener on the same #stage element stops the
// event before it reaches ui.js's bubble-phase listener, whenever the real target is one of our
// own controls (any button, or anywhere inside the place panel, which also sits inside #stage).
stageEl.addEventListener('pointerdown', (e) => { if (e.target.closest('button, input, .panel, .map-nav, .area-banner, a')) e.stopPropagation(); }, { capture: true });
const areaBanner = $('areaBanner'), areaBannerName = $('areaBannerName'), areaBannerDesc = $('areaBannerDesc');
function showAreaBanner(area, elevM) {
  areaBannerName.textContent = `${area.name} · ${elevM} m`;
  areaBannerDesc.textContent = area.desc;
  areaBanner.hidden = false;
}
function hideAreaBanner() { areaBanner.hidden = true; }
function focusOuterArea(area, clickM) {
  if (mapScope !== 'full') setMapScope('full', false);
  sfx.unlock();
  const tx = clickM ? clickM[0] : area.at[0], tz = clickM ? clickM[1] : area.at[1];
  const wx_ = wX(tx), wz_ = wZ(tz), wy_ = groundY(wx_, wz_);
  const elevM = Math.round(ELEV0 + wy_ / U);
  revealFogAt(tx, tz, area.radius || 175);
  for (const b of document.querySelectorAll('#segPlaces button')) b.setAttribute('aria-pressed', 'false');
  history.replaceState(null, '', location.pathname + location.search);
  closePlacePanel();
  showAreaBanner(area, elevM);
  flyTo([wx_, wy_ + 2, wz_], area.zoom || 0.24);
  log(area.name.toUpperCase(), `${area.desc} (${elevM} m above sea level)`, 'info');
}
$('btnResetFog').addEventListener('click', () => { resetFog(); hideAreaBanner(); goHome(); });
$('areaBannerClose').addEventListener('click', hideAreaBanner);

function actOn(kind, r, point, quiet) {
  if (!quiet) sfx.unlock(); // skipped for the #place=<key> deep-link's programmatic open: no user
  if (kind === 'ground') {  // gesture yet to unlock audio on, and Chrome warns on the console for it
    if (measure.on) { measureClick(point); sfx.tick(); return; }
    const x = mX(point.x), z = mZ(point.z), h = Math.round(ELEV0 + groundY(point.x, point.z) / U);
    if (!inCore(x, z)) {
      if (mapScope !== 'full') return;
      const area = resolveOuterArea(x, z);
      focusOuterArea(area, Math.hypot(area.at[0] - x, area.at[1] - z) <= 140 ? null : [x, z]);
      return;
    }
    const near = PLACES.map((P) => [P, Math.hypot(P.x - x, P.z - z)]).sort((a, b) => a[1] - b[1])[0];
    log('MAP', `${h} m above sea level here, ${Math.round(near[1])} m from ${near[0].name}.`, 'info');
    return;
  }
  if (kind === 'site') {
    hideAreaBanner();
    const off = panelOffset(r.zoom);
    flyTo([r.view[0] + off.x, r.view[1] + off.y, r.view[2] + off.z], r.zoom);
    if (!quiet && r.key === 'bhairab') ringBell();
    log(r.name.toUpperCase(), r.text, 'info');
    for (const b of document.querySelectorAll('#segPlaces button')) b.setAttribute('aria-pressed', String(b.dataset.v === r.key));
    history.replaceState(null, '', '#place=' + r.key); // keep the URL deep-linkable to this place
    openPlacePanel(r);
    return;
  }
  if (r.hidden) { log('KIRTIPUR', `${r.name} is indoors.`, 'info'); return; }
  flyTo([r.x, r.y + 0.6, r.z], 0.06); // close up on whoever was clicked (the cast rail too)
  act(r, 'wave', 1.2);
  log('KIRTIPUR', `${r.name}: ${r.state.toLowerCase()}. Walked ${Math.round(r.metres)} m today.`, 'info');
}
uiHooks.actOn = actOn;
// Click any of the six places for a close-up: an invisible hit box over each, and where the camera goes
for (const F_ of FOCUS) {
  const x = wX(F_.at[0]), z = wZ(F_.at[1]), y = siteGround(F_);
  F_.view = [x, y + F_.h * U * 0.35, z];
  const m = new THREE.Mesh(UNIT, new THREE.MeshBasicMaterial({ visible: false }));
  m.scale.set(F_.r * 2 * U, F_.h * U, F_.r * 2 * U); m.position.set(x, y + F_.h * U / 2, z); scene.add(m);
  clickables.push({ mesh: m, kind: 'site', ref: F_ });
}
// The camera glides to a close-up and back; any drag or pinch takes over from it
let mapScope = 'hill';
const HOME_HILL = { at: [0, -16, 0], zoom: 1, baseW: 190, baseH: 170, tallW: 190, downPx: 80, pan: { x0: wX(CX0), x1: wX(CX1), z0: wZ(CZ0), z1: wZ(CZ1) } };
const HOME_FULL = { at: [BCX, -14, BCZ], zoom: 1, baseW: 540, baseH: 460, tallW: 520, downPx: 20, pan: { x0: wX(BX0), x1: wX(BX1), z0: wZ(BZ0), z1: wZ(BZ1) } };
const scopeCfg = () => (mapScope === 'hill' ? HOME_HILL : HOME_FULL);
const fly = { goal: null, zoom: 1 };
function flyTo(at, zoom) { zoomGoal = null; panGoal = null; panVel.set(0, 0); fly.goal = new THREE.Vector3(...at); fly.zoom = zoom; }
// Screen-space framing helpers: baseW/baseH/tallW mirror the same numbers passed to
// iso.configure below (camera.js's own base-view-height formula), so a target's final, settled
// viewH - and from it, world units per CSS pixel at the current viewport - can be computed before
// the camera glide there actually finishes.
const COS2_EL = Math.cos(iso.el) ** 2; // a pure world-Y nudge is foreshortened by this at the fixed isometric look-down angle
function frameScale(zoom) {
  const cfg = scopeCfg();
  const stageW = stageEl.clientWidth || innerWidth || 1440, stageH = stageEl.clientHeight || innerHeight || 900;
  const aspect = stageW / stageH;
  const base = Math.max(cfg.baseH, (aspect < 1 && cfg.tallW ? cfg.tallW : cfg.baseW) / aspect);
  return (base * zoom) / stageH; // world units per CSS pixel, isotropic for this orthographic camera
}
function homeTarget() {
  const cfg = scopeCfg();
  const dy = (cfg.downPx * frameScale(cfg.zoom)) / COS2_EL;
  return [cfg.at[0], cfg.at[1] + dy, cfg.at[2]];
}
// Host review: with the place panel open, a focused landmark rendered dead centre of the whole
// canvas, right against the panel's left edge (desktop) or under the bottom sheet (phones).
// Nudge the fly-to target along the camera's current screen-space right/up axes so the landmark
// instead centres in the map area actually left visible - left of the panel on desktop, above the
// sheet on phones - using the same panel/sheet sizing the CSS itself uses (src/style.css's
// `width: min(380px, 92vw)` and the mobile `max-height: 45vh`).
function panelOffset(zoom) {
  const stageW = stageEl.clientWidth || innerWidth || 1440, stageH = stageEl.clientHeight || innerHeight || 900;
  const mobile = stageW <= 600;
  const clear = (mobile ? stageH * 0.46 : Math.min(380, stageW * 0.92)) / 2;
  const scale = frameScale(zoom);
  const v = new THREE.Vector3();
  return mobile ? v.addScaledVector(iso.up, -clear * scale) : v.addScaledVector(iso.right, clear * scale);
}
let zoomGoal = null, holdZoom = 0, panGoal = null;
const holdPan = [0, 0], panVel = new THREE.Vector2(), keysHeld = new Set();
let dragTrack = null;

function clampPan(x, z) {
  const B = iso.panBounds;
  return B ? [clamp(x, B.x0, B.x1), clamp(z, B.z0, B.z1)] : [x, z];
}
function panByScreen(rightWorld, upWorld, smoothGoal = false) {
  const upSin = Math.sin(iso.el) || 0.577;
  const fx = -Math.cos(iso.az) / upSin, fz = -Math.sin(iso.az) / upSin;
  const dx = iso.right.x * rightWorld + fx * upWorld;
  const dz = iso.right.z * rightWorld + fz * upWorld;
  const base = smoothGoal ? (panGoal || iso.target) : iso.target;
  const [nx, nz] = clampPan(base.x + dx, base.z + dz);
  if (smoothGoal && !motion.reduced) {
    panGoal = new THREE.Vector3(nx, base.y, nz);
  } else {
    panGoal = null;
    iso.target.x = nx; iso.target.z = nz;
  }
}
function stepZoom(factor) {
  fly.goal = null; panVel.set(0, 0);
  const base = zoomGoal ?? iso.zoom;
  zoomGoal = clamp(base * factor, iso.zoomMin, iso.zoomMax);
  if (motion.reduced) { iso.zoom = zoomGoal; zoomGoal = null; }
}
function updateNav(dt) {
  if (zoomGoal !== null) {
    const k = motion.reduced ? 1 : 1 - Math.exp(-dt * 10);
    iso.zoom += (zoomGoal - iso.zoom) * k;
    if (Math.abs(zoomGoal - iso.zoom) < 0.001) { iso.zoom = zoomGoal; zoomGoal = null; }
  }
  if (holdZoom) {
    fly.goal = null; zoomGoal = null;
    iso.zoom = clamp(iso.zoom * Math.exp(holdZoom * dt * 1.45), iso.zoomMin, iso.zoomMax);
  }
  if (panGoal) {
    const k = motion.reduced ? 1 : 1 - Math.exp(-dt * 10);
    iso.target.lerp(panGoal, k);
    if (iso.target.distanceTo(panGoal) < 0.02) { iso.target.copy(panGoal); panGoal = null; }
  }
  let kx = holdPan[0], kz = holdPan[1];
  if (keysHeld.has('a')) kx -= 1;
  if (keysHeld.has('d')) kx += 1;
  if (keysHeld.has('w') || keysHeld.has('arrowup')) kz += 1;
  if (keysHeld.has('s') || keysHeld.has('arrowdown')) kz -= 1;
  if (kx || kz) {
    fly.goal = null; panGoal = null; panVel.set(0, 0);
    const spd = iso.viewH * (keysHeld.has('shift') ? 1.25 : 0.72) * dt;
    const len = Math.hypot(kx, kz) || 1;
    panByScreen((kx / len) * spd, (kz / len) * spd, false);
  } else if (panVel.lengthSq() > 0.05 && !fly.goal && !orbit.on && !dragTrack) {
    const [nx, nz] = clampPan(iso.target.x + panVel.x * dt, iso.target.z + panVel.y * dt);
    iso.target.x = nx; iso.target.z = nz;
    panVel.multiplyScalar(motion.reduced ? 0 : Math.exp(-dt * 7));
    if (panVel.lengthSq() < 0.05) panVel.set(0, 0);
  }
}
function updateFly(dt) {
  if (!fly.goal) return;
  const k = motion.reduced ? 1 : 1 - Math.exp(-dt * 4);
  iso.target.lerp(fly.goal, k);
  iso.zoom += (fly.zoom - iso.zoom) * k;
  if (iso.target.distanceTo(fly.goal) < 0.01 && Math.abs(iso.zoom - fly.zoom) < 0.001) fly.goal = null;
}
stageEl.addEventListener('pointerdown', (e) => {
  if (e.target.closest('button, input, .panel, a')) return;
  fly.goal = null; panGoal = null; panVel.set(0, 0);
  dragTrack = { x: iso.target.x, z: iso.target.z, vx: 0, vz: 0, t: performance.now() };
});
stageEl.addEventListener('pointermove', (e) => {
  if (e.buttons) { fly.goal = null; panGoal = null; }
  if (!dragTrack || !e.buttons) return;
  const now = performance.now(), dt = Math.max(0.008, (now - dragTrack.t) / 1000);
  const vx = (iso.target.x - dragTrack.x) / dt, vz = (iso.target.z - dragTrack.z) / dt;
  dragTrack.vx = dragTrack.vx * 0.55 + vx * 0.45;
  dragTrack.vz = dragTrack.vz * 0.55 + vz * 0.45;
  dragTrack.x = iso.target.x; dragTrack.z = iso.target.z; dragTrack.t = now;
});
function releaseDragTrack() {
  if (!dragTrack) return;
  if (!motion.reduced && performance.now() - dragTrack.t < 90 && Math.hypot(dragTrack.vx, dragTrack.vz) > 1.5) {
    panVel.set(clamp(dragTrack.vx, -180, 180), clamp(dragTrack.vz, -180, 180));
  }
  dragTrack = null;
}
stageEl.addEventListener('pointerup', releaseDragTrack);
stageEl.addEventListener('pointercancel', releaseDragTrack);
stageEl.addEventListener('wheel', (e) => {
  e.preventDefault();
  e.stopPropagation();
  fly.goal = null; zoomGoal = null; panGoal = null; panVel.set(0, 0);
  const oldZ = iso.zoom;
  const factor = Math.exp(clamp(e.deltaY, -120, 120) * 0.0022);
  const newZ = clamp(oldZ * factor, iso.zoomMin, iso.zoomMax);
  if (newZ === oldZ) return;
  const r = canvas.getBoundingClientRect();
  if (r.width > 0 && r.height > 0) {
    const nx = ((e.clientX - r.left) / r.width) * 2 - 1;
    const ny = 1 - ((e.clientY - r.top) / r.height) * 2;
    const aspect = r.width / r.height;
    const cfg = scopeCfg();
    const base = Math.max(cfg.baseH, (aspect < 1 && cfg.tallW ? cfg.tallW : cfg.baseW) / aspect);
    const dViewH = base * (newZ - oldZ);
    panByScreen(-nx * (dViewH * aspect * 0.5), -ny * (dViewH * 0.5), false);
  }
  iso.zoom = newZ;
}, { capture: true, passive: false });
// Double-click a spot for a cinematic orbit: glide in to it, one slow eased turn all the way round,
// then settle on the nearest quarter view. Any drag, wheel, key or button press ends it there.
const orbit = { on: false, left: 0 }, _ray = new THREE.Raycaster(), _ndc = new THREE.Vector2();
function endOrbit() {
  if (!orbit.on) return;
  orbit.on = false;
  iso.turn = Math.round((iso.az - iso.az0) / (Math.PI / 2)); iso.azTarget = iso.az0 + iso.turn * Math.PI / 2;
}
stageEl.addEventListener('dblclick', (e) => {
  if (measure.on || e.target.closest('button, input, .panel, .pin')) return;
  const r = canvas.getBoundingClientRect();
  _ray.setFromCamera(_ndc.set((e.clientX - r.left) / r.width * 2 - 1, 1 - (e.clientY - r.top) / r.height * 2), iso.cam);
  const hit = _ray.intersectObjects(clickables.map((c) => c.mesh), false)[0];
  if (!hit) return;
  flyTo(hit.point.toArray(), Math.min(iso.zoom, 0.4));
  orbit.on = !motion.reduced; orbit.left = TAU;
});
for (const ev of ['pointerdown', 'wheel', 'keydown']) addEventListener(ev, endOrbit, { capture: true, passive: true });
function updateOrbit(dt) {
  if (!orbit.on) return;
  const ease = 0.25 + 0.75 * Math.sin(Math.PI * (1 - orbit.left / TAU)); // slow away, slow to rest
  const step = Math.min(orbit.left, dt * ease * TAU / 20);
  iso.az += step; iso.azTarget = iso.az; orbit.left -= step;
  if (orbit.left <= 0) endOrbit();
}
function goHome() { const cfg = scopeCfg(); hideAreaBanner(); flyTo(homeTarget(), cfg.zoom); for (const b of document.querySelectorAll('#segPlaces button')) b.setAttribute('aria-pressed', 'false'); history.replaceState(null, '', location.pathname + location.search); closePlacePanel(); }
function setMapScope(scope, flyHome = true) {
  mapScope = scope === 'hill' ? 'hill' : 'full';
  coreOnlyGroup.visible = mapScope === 'hill';
  outerOnlyGroup.visible = mapScope === 'full';
  for (const b of document.querySelectorAll('#segScope button')) b.setAttribute('aria-pressed', String(b.dataset.v === mapScope));
  const cfg = scopeCfg();
  iso.configure({ panBounds: cfg.pan, baseW: cfg.baseW, baseH: cfg.baseH, tallW: cfg.tallW });
  if (mapScope === 'hill') hideAreaBanner();
  if (flyHome) goHome();
}
for (const b of document.querySelectorAll('#segScope button')) b.addEventListener('click', () => setMapScope(b.dataset.v, true));
$('btnHome').addEventListener('click', goHome);
$('btnWalkthrough').addEventListener('click', () => actOn('site', focusOf('stupa')));
// The Places bar, and keys 1-6, jump to each focus place
for (const b of document.querySelectorAll('#segPlaces button')) b.addEventListener('click', () => actOn('site', focusOf(b.dataset.v)));
document.addEventListener('keydown', (e) => {
  if (e.target.closest && e.target.closest('input, textarea')) return;
  const kl = (e.key || '').toLowerCase();
  keysHeld.add(kl);
  if (e.key === 'Escape') goHome();
  if (e.key === '+' || e.key === '=') stepZoom(0.76);
  if (e.key === '-' || e.key === '_') stepZoom(1.32);
  const k = '123456'.indexOf(e.key);
  if (k >= 0) actOn('site', FOCUS[k]);
});
document.addEventListener('keyup', (e) => keysHeld.delete((e.key || '').toLowerCase()));
window.addEventListener('blur', () => { keysHeld.clear(); holdZoom = 0; holdPan[0] = holdPan[1] = 0; });
const rowOf = (p) => ({ ref: p, color: p.color, label: p.name, sub: p.sub, state: () => p.state, hot: () => !p.hidden && p.pi < p.path.length });
buildCast([
  { head: 'Temples' }, ...walkers.filter((p) => p.role === 'priest' || p.role === 'devotee').map(rowOf),
  { head: 'Neighbours' }, ...walkers.filter((p) => p.role === 'local').map(rowOf),
  { head: 'Visitors' }, ...walkers.filter((p) => p.role === 'tourist').map(rowOf)
]);
$('btnMeasure').addEventListener('click', () => {
  measure.on = !measure.on;
  $('btnMeasure').setAttribute('aria-pressed', String(measure.on));
  if (!measure.on) { measure.a = measure.b = null; measure.text = ''; tape.visible = false; for (const p of pins) p.visible = false; }
  log('MEASURE', measure.on ? 'Click two points on the map to measure between them.' : 'Measuring off.', 'info');
});
$('btnLabels').addEventListener('click', () => { day.labels = !day.labels; $('btnLabels').setAttribute('aria-pressed', String(day.labels)); });
const timeSlider = $('timeSlider');
timeSlider.addEventListener('input', () => setHour(timeSlider.value / 60));
$('btnNow').addEventListener('click', () => { day.offset = 0; });
// Legend toggle: only shown on phones (src/style.css), where the legend starts collapsed so it
// never overlaps the title/compass/scale bar; a no-op on desktop, where the legend is always shown.
$('btnLegend').addEventListener('click', () => {
  const open = $('legend').classList.toggle('open');
  $('btnLegend').setAttribute('aria-expanded', String(open));
});
// Fewer houses: no on-map control any more (decision 6), so just left at its old default
// share, evenly thinned (the house collapse around a focused place is unaffected by this).
thinHouses(0.2);
// Zoom in/out (tap for smooth step, hold for continuous), turn left/right, and 4-way D-pad pan
function bindHoldZoom(id, dir, tapFactor) {
  const el = $(id);
  let timer = 0, held = false;
  const stop = () => { clearTimeout(timer); holdZoom = 0; };
  el.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    held = false;
    timer = setTimeout(() => { held = true; holdZoom = dir; }, 180);
  });
  for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) el.addEventListener(ev, stop);
  el.addEventListener('click', () => { if (!held) stepZoom(tapFactor); held = false; });
}
const mapNav = $('mapNav'), btnNavToggle = $('btnNavToggle');
btnNavToggle.addEventListener('click', () => {
  const collapsed = mapNav.classList.toggle('collapsed');
  btnNavToggle.setAttribute('aria-expanded', String(!collapsed));
  btnNavToggle.setAttribute('aria-label', collapsed ? 'Expand navigation' : 'Collapse navigation');
});
bindHoldZoom('btnZoomIn', -1, 0.72);
bindHoldZoom('btnZoomOut', 1, 1.38);
$('btnTurnL').addEventListener('click', () => { fly.goal = null; iso.stepTurn(-1); });
$('btnTurnR').addEventListener('click', () => { fly.goal = null; iso.stepTurn(1); });
function bindHoldPan(id, dx, dz) {
  const el = $(id);
  let timer = 0, held = false;
  const stop = () => { clearTimeout(timer); holdPan[0] = 0; holdPan[1] = 0; };
  el.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    held = false;
    timer = setTimeout(() => { held = true; holdPan[0] = dx; holdPan[1] = dz; }, 160);
  });
  for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) el.addEventListener(ev, stop);
  el.addEventListener('click', () => {
    if (!held) { fly.goal = null; panVel.set(0, 0); panByScreen(dx * iso.viewH * 0.22, dz * iso.viewH * 0.22, true); }
    held = false;
  });
}
bindHoldPan('btnPanN', 0, 1);
bindHoldPan('btnPanS', 0, -1);
bindHoldPan('btnPanW', -1, 0);
bindHoldPan('btnPanE', 1, 0);
$('btnPanCenter').addEventListener('click', goHome);
// On-map theme toggle: reuses the engine's own hidden #btnTheme (click() fires its listener
// and applyMapBg together, see slice 1), just mirroring its label onto a visible button.
const btnThemeUI = $('btnThemeUI');
function syncThemeUI() { btnThemeUI.textContent = $('btnTheme').textContent; }
btnThemeUI.addEventListener('click', () => { $('btnTheme').click(); syncThemeUI(); });
darkMQ.addEventListener?.('change', syncThemeUI);
syncThemeUI();

let uiT = 0;
function refreshUI(dt) {
  if ((uiT -= dt) > 0) return;
  uiT = 0.2;
  $('bWalked').textContent = (stats.metres / 1000).toFixed(1);
  $('bBells').textContent = stats.bells;
  $('bClock').textContent = clockStr();
  $('clockNow').textContent = clockStr();
  if (!timeSlider.matches(':active')) timeSlider.value = Math.round(day.hour * 60);
  timeSlider.setAttribute('aria-valuetext', `${clockStr()} in Kirtipur`);
  $('btnNow').setAttribute('aria-pressed', String(day.offset === 0));
  $('bDay').textContent = `DAY ${day.n}`;
  $('bTicker').textContent = measure.text ? measure.text.toUpperCase() : `${walkers.filter((p) => !p.hidden && p.pi < p.path.length).length} ON THE LANES`;
  $('cVisits').textContent = stats.visits;
  $('cOut').textContent = walkers.filter((p) => !p.hidden).length;
  setBar('Light', envNow.sunInt / 2.4, wx.time === 'day' ? 'Sunlit' : wx.time === 'dusk' ? 'Lamps' : 'Moonlight');
  setBar('Breeze', env.wind / 0.9, env.wind > 0.5 ? 'Windy' : env.wind > 0.25 ? 'Light' : 'Still');
  setBar('Bustle', walkers.filter((p) => !p.hidden).length / walkers.length, '');
  refreshCast();
}

/* ------------------------------------------------------------------ */
/* Wiring and start                                                    */
/* ------------------------------------------------------------------ */
// A steeper look-down than the usual isometric angle, so the board reads as a map
// The usual isometric view of a floating island; zoom in close enough to see people in the lanes
iso.cam.near = -800; iso.cam.far = 1600; iso.cam.updateProjectionMatrix();
iso.configure({ drag: 'pan', panBounds: HOME_HILL.pan, zoomMin: 0.08, zoomMax: HOME_HILL.zoom, zoom: 1, viewH: HOME_HILL.baseH, target: homeTarget(), baseW: HOME_HILL.baseW, baseH: HOME_HILL.baseH, tallW: HOME_HILL.tallW }); // zoomMax: never further out than the whole island
setMapScope('hill', false);
view.raw = true; fitViewport(); // open in smooth full-resolution 3D; set directly, since clicking the hidden button would start audio without a user gesture
uiHooks.stamp = () => `D${day.n} ${clockStr()}`;
uiHooks.wxMsg = { clear: 'Clear skies over the valley.', breezy: 'A breeze along the ridge.', drizzle: 'Soft rain on the brick lanes.' };
envHooks.timeMsg = { dusk: 'Dusk over Kirtipur.', night: 'Night. Lamps in the lanes.' };
envHooks.rain = { n: 700, x: 70, z: 70, top: 40, floor: -60, keepOut: null };
envHooks.lights = (L) => {
  sun.target.position.set(iso.target.x, 0, iso.target.z);
  sun.position.multiplyScalar(4).add(sun.target.position);
  for (const m of HOUSE_MATS) m.emissiveIntensity = L * 0.3; // lamplight in the house windows after dark
  nightLights(L);
};
function simulate(h) {
  for (const p of people) movePerson(p, h, people);
  day.hour = (liveHour() + day.offset) % 24;
  syncTime();
  const night = day.hour >= 20.5 || day.hour < 6;
  for (const p of walkers) walkerAI(p, h, night);
  updateBells(h, loop.simTime);
}
// Close in on a site (by click or by zooming) and the houses round it sink to stubs; zoom out and they rise
function updateCollapse(dt) {
  let best = null, bd = Infinity;
  for (const F_ of FOCUS) { const d = Math.hypot(iso.target.x - F_.view[0], iso.target.z - F_.view[2]); if (d < bd) { bd = d; best = F_; } }
  const r = best.collapse * U;
  let want = 0;
  if (iso.zoom < 0.2 && bd < r) { want = 1; COLLAPSE.focus.value.set(best.view[0], best.view[2], r); }
  else if (iso.zoom < 0.09) { want = 1; COLLAPSE.focus.value.set(iso.target.x, iso.target.z, 22 * U); } // street level anywhere: open up the lane

  COLLAPSE.amount.value += (want - COLLAPSE.amount.value) * (motion.reduced ? 1 : 1 - Math.exp(-dt * 5));
}
function draw(dt) { const h = Math.min(0.1, dt || 1 / 60); updateFly(h); updateNav(h); updateOrbit(h); updateCollapse(h); updateFog(h); placeLabels(); placePins(); updateCompass(); updateScaleBar(); }
document.querySelector('.stage-hint').textContent = 'Drag to move · Shift-drag or ◀ ▶ to turn · Scroll to zoom · Click anything';
bake(S);
bake(outerS);
configureShadow(140, 600);
setTime('day', true);
log('KIRTIPUR', `Kirtipur at true scale, floating: ${BX1 - BX0} × ${BZ1 - BZ0} m across Kirtipur (clear ${CX1 - CX0} × ${CZ1 - CZ0} m Old Town, click any fogged area to reveal & focus).`, 'info');
// #place=<key> deep link or landing walkthrough: if a place is given in the hash,
// land on it. Otherwise start the walkthrough on Chilancho.
iso.update(0, stageEl.clientWidth || innerWidth || 1440, stageEl.clientHeight || innerHeight || 900);
(() => {
  const m = /^#place=(\w+)$/.exec(location.hash);
  const target = (m && focusOf(m[1])) || focusOf('stupa');
  if (!target) return;
  actOn('site', target, null, true); // quiet: no user gesture yet on an initial load
  iso.target.copy(fly.goal); iso.zoom = fly.zoom; fly.goal = null;
  COLLAPSE.focus.value.set(target.view[0], target.view[2], target.collapse * U);
  COLLAPSE.amount.value = 1;
})();
startLoop({ simulate, ui: refreshUI, draw, debug: { day, walkers, stats, measure } });
