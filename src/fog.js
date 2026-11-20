/* ------------------------------------------------------------------ */
/* Fog over remaining Kirtipur areas outside the 440 x 460 m Old Town */
/* core. Clicking anywhere on the fogged map (or an outer area chip)   */
/* parts the mist smoothly and focuses the camera on that area.        */
/* ------------------------------------------------------------------ */
const OUTER_AREAS = [
  { key: 'gorakhnath', name: 'Gorakhnath & Saraswati', at: [-280, -163], radius: 155, zoom: 0.2, desc: 'Hilltop shrines north-west of Uma Maheshwar overlooking the ridge.' },
  { key: 'devdhoka', name: 'Dev Dhoka & Hospital', at: [-305, -290], radius: 175, zoom: 0.22, desc: 'Dev Dhoka neighbourhood, Kirtipur Hospital, and north-western slopes.' },
  { key: 'samala', name: 'Sa-ma-la', at: [-310, 10], radius: 160, zoom: 0.22, desc: 'Western slope toles: Sa-ma-la, Na-ga-chwa, Si-dhwa-kha, and Sa-gah.' },
  { key: 'maitrinagar', name: 'Maitri Nagar', at: [-44, -799], radius: 230, zoom: 0.28, desc: 'Northern ridge neighbourhood along Maitri Nagar and Sahid Basu Smriti Marga.' },
  { key: 'tyanglaphat', name: 'Tyanglaphat', at: [265, -225], radius: 205, zoom: 0.25, desc: 'North-eastern plateau beside Tyangla Chowk and the descent to the valley.' },
  { key: 'tu', name: 'Tribhuvan University', at: [760, -150], radius: 300, zoom: 0.34, desc: 'Tribhuvan University campus, gardens, hostels, and academic halls.' },
  { key: 'nayabazar', name: 'Nayabazar', at: [390, 420], radius: 210, zoom: 0.26, desc: 'Nayabazar bazaar, Karunakar Vihar (Kwe Baha), Ma-ra-khyah, and eastern lanes.' },
  { key: 'kirtibihar', name: 'Shree Kirti Bihar', at: [500, 482], radius: 185, zoom: 0.24, desc: 'Nagar Mandap Shree Kirti Bihar monastery and eastern Kirtipur streets.' },
  { key: 'nagaon', name: 'Nagaon', at: [-95, 710], radius: 230, zoom: 0.28, desc: 'Historic Nagaon settlement, Balkumari Temple, and Khaley Pukhu pond.' },
  { key: 'panga', name: 'Panga', at: [250, 900], radius: 250, zoom: 0.3, desc: 'Historic Panga town, Sundar Bazar, Chiku Pond, and southern lanes.' },
  { key: 'bhajangal', name: 'Bhajangal', at: [810, 845], radius: 220, zoom: 0.28, desc: 'Bhajangal neighbourhood, temple, and south-eastern Kirtipur terraces.' }
];

const MAX_REVEALS = 24;
const fogReveals = []; // { wx, wz, curR, targetR, mx, mz }
const fogUniformReveals = Array.from({ length: MAX_REVEALS }, () => new THREE.Vector4(0, 0, 0, 0));

const FOG_VERT = /* glsl */`
varying vec2 vWorldXZ;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldXZ = wp.xz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

const FOG_FRAG = /* glsl */`
precision highp float;
varying vec2 vWorldXZ;
uniform vec4 uCore;
uniform vec4 uBoard;
uniform vec4 uReveals[${MAX_REVEALS}];
uniform vec3 uColBase;
uniform vec3 uColEdge;
uniform float uTime;
uniform float uLayerAlpha;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
    mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 3; i++) { v += a * vnoise(p); p *= 2.05; a *= 0.5; }
  return v;
}

