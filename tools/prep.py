"""Turn the OSM export and SRTM heights into src/mapdata.js for the Kirtipur map diorama.

usage: python3 tools/prep.py ../kirtipur-hill/ref/kirtipur_hill.osm
Coordinates are metres from Bagh Bhairab: x east, z south. Heights are metres above the board base.
Elevations come from opentopodata.org (SRTM 30 m) and are cached in tools/elev.json.
Building heights: tools/ghsl.json is the GHSL average net building height (GHS-BUILT-H ANBH E2018, 3 arcsec,
tile R7_C27 from jeodpp.jrc.ec.europa.eu, (c) European Union) cropped to the board. Each building gets the
height of the GHSL cell it sits in, varied by footprint: small plots lower, large footprints taller.
Mapillary street photos (tools/mapillary.py -> tools/mapillary_heights.json, run after a first prep.py) then
check it: the photos show mostly 4-5 storeys, rarely over 6, so the GHSL figure is scaled by 0.9 and capped at
6 storeys, and a building is never lower than its Mapillary measure.
"""
import json, math, os, subprocess, sys, time
import xml.etree.ElementTree as ET

LAT0, LON0 = 27.67943, 85.27652          # Bagh Bhairab
MX = 111320 * math.cos(math.radians(LAT0)); MZ = 110574
CORE = [-240, 200, -130, 330]             # old town core (metres, clear on load)
X0, X1, Z0, Z1 = -840, 1120, -1040, 1160  # full Kirtipur board (metres)
STEP = 40                                 # elevation sample spacing, metres
HERE = os.path.dirname(os.path.abspath(__file__))

def xy(lat, lon): return ((lon - LON0) * MX, -(lat - LAT0) * MZ)
def ll(x, z): return (LAT0 - z / MZ, LON0 + x / MX)
inside = lambda x, z: X0 <= x <= X1 and Z0 <= z <= Z1

def elevations():
    cache = os.path.join(HERE, 'elev.json')
    nx, nz = (X1 - X0) // STEP + 1, (Z1 - Z0) // STEP + 1
    if os.path.exists(cache):
        E = json.load(open(cache))
        if E.get('x0') == X0 and E.get('z0') == Z0 and E.get('step') == STEP and E.get('nx') == nx and E.get('nz') == nz:
            return E
    pts = [ll(X0 + i * STEP, Z0 + j * STEP) for j in range(nz) for i in range(nx)]
    h = []
    for k in range(0, len(pts), 100):
        q = '|'.join(f'{a:.6f},{b:.6f}' for a, b in pts[k:k + 100])
        # curl, not urllib: the system curl has working certificates where some Python installs do not
        r = json.loads(subprocess.run(['curl', '-s', '-m', '60', f'https://api.opentopodata.org/v1/srtm30m?locations={q}'], capture_output=True, check=True).stdout)
        h += [p['elevation'] for p in r['results']]
        time.sleep(1.2)
    E = {'x0': X0, 'z0': Z0, 'step': STEP, 'nx': nx, 'nz': nz, 'h': h}
    json.dump(E, open(cache, 'w'))
    return E

def ghsl_height(x, z):
    G = json.load(open(os.path.join(HERE, 'ghsl.json'))) if not hasattr(ghsl_height, 'G') else ghsl_height.G
    ghsl_height.G = G
    lat, lon = ll(x, z)
    # bilinear between cell centres
    fx = (lon - G['lon0']) / G['step'] - 0.5; fz = (G['lat0'] - lat) / G['step'] - 0.5
    i = max(0, min(G['w'] - 2, int(fx))); j = max(0, min(G['h'] - 2, int(fz))); u = min(1, max(0, fx - i)); v = min(1, max(0, fz - j))
    V = G['v']
    return (V[j][i] * (1 - u) + V[j][i + 1] * u) * (1 - v) + (V[j + 1][i] * (1 - u) + V[j + 1][i + 1] * u) * v

MLY = json.load(open(os.path.join(HERE, 'mapillary_heights.json'))) if os.path.exists(os.path.join(HERE, 'mapillary_heights.json')) else {}

def building_height(bid, pts, levels):
    """Metres: OSM levels when mapped, else GHSL scaled by plot size and checked against Mapillary, whole storeys."""
    if levels: return levels * 3.0
    cx = sum(p[0] for p in pts) / len(pts); cz = sum(p[1] for p in pts) / len(pts)
    area = abs(sum(pts[k][0] * pts[(k + 1) % len(pts)][1] - pts[(k + 1) % len(pts)][0] * pts[k][1] for k in range(len(pts)))) / 2
    h = ghsl_height(cx, cz) * min(1.25, max(0.55, (area / 60) ** 0.25))  # a 60 m2 plot gets the local average
    h *= 0.85 + ((bid * 2654435761) % 1000) / 1000 * 0.3                 # +-15 % between neighbours
    storeys = max(2, min(6, round(h * 0.9 / 3.0)))                        # calibrated on the Mapillary photos
    m = MLY.get(str(bid))
    if m is not None:
        storeys = max(storeys, math.ceil(m / 3.0 - 0.2))                  # never lower than what the photos saw
    return storeys * 3.0

