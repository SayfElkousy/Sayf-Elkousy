#!/usr/bin/env python3
"""
Bake Natural Earth 1:110m TopoJSON into assets/js/data/world-map.js:
two compact SVG path strings (land silhouette + interior country borders),
equirectangular, 1000 units wide, latitude 84 to -58. Only needed if you
want to change the map geometry — the generated file is committed.

    curl -LO https://cdn.jsdelivr.net/npm/world-atlas@2/land-110m.json
    curl -LO https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json
    python3 tools/bake_world_map.py            # run from the folder holding those two files
"""
import json, os, sys

W = 1000.0
LAT_TOP, LAT_BOT = 84.0, -58.0
K = W / 360.0
H = (LAT_TOP - LAT_BOT) * K


def decode(topo):
    sx, sy = topo["transform"]["scale"]
    tx, ty = topo["transform"]["translate"]
    arcs = []
    for arc in topo["arcs"]:
        x = y = 0
        pts = []
        for dx, dy in arc:
            x += dx; y += dy
            pts.append((x * sx + tx, y * sy + ty))
        arcs.append(pts)
    return arcs


def proj(lon, lat):
    return ((lon + 180) * K, (LAT_TOP - lat) * K)


def arc_pts(arcs, i):
    return arcs[i] if i >= 0 else list(reversed(arcs[~i]))


def ring(arcs, idxs):
    pts = []
    for i in idxs:
        p = arc_pts(arcs, i)
        pts.extend(p if not pts else p[1:])
    return pts


def wrapped(pts):
    """Rings that cross the antimeridian jump from -180 to +180 and would
    draw a line across the whole map. Unwrap them and emit two copies
    (east and west of the seam); the off-map halves are clipped."""
    if not any(abs(b[0] - a[0]) > 180 for a, b in zip(pts, pts[1:])):
        return [pts]
    un, off, prev = [], 0.0, pts[0][0]
    for lon, lat in pts:
        if lon - prev > 180: off -= 360      # stepped west across the seam
        elif prev - lon > 180: off += 360    # stepped east across the seam
        prev = lon
        un.append((lon + off, lat))
    # The continuous ring pokes past ±180 on one side; a copy shifted by
    # 360° covers the other side. Off-map parts are clipped by the viewBox.
    shift = -360 if max(x for x, _ in un) > 180 else 360
    return [un, [(lon + shift, lat) for lon, lat in un]]


def fmt(v):
    s = f"{v:.1f}"
    return s[:-2] if s.endswith(".0") else s


def path_of(pts, close):
    out, last = [], None
    for lon, lat in pts:
        x, y = proj(lon, lat)
        q = (round(x, 1), round(y, 1))
        if q == last:
            continue
        out.append(q); last = q
    if len(out) < 2:
        return ""
    d = "M" + fmt(out[0][0]) + " " + fmt(out[0][1])
    px, py = out[0]
    for x, y in out[1:]:
        d += "l" + fmt(x - px) + " " + fmt(y - py)
        px, py = x, y
    return d + ("z" if close else "")


land_t = json.load(open("land-110m.json"))
arcs = decode(land_t)
land = []
for g in land_t["objects"]["land"]["geometries"]:
    polys = g["arcs"] if g["type"] == "MultiPolygon" else [g["arcs"]]
    for poly in polys:
        outer = ring(arcs, poly[0])
        if max(lat for _, lat in outer) < LAT_BOT:  # Antarctica etc.
            continue
        for r in poly:
            for pts in wrapped(ring(arcs, r)):
                land.append(path_of(pts, True))
land_d = "".join(land)

c_t = json.load(open("countries-110m.json"))
carcs = decode(c_t)
use = {}
for gi, g in enumerate(c_t["objects"]["countries"]["geometries"]):
    polys = g["arcs"] if g["type"] == "MultiPolygon" else [g["arcs"]] if g["type"] == "Polygon" else []
    for poly in polys:
        for r in poly:
            for i in r:
                use.setdefault(i if i >= 0 else ~i, set()).add(gi)
borders = []
for i, gs in use.items():
    if len(gs) > 1:
        pts = carcs[i]
        if max(lat for _, lat in pts) < LAT_BOT:
            continue
        for part in wrapped(pts):
            borders.append(path_of(part, False))
borders_d = "".join(borders)

src = f"""/* ==========================================================================
   WORLD MAP GEOMETRY — generated, not hand-edited.
   Natural Earth 1:110m land + interior country borders (public domain),
   via world-atlas@2. Equirectangular, {int(W)} units wide, latitude
   {LAT_TOP:g}° to {LAT_BOT:g}° (Antarctica dropped). Keep `project()` in
   components/travel-map.js in sync with these constants.
   ========================================================================== */

export const WORLD = {{
  width: {int(W)},
  height: {H:.2f},
  latTop: {LAT_TOP:g},
  land: '{land_d}',
  borders: '{borders_d}',
}};
"""
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets", "js", "data", "world-map.js")
open(OUT, "w").write(src)
print(len(src), "bytes;", len(land), "land rings;", len(borders), "border arcs")