void main() {
  vec2 p = vWorldXZ;
  float n1 = fbm(p * 0.045 + vec2(uTime * 0.04, -uTime * 0.03));
  float n2 = fbm(p * 0.11 - vec2(uTime * 0.03, uTime * 0.02));
  float wobble = (n1 - 0.5) * 8.0;

  // Signed distance outside the clear Old Town core box (negative inside core)
  vec2 cMin = uCore.xz, cMax = uCore.yw;
  vec2 dBox = max(cMin - p, p - cMax);
  float coreDist = length(max(dBox, 0.0)) + min(max(dBox.x, dBox.y), 0.0);
  float clearMask = smoothstep(-2.0, 12.0, coreDist + wobble * 0.65);

  // Subtract revealed outer area circles
  for (int i = 0; i < ${MAX_REVEALS}; i++) {
    vec4 rv = uReveals[i];
    if (rv.w > 0.5 && rv.z > 0.01) {
      float d = length(p - rv.xy) + wobble * 0.8;
      float hole = 1.0 - smoothstep(rv.z * 0.65, rv.z, d);
      clearMask *= (1.0 - hole);
    }
  }

  // Soft fade right past the outer rim of the floating board so edge buildings stay covered
  vec2 bMin = uBoard.xz, bMax = uBoard.yw;
  float rim = min(min(p.x - bMin.x, bMax.x - p.x), min(p.y - bMin.y, bMax.y - p.y));
  float rimFade = smoothstep(-4.0, 0.5, rim);

  float cloud = 0.72 + 0.28 * n2;
  float alpha = clamp(clearMask * rimFade * uLayerAlpha * (0.88 + 0.12 * n1), 0.0, 0.98);
  if (alpha < 0.01) discard;
  vec3 col = mix(uColBase, uColEdge, clamp(n1 * 0.7 + (1.0 - clearMask) * 0.35, 0.0, 1.0)) * cloud + (1.0 - cloud) * uColEdge * 0.28;
  gl_FragColor = vec4(col, alpha);
}`;

function makeFogGrid(lift, segX = 64, segZ = 72) {
  const pad = 20; // overhang slightly past board edges so boundary rooftops stay veiled
  const x0 = BX0 - pad, x1 = BX1 + pad, z0 = BZ0 - pad, z1 = BZ1 + pad;
  const pos = [], idx = [];
  for (let j = 0; j <= segZ; j++) {
    const mz = z0 + (z1 - z0) * (j / segZ), wz = wZ(mz);
    for (let i = 0; i <= segX; i++) {
      const mx = x0 + (x1 - x0) * (i / segX), wx = wX(mx);
      pos.push(wx, groundY(wx, wz) + lift, wz);
    }
  }
  const stride = segX + 1;
  for (let j = 0; j < segZ; j++) for (let i = 0; i < segX; i++) {
    const a = j * stride + i, b = a + 1, c = a + stride, d = c + 1;
    idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  return g;
}

const fogUniforms = {
  uCore: { value: new THREE.Vector4(wX(CX0), wX(CX1), wZ(CZ0), wZ(CZ1)) },
  uBoard: { value: new THREE.Vector4(wX(BX0), wX(BX1), wZ(BZ0), wZ(BZ1)) },
  uReveals: { value: fogUniformReveals },
  uColBase: { value: new THREE.Color('#f4e8d8') },
  uColEdge: { value: new THREE.Color('#fffaf2') },
  uTime: { value: 0 },
  uLayerAlpha: { value: 0.94 }
};

function makeFogLayer(lift, alpha, order) {
  const mat = new THREE.ShaderMaterial({
    vertexShader: FOG_VERT,
    fragmentShader: FOG_FRAG,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: {
      ...fogUniforms,
      uLayerAlpha: { value: alpha }
    }
  });
  const m = new THREE.Mesh(makeFogGrid(lift), mat);
  m.renderOrder = order;
  m.userData.live = true;
  outerOnlyGroup.add(m);
  return m;
}
const fogUnderMesh = makeFogLayer(1.4, 0.88, 2);
const fogTopMesh = makeFogLayer(7.2, 0.94, 3);

/* Valley mist ring around Kirtipur Hill (shown in Kirtipur Hill mode) */
const HILL_FOG_FRAG = /* glsl */`
precision highp float;
varying vec2 vWorldXZ;
uniform vec4 uCore;
uniform vec3 uColBase;
uniform vec3 uColEdge;
uniform float uTime;
uniform float uLayerAlpha;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
    mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 3; i++) { v += a * vnoise(p); p *= 2.05; a *= 0.5; }
  return v;
}

