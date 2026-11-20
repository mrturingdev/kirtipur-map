/* ------------------------------------------------------------------ */
/* The lane network from OSM: shortest walks between real places       */
/* ------------------------------------------------------------------ */
const GN = MAP.graph.n, NN = GN.length / 2;
const ADJ = Array.from({ length: NN }, () => []);
for (let k = 0; k < MAP.graph.e.length; k += 2) {
  const a = MAP.graph.e[k], b = MAP.graph.e[k + 1], d = Math.hypot(GN[2 * a] - GN[2 * b], GN[2 * a + 1] - GN[2 * b + 1]);
  ADJ[a].push([b, d]); ADJ[b].push([a, d]);
}
const nodeW = (i) => [wX(GN[2 * i]), wZ(GN[2 * i + 1])];
function nearestNode(x, z) { // map metres
  let best = 0, bd = Infinity;
  for (let i = 0; i < NN; i++) { const d = Math.hypot(GN[2 * i] - x, GN[2 * i + 1] - z); if (d < bd) { bd = d; best = i; } }
  return best;
}
// Min-heap Dijkstra over the OSM lane graph; returns the node list and its length in metres
function route(a, b) {
  const dist = new Float64Array(NN).fill(Infinity), prev = new Int32Array(NN).fill(-1);
  const heap = [[0, a]];
  dist[a] = 0;
  while (heap.length) {
    const [du, u] = heap[0];
    const last = heap.pop();
    if (heap.length) {
      heap[0] = last;
      for (let i = 0, n = heap.length; ;) {
        let m = i, l = 2 * i + 1, r = l + 1;
        if (l < n && heap[l][0] < heap[m][0]) m = l;
        if (r < n && heap[r][0] < heap[m][0]) m = r;
        if (m === i) break;
        [heap[i], heap[m]] = [heap[m], heap[i]];
        i = m;
      }
    }
    if (du > dist[u]) continue;
    if (u === b) break;
    for (const [v, d] of ADJ[u]) {
      const nd = du + d;
      if (nd < dist[v]) {
        dist[v] = nd; prev[v] = u;
        heap.push([nd, v]);
        for (let i = heap.length - 1; i > 0;) {
          const p = (i - 1) >> 1;
          if (heap[p][0] <= heap[i][0]) break;
          [heap[p], heap[i]] = [heap[i], heap[p]];
          i = p;
        }
      }
    }
  }
  const path = [];
  for (let v = b; v >= 0; v = prev[v]) path.unshift(v);
  return { path: path[0] === a ? path : [a], m: dist[b] };
}
// Where people walk to: the six focus places and two more stops, each with its nearest lane node
const PLACES = [
  ...FOCUS.map((F_) => ({ key: F_.key, name: F_.name, x: F_.at[0], z: F_.at[1], pose: F_.pose })),
  { key: 'view', name: 'the viewpoint', x: -162.4, z: -59.9, pose: 'photo' },
  { key: 'dabu', name: 'Prajaa Dabu', x: -7.1, z: 44.7, pose: 'idle' }
];
for (const P of PLACES) P.node = nearestNode(P.x, P.z);
const placeOf = (k) => PLACES.find((P) => P.key === k);

