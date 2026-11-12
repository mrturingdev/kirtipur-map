"""Building height evidence from Mapillary street photos, for prep.py.

usage: python3 tools/mapillary.py      (needs tools/.mapillary_token, a Mapillary client token)
Writes tools/mapillary_heights.json: {osm_building_id: metres} measured from Mapillary's SfM point clouds
(images and reconstructions (c) Mapillary contributors, CC BY-SA 4.0).

Each reconstruction gives facade points and camera centres in metres. A building's measure is the 95th
percentile height of the points within 1.2 m of its OSM outline, above street level (cameras minus 1.6 m).
In narrow lanes the phones do not see the upper floors, so these are lower bounds there; in open squares,
where the whole facade is in view, they are close to the real height. prep.py uses them that way.
"""
import json, math, os, subprocess, sys, zlib
from statistics import median

HERE = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(HERE, '.mapillary_cache')  # downloaded reconstructions (not needed once the json exists)
LAT0, LON0 = 27.67943, 85.27652
MX = 111320 * math.cos(math.radians(LAT0)); MZ = 110574
X0, X1, Z0, Z1 = -240, 200, -130, 330
EYE, NEAR = 1.6, 1.2

def get(url, token, binary=False):
    args = ['curl', '-s', '-m', '120', url] + (['-H', f'Authorization: OAuth {token}'] if token else [])
    out = subprocess.run(args, capture_output=True, check=True).stdout
    return out if binary else json.loads(out)

def rodrigues(r):
    th = math.sqrt(sum(v * v for v in r))
    if th < 1e-12: return [[1, 0, 0], [0, 1, 0], [0, 0, 1]]
    x, y, z = (v / th for v in r); c, s = math.cos(th), math.sin(th); C = 1 - c
    return [[c + x * x * C, x * y * C - z * s, x * z * C + y * s], [y * x * C + z * s, c + y * y * C, y * z * C - x * s], [z * x * C - y * s, z * y * C + x * s, c + z * z * C]]

def reconstructions(token):
    os.makedirs(CACHE, exist_ok=True)
    lon = lambda x: LON0 + x / MX; lat = lambda z: LAT0 - z / MZ
    bbox = f'{lon(X0):.5f},{lat(Z1):.5f},{lon(X1):.5f},{lat(Z0):.5f}'
    imgs = get(f'https://graph.mapillary.com/images?bbox={bbox}&fields=id,sfm_cluster&limit=2000', token)['data']
    urls = {i['sfm_cluster']['id']: i['sfm_cluster']['url'] for i in imgs if 'url' in i.get('sfm_cluster', {})}
    print(f'{len(imgs)} images, {len(urls)} reconstructions')
    out = []
    for cid, url in urls.items():
        f = os.path.join(CACHE, cid + '.bin')
        if not os.path.exists(f): open(f, 'wb').write(get(url, None, binary=True))
        try: recs = json.loads(zlib.decompress(open(f, 'rb').read()))
        except Exception: continue
        for r in recs:
            ref = r['reference_lla']; ox = (ref['longitude'] - LON0) * MX; oz = -(ref['latitude'] - LAT0) * MZ
            pts = [(ox + p['coordinates'][0], oz - p['coordinates'][1], p['coordinates'][2]) for p in r['points'].values()]
            cams = []
            for s in r['shots'].values():
                R = rodrigues(s['rotation']); t = s['translation']
                c = [-(R[0][i] * t[0] + R[1][i] * t[1] + R[2][i] * t[2]) for i in range(3)]
                cams.append((ox + c[0], oz - c[1], c[2]))
            out.append((pts, cams))
    return out

def seg_d(px, pz, ax, az, bx, bz):
    dx, dz = bx - ax, bz - az; L = dx * dx + dz * dz
    t = 0 if L == 0 else max(0, min(1, ((px - ax) * dx + (pz - az) * dz) / L))
    return math.hypot(px - ax - t * dx, pz - az - t * dz)

def inside(f, x, z):
    c, n = False, len(f) // 2
    for a in range(n):
        b = (a - 1) % n
        if (f[2 * a + 1] > z) != (f[2 * b + 1] > z) and x < (f[2 * b] - f[2 * a]) * (z - f[2 * a + 1]) / (f[2 * b + 1] - f[2 * a + 1]) + f[2 * a]: c = not c
    return c

def measure(buildings, recs):
    cell, grid = 10, {}
    for ri, (pts, _) in enumerate(recs):
        for x, z, y in pts: grid.setdefault((int(x // cell), int(z // cell)), []).append((x, z, y, ri))
    out = {}
    for bid, f in buildings:
        xs, zs = f[0::2], f[1::2]; near = {}
        for gx in range(int((min(xs) - NEAR) // cell), int((max(xs) + NEAR) // cell) + 1):
            for gz in range(int((min(zs) - NEAR) // cell), int((max(zs) + NEAR) // cell) + 1):
                for x, z, y, ri in grid.get((gx, gz), ()):
                    if inside(f, x, z) or min(seg_d(x, z, f[k], f[k + 1], f[k + 2], f[k + 3]) for k in range(0, len(f) - 2, 2)) < NEAR:
                        near.setdefault(ri, []).append((x, z, y))
        hs = []
        for ri, P in near.items():
            if len(P) < 25: continue
            cx = sum(p[0] for p in P) / len(P); cz = sum(p[1] for p in P) / len(P)
            cams = [c[2] for c in recs[ri][1] if math.hypot(c[0] - cx, c[1] - cz) < 25]
            if len(cams) < 2: continue
            ground = median(cams) - EYE
            ys = sorted(p[2] - ground for p in P)
            top = ys[int(len(ys) * 0.95) - 1]
            if 2.5 <= top <= 35: hs.append(top)
        if hs: out[str(bid)] = round(median(hs), 1)
    return out

if __name__ == '__main__':
    token = open(os.path.join(HERE, '.mapillary_token')).read().strip()
    data = open(os.path.join(HERE, '..', 'src', 'mapdata.js')).read()
    M = json.loads(data[data.index('{'):data.rindex('}') + 1])
    res = measure([(b['id'], b['p']) for b in M['buildings']], reconstructions(token))
    json.dump(res, open(os.path.join(HERE, 'mapillary_heights.json'), 'w'), indent=0, sort_keys=True)
    print(f'measured {len(res)} of {len(M["buildings"])} buildings -> tools/mapillary_heights.json')