void main() {
  vec2 p = vWorldXZ;
  float n1 = fbm(p * 0.042 + vec2(uTime * 0.035, -uTime * 0.025));
  float n2 = fbm(p * 0.095 - vec2(uTime * 0.025, uTime * 0.02));
  float wisps = smoothstep(0.26, 0.78, n1 * 0.65 + n2 * 0.35);

  vec2 cMin = uCore.xz, cMax = uCore.yw;
  vec2 cMid = (cMin + cMax) * 0.5;
  vec2 cHalf = (cMax - cMin) * 0.5;
  vec2 q = abs(p - cMid) - cHalf;
  // Rounded-corner box distance + strong organic cloud wobble so mist never reads as a hard rectangle
  float boxDist = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
  float d = boxDist + (n1 - 0.5) * 18.0 + (n2 - 0.5) * 9.0;

  float innerClear = smoothstep(-2.0, 5.5, d);
  float outerFade = 1.0 - smoothstep(6.0, 18.0, d);
  float alpha = clamp(innerClear * outerFade * wisps * uLayerAlpha, 0.0, 0.85);
  if (alpha < 0.01) discard;
  vec3 col = mix(uColBase, uColEdge, clamp(n1 * 0.55 + n2 * 0.45, 0.0, 1.0));
  gl_FragColor = vec4(col, alpha);
}`;

function makeHillFogLayer(y, alpha, order) {
  const pad = 95; // metres outside CORE (keeps 390px mobile screen edges clean)
  const x0 = wX(CX0 - pad), x1 = wX(CX1 + pad), z0 = wZ(CZ0 - pad), z1 = wZ(CZ1 + pad);
  const geo = new THREE.PlaneGeometry(x1 - x0, z1 - z0, 1, 1);
  geo.rotateX(-Math.PI / 2);
  geo.translate((x0 + x1) / 2, y, (z0 + z1) / 2);
  const mat = new THREE.ShaderMaterial({
    vertexShader: FOG_VERT,
    fragmentShader: HILL_FOG_FRAG,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: {
      uCore: fogUniforms.uCore,
      uColBase: fogUniforms.uColBase,
      uColEdge: fogUniforms.uColEdge,
      uTime: fogUniforms.uTime,
      uLayerAlpha: { value: alpha }
    }
  });
  const m = new THREE.Mesh(geo, mat);
  m.renderOrder = order;
  m.userData.live = true;
  coreOnlyGroup.add(m);
  return m;
}
const hillFogLow = makeHillFogLayer(CORE_BASE + 4.4, 0.82, 2);
const hillFogHigh = makeHillFogLayer(CORE_BASE + 7.4, 0.68, 3);

function syncFogTheme() {
  const dark = effectiveTheme() === 'dark' || wx.time === 'night';
  const dusk = !dark && wx.time === 'dusk';
  if (dark) {
    fogUniforms.uColBase.value.set('#2c2533');
    fogUniforms.uColEdge.value.set('#463b52');
  } else if (dusk) {
    fogUniforms.uColBase.value.set('#e8c4a6');
    fogUniforms.uColEdge.value.set('#f7d8bd');
  } else {
    fogUniforms.uColBase.value.set('#f5eadc');
    fogUniforms.uColEdge.value.set('#fffaf2');
  }
}

function revealFogAt(mx, mz, radiusM = 175) {
  const existing = fogReveals.find((r) => Math.hypot(r.mx - mx, r.mz - mz) < 75);
  const targetR = radiusM * U;
  if (existing) {
    existing.targetR = Math.max(existing.targetR, targetR);
    if (motion.reduced) existing.curR = existing.targetR;
    return existing;
  }
  if (fogReveals.length >= MAX_REVEALS) fogReveals.shift();
  const entry = { mx, mz, wx: wX(mx), wz: wZ(mz), curR: motion.reduced ? targetR : 1, targetR };
  fogReveals.push(entry);
  return entry;
}

function resetFog() {
  fogReveals.length = 0;
  for (let i = 0; i < MAX_REVEALS; i++) fogUniformReveals[i].set(0, 0, 0, 0);
}

function isFogRevealed(mx, mz) {
  if (inCore(mx, mz)) return true;
  return fogReveals.some((r) => Math.hypot(r.mx - mx, r.mz - mz) * U < r.targetR * 0.72);
}

function resolveOuterArea(mx, mz) {
  let best = null, bd = Infinity;
  for (const A of OUTER_AREAS) {
    const d = Math.hypot(A.at[0] - mx, A.at[1] - mz);
    if (d < bd) { bd = d; best = A; }
  }
  if (best && bd <= 200) return best;
  let poi = null, pd = Infinity;
  for (const P of MAP.pois) {
    if (!P.n || inCore(P.x, P.z)) continue;
    if (!['tole', 'place_of_worship', 'hospital', 'university', 'school', 'historic'].includes(P.t)) continue;
    const d = Math.hypot(P.x - mx, P.z - mz);
    if (d < pd) { pd = d; poi = P; }
  }
  if (poi && pd <= 180) {
    return {
      key: 'poi_' + poi.n.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
      name: poi.n,
      at: [poi.x, poi.z],
      radius: 175,
      zoom: 0.24,
      desc: `Surrounding Kirtipur area around ${poi.n}.`
    };
  }
  return {
    key: 'kirtipur_area',
    name: 'Kirtipur Neighbourhood',
    at: [mx, mz],
    radius: 175,
    zoom: 0.24,
    desc: 'Outer lanes, buildings, and hillside terraces of Kirtipur.'
  };
}

function updateFog(dt) {
  syncFogTheme();
  if (!motion.reduced) fogUniforms.uTime.value += dt;
  const k = motion.reduced ? 1 : 1 - Math.exp(-dt * 4.5);
  for (let i = 0; i < MAX_REVEALS; i++) {
    const r = fogReveals[i];
    if (r) {
      r.curR += (r.targetR - r.curR) * k;
      fogUniformReveals[i].set(r.wx, r.wz, r.curR, 1);
    } else {
      fogUniformReveals[i].set(0, 0, 0, 0);
    }
  }
  void fogUnderMesh;
  void fogTopMesh;
  void hillFogLow;
  void hillFogHigh;
}