/* ------------------------------------------------------------------ */
/* People: drawn about 1.8x life size so they read on a 440 m board    */
/* ------------------------------------------------------------------ */
Object.assign(POSES, {
  pray: { R: [-0.2, -0.02, 0.24], L: [-0.2, -0.02, 0.24], hip: 0.86, lean: 0.04 },
  photo: { R: [-0.12, 0.2, 0.22], L: [-0.12, 0.2, 0.22], hip: 0.86, lean: 0.0 }
});
const K = 0.45; // person scale: drawn about 1.8x life size (a 1.7 m figure stands 3 m) so they read on the map
const WALK = 0.6; // world units per second (2.4 m/s, a brisk walk so tours fit in a day)
const HAKU = { jersey: '#26221f', stripe: '#c45134', shorts: '#26221f', socks: '#26221f', shoes: '#403a35' };
const DAURA = { jersey: '#f2e2d0', shorts: '#f2e2d0', sleeve: '#f2e2d0', socks: '#f2e2d0', shoes: '#403a35' };
const ROSTER = [
  { name: 'Krishna Rajopadhyaya', role: 'priest', sub: 'pujari, Bagh Bhairab', jersey: '#fffaf2', stripe: '#f28b50', shorts: '#fffaf2', sleeve: '#fffaf2' },
  { name: 'Hira Dangol', role: 'devotee', sub: 'morning puja', jersey: '#c45134', shorts: '#9e3b26', sleeve: '#c45134' },
  { name: 'Laxmi Shakya', role: 'devotee', sub: 'temple round', ...HAKU, sleeve: '#fffaf2' },
  { name: 'Dil Shakya', role: 'devotee', sub: 'Chilancho kora', jersey: '#9e3b26', shorts: '#73281b', sleeve: '#f5b841' },
  { name: 'Ratna Shakya', role: 'devotee', sub: 'Chilancho kora', jersey: '#9e3b26', shorts: '#73281b', sleeve: '#9e3b26' },
  { name: 'Ram Maharjan', role: 'local', sub: 'farmer', ...DAURA, jersey: '#e8d2bc', shorts: '#403a35' },
  { name: 'Sita Maharjan', role: 'local', sub: 'farmer', ...HAKU, sleeve: '#c45134' },
  { name: 'Maiya Maharjan', role: 'local', sub: 'fetches water', ...HAKU, sleeve: '#c49fd1' },
  { name: 'Bishnu Shrestha', role: 'local', sub: 'tea shop', ...DAURA },
  { name: 'Gyan Baje', role: 'local', sub: 'grandfather', ...DAURA, hair: '#fffaf2' },
  { name: 'Nani Aji', role: 'local', sub: 'grandmother', ...HAKU, hair: '#fffaf2' },
  { name: 'Hari Dangol', role: 'local', sub: 'porter', ...DAURA, jersey: '#5c554e' },
  { name: 'Suman', role: 'local', sub: 'schoolboy', jersey: '#4fa3b8', shorts: '#403a35', k: 0.7 },
  { name: 'Anu', role: 'local', sub: 'schoolgirl', jersey: '#fa9e7d', shorts: '#875f9c', k: 0.7 },
  { name: 'Mia', role: 'tourist', sub: 'visitor', jersey: '#68b8c7', shorts: '#caa98e', hair: '#d99926' },
  { name: 'Jonas', role: 'tourist', sub: 'visitor', jersey: '#f28b50', shorts: '#5c554e' },
  { name: 'Aiko', role: 'tourist', sub: 'visitor', jersey: '#a4cc8e', shorts: '#388296' },
  { name: 'Sam', role: 'tourist', sub: 'visitor', jersey: '#fffaf2', shorts: '#26221f' }
];
const TOUR = ['bhairab', 'dabu', 'pukhu', 'lyaku', 'uma', 'view', 'lohan', 'stupa'];
const walkers = ROSTER.map((r, i) => {
  const home = r.role === 'tourist' ? placeOf('stupa').node : Math.floor((i * 97 + 13) % NN);
  const [x, z] = nodeW(home);
  const p = makePerson({ ...r, x, z, k: K * (r.k || 1), spd: WALK });
  Object.assign(p, { home, node: home, path: [], pi: 0, dwell: rnd(0, 6), place: null, metres: 0, tour: 0, hidden: false, routeM: 0 });
  p.y = groundY(x, z);
  return p;
});
moveHooks.constrain = (p) => { if (!p.hidden) p.y = groundY(p.x, p.z); };

const stats = { metres: 0, visits: 0, bells: 0 };
function pickPlace(p) {
  if (p.role === 'priest') return placeOf(Math.random() < 0.75 ? 'bhairab' : 'uma');
  if (p.role === 'tourist') return placeOf(TOUR[p.tour++ % TOUR.length]);
  if (p.role === 'devotee') return p.sub.includes('Chilancho') ? placeOf(Math.random() < 0.7 ? 'stupa' : 'lohan') : pick(PLACES.filter((P) => P.pose === 'pray'));
  return Math.random() < 0.4 ? pick(PLACES) : { key: 'errand', name: 'an errand', node: Math.floor(Math.random() * NN), pose: 'idle' };
}
function setOff(p, P) {
  const r = route(p.node, P.node);
  Object.assign(p, { path: r.path, pi: 0, place: P, routeM: r.m, hidden: false });
  p.forcePose = null; p.faceLook = false;
  p.state = `Walking to ${P.name} (${Math.round(r.m)} m)`;
}
function walkerAI(p, h, night) {
  if (p.hidden) { if (!night && (p.dwell -= h) <= 0) { p.hidden = false; const [x, z] = nodeW(p.node); p.x = x; p.z = z; p.watch.x = x; p.watch.z = z; } else return; }
  if (p.pi < p.path.length) {
    const [x, z] = nodeW(p.path[p.pi]);
    go(p, x, z, 1);
    if (Math.hypot(p.x - x, p.z - z) < 0.3) {
      if (p.pi > 0) { const d = Math.hypot(GN[2 * p.path[p.pi]] - GN[2 * p.path[p.pi - 1]], GN[2 * p.path[p.pi] + 1] - GN[2 * p.path[p.pi - 1] + 1]); p.metres += d; stats.metres += d; }
      p.node = p.path[p.pi++];
      if (p.pi === p.path.length) arrive(p);
    }
    return;
  }
  if ((p.dwell -= h) > 0) return;
  if (night) {
    if (p.node === p.home && p.place && p.place.key === 'home') { p.hidden = true; p.y = -80; p.state = 'Asleep'; p.dwell = rnd(0, 20); return; }
    setOff(p, { key: 'home', name: 'home', node: p.home, pose: 'idle' });
    return;
  }
  setOff(p, pickPlace(p));
}
function arrive(p) {
  const P = p.place;
  p.dwell = P.key === 'errand' ? rnd(4, 10) : rnd(10, 22);
  if (P.x !== undefined) { look(p, wX(P.x), wZ(P.z), true); p.forcePose = P.pose === 'idle' ? null : P.pose; stats.visits++; }
  p.state = P.key === 'home' ? 'Home' : `At ${P.name}`;
  if (P.key === 'bhairab' && Math.random() < 0.5) ringBell();
}