def main(osm):
    root = ET.parse(osm).getroot()
    nodes = {n.get('id'): xy(float(n.get('lat')), float(n.get('lon'))) for n in root.iter('node')}
    tags = lambda e: {t.get('k'): t.get('v') for t in e.findall('tag')}
    r1 = lambda v: round(v, 1)
    B, R, W, G, C, graph_ways, SH, POI = [], [], [], [], [], [], [], []
    # Point features (shops, cafes, monuments, taps, named toles) for the street detail
    for n in root.iter('node'):
        t = tags(n)
        if not t: continue
        x, z = xy(float(n.get('lat')), float(n.get('lon')))
        if not inside(x, z): continue
        kind = t.get('shop') and 'shop' or t.get('amenity') or t.get('historic') or t.get('man_made') or t.get('tourism') or (t.get('place') and 'tole') or ('tole' if t.get('name') and len(t) <= 3 else None)
        if kind: POI.append({'x': r1(x), 'z': r1(z), 't': kind, 'n': t.get('name:en') or t.get('name') or ''})
    for w in root.iter('way'):
        t = tags(w)
        ids = [nd.get('ref') for nd in w.findall('nd') if nd.get('ref') in nodes]
        pts = [nodes[i] for i in ids]
        if len(pts) < 2: continue
        cx = sum(p[0] for p in pts) / len(pts); cz = sum(p[1] for p in pts) / len(pts)
        flat = [r1(v) for p in pts for v in p]
        if 'building' in t or 'building:part' in t:
            if inside(cx, cz) and len(pts) > 3:
                lv = t.get('building:levels')
                lvn = int(float(lv)) if lv and lv.replace('.', '').isdigit() else 0
                pp = pts[:-1] if pts[0] == pts[-1] else pts
                B.append({'id': int(w.get('id')), 'p': flat, 'h': building_height(int(w.get('id')), pp, lvn),
                          'k': t.get('building') if t.get('building') not in (None, 'yes') else t.get('tower:type') or t.get('amenity') or ''})
        elif 'highway' in t:
            if any(inside(*p) for p in pts):
                wd = t.get('width', '')
                R.append({'t': t['highway'], 'p': flat, 's': t.get('surface', ''), 'w': float(wd) if wd.replace('.', '').isdigit() else 0})
                graph_ways.append(ids)
        elif t.get('natural') == 'water' or 'water' in t:
            if inside(cx, cz): W.append(flat)
        elif t.get('landuse') in ('forest', 'grass', 'meadow', 'farmland', 'orchard') or t.get('natural') in ('wood', 'scrub') or t.get('leisure') in ('park', 'garden'):
            if any(inside(*p) for p in pts): G.append({'t': t.get('landuse') or t.get('natural') or t.get('leisure'), 'p': flat})
        elif t.get('amenity') == 'shelter':
            if inside(cx, cz): SH.append({'n': t.get('name') or '', 'p': flat})
        elif t.get('leisure') == 'common' or t.get('amenity') in ('place_of_worship', 'school'):
            if inside(cx, cz): C.append({'t': t.get('leisure') or t.get('amenity'), 'n': t.get('name:en') or t.get('name'), 'p': flat})
    # Walking graph: every highway node inside the board, largest connected piece only
    adj = {}
    for ids in graph_ways:
        for a, b in zip(ids, ids[1:]):
            if inside(*nodes[a]) and inside(*nodes[b]):
                adj.setdefault(a, set()).add(b); adj.setdefault(b, set()).add(a)
    seen, best = set(), []
    for s in adj:
        if s in seen: continue
        comp, stack = [], [s]
        seen.add(s)
        while stack:
            u = stack.pop(); comp.append(u)
            for v in adj[u]:
                if v not in seen: seen.add(v); stack.append(v)
        if len(comp) > len(best): best = comp
    idx = {n: i for i, n in enumerate(best)}
    N = [r1(v) for n in best for v in nodes[n]]
    Ed = sorted({(min(idx[a], idx[b]), max(idx[a], idx[b])) for a in best for b in adj[a] if b in idx})
    E = elevations()
    core_elev_path = os.path.join(HERE, 'elev_core.json')
    EC = json.load(open(core_elev_path)) if os.path.exists(core_elev_path) else None
    data = {'bounds': [X0, X1, Z0, Z1], 'core': CORE, 'elev': E, 'elevCore': EC, 'buildings': B, 'roads': R, 'water': W, 'green': G, 'areas': C, 'shelters': SH, 'pois': POI,
            'graph': {'n': N, 'e': [v for e in Ed for v in e]}}
    out = os.path.join(HERE, '..', 'src', 'mapdata.js')
    with open(out, 'w') as f:
        f.write('/* Generated by tools/prep.py from OpenStreetMap (ODbL, (c) OpenStreetMap contributors) and SRTM 30 m. Do not edit. */\n')
        f.write('const MAP = ' + json.dumps(data, separators=(',', ':')) + ';\n')
    print(f'pois {len(POI)} shelters {len(SH)}'); print(f'buildings {len(B)} roads {len(R)} water {len(W)} green {len(G)} areas {len(C)} graph {len(best)} nodes {len(Ed)} edges; '
          f'elev {min(E["h"])}..{max(E["h"])} m; {os.path.getsize(out) // 1024} KB')

if __name__ == '__main__':
    main(sys.argv[1])
