/* ------------------------------------------------------------------ */
/* The heritage walk: the lanes joining the six places in order (the   */
/* shortest walk on OSM's lane network), re-laid in detail as the      */
/* 2022 Mapillary lane photos show them - irregular grey stone flags   */
/* in mixed tones, lighter kerb stones along both edges and a dark     */
/* drain channel along one. Left out on the asphalt road and inside    */
/* the sites, which have their own paving.                             */
/* ------------------------------------------------------------------ */
const WALK_HALF = 1.5; // metres
const walkTex = surfaceTex(32, 48, (g) => {
  g.fillStyle = '#5c554e'; g.fillRect(0, 0, 32, 48); // the joints
  const tones = ['#b5ada4', '#cfc8c0', '#a49a8f', '#968e85', '#bfb6ac'];
  for (let y = 0, k = 0; y < 48; k++) { // rows of irregular flags, each row its own height
    const h = Math.min(5 + (k * 7) % 5, 48 - y);
    for (let x = 4, j = 0; x < 28; j++) {
      const w = Math.min(5 + ((k + j) * 5) % 6, 28 - x);
      g.fillStyle = tones[(k + j * 3) % tones.length]; g.fillRect(x, y + 1, w - 1, h - 1);
      x += w;
    }
    y += h;
  }
  g.fillStyle = '#e3ddd6'; g.fillRect(0, 0, 3, 48); g.fillRect(29, 0, 3, 48); // kerb stones
  g.fillStyle = '#968e85'; for (let y = 0; y < 48; y += 6) { g.fillRect(0, y, 3, 1); g.fillRect(29, y, 3, 1); }
  g.fillStyle = '#26221f'; g.fillRect(3, 0, 1, 48); // the drain channel
});
const walkRuns = (() => {
  const onRoad = (x, z) => _ribbons.asphalt.some(({ run, half }) => run.some((p) => Math.hypot(p[0] - x, p[1] - z) < half + 0.5));
  const seen = new Set(), runs = [];
  let run = [];
  const flush = () => { if (run.length > 1) runs.push({ run, half: WALK_HALF }); run = []; };
  for (let i = 0; i + 1 < FOCUS.length; i++) {
    const { path } = route(placeOf(FOCUS[i].key).node, placeOf(FOCUS[i + 1].key).node);
    for (let k = 0; k + 1 < path.length; k++) {
      const a = path[k], b = path[k + 1], id = Math.min(a, b) + ':' + Math.max(a, b);
      if (seen.has(id)) { flush(); continue; } // a stretch two legs share is laid once
      seen.add(id);
      const ax = GN[2 * a], az = GN[2 * a + 1], bx = GN[2 * b], bz = GN[2 * b + 1], n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az)));
      for (let j = run.length ? 1 : 0; j <= n; j++) { // every metre, like the lane runs
        const x = ax + (bx - ax) * j / n, z = az + (bz - az) * j / n;
        if (inAnySite(x, z) || onRoad(x, z)) flush(); else run.push([x, z]);
      }
    }
    flush();
  }
  return runs;
})();
const walkMesh = ribbonMesh(walkRuns, walkTex, 4, 0.045); // just above the lanes it re-lays