/* ------------------------------------------------------------------ */
/* Temple bells                                                        */
/* ------------------------------------------------------------------ */
for (const b of bells) b.g.userData.live = true;
function ringBell() { const b = pick(bells); b.swing = 1; sfx.templeBell(); stats.bells++; }
function updateBells(dt, t) { for (const b of bells) { b.swing = Math.max(0, b.swing - dt * 0.4); b.g.rotation.x = Math.sin(t * 7) * 0.5 * b.swing; } }

/* ------------------------------------------------------------------ */
/* Measuring: click two points for straight, walking and height gaps   */
/* ------------------------------------------------------------------ */
const measure = { on: false, a: null, b: null, text: '' };
// Survey poles taller than the rooftops (16 m), so the tape between them is never hidden by houses
const POLE = 4;
const pin = (col) => { const g = group(0, 0, 0); g.visible = false; g.userData.live = true; box(0.14, POLE, 0.14, '#403a35', 0, POLE / 2, 0, g); box(0.8, 0.8, 0.8, col, 0, POLE + 0.2, 0, g); return g; };
const pins = [pin('#c45134'), pin('#388296')];
const tape = new THREE.Mesh(UNIT, lam('#c45134'));
tape.visible = false; scene.add(tape);
const _ta = new THREE.Vector3(), _tb = new THREE.Vector3(), _tz = new THREE.Vector3(0, 0, 1);
function measureClick(pt) {
  const P = [pt.x, groundY(pt.x, pt.z), pt.z];
  if (!measure.a || measure.b) { measure.a = P; measure.b = null; tape.visible = false; pins[1].visible = false; pins[0].position.set(...P); pins[0].visible = true; measure.text = ''; return; }
  measure.b = P; pins[1].position.set(...P); pins[1].visible = true;
  _ta.set(P[0], P[1] + POLE, P[2]); _tb.set(measure.a[0], measure.a[1] + POLE, measure.a[2]);
  const len = _ta.distanceTo(_tb);
  tape.scale.set(0.2, 0.2, len); tape.position.addVectors(_ta, _tb).multiplyScalar(0.5);
  tape.quaternion.setFromUnitVectors(_tz, _tb.sub(_ta).normalize()); tape.visible = true;
  const [ax, , az] = measure.a, mx = (v) => mX(v), mz = (v) => mZ(v);
  const flat = Math.hypot(P[0] - ax, P[2] - az) / U, rise = (P[1] - measure.a[1]) / U;
  const na = nearestNode(mx(ax), mz(az)), nb = nearestNode(mx(P[0]), mz(P[2]));
  const lane = route(na, nb).m + Math.hypot(GN[2 * na] - mx(ax), GN[2 * na + 1] - mz(az)) + Math.hypot(GN[2 * nb] - mx(P[0]), GN[2 * nb + 1] - mz(P[2]));
  measure.text = `${Math.round(flat)} m straight · ${Math.round(lane)} m by the lanes · ${rise >= 0 ? '+' : ''}${Math.round(rise)} m`;
  log('MEASURE', `${Math.round(flat)} m as the crow flies, about ${Math.round(lane)} m on foot by the lanes, ${Math.abs(Math.round(rise))} m ${rise >= 0 ? 'up' : 'down'}.`, 'hi');
}
