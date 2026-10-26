"""How far does the drawn crest line sit from the model surface directly under it? (24 Oct 2026, after two of Andrew's screengrabs showed the orange floating.)
A vertical ray at each crest sample, against every triangle of the field, padding and greyscale shells; the hit nearest in height to the line is the surface the line is meant to sit on. Prints the gap (line minus surface) by 5 degree sector and lists the worst samples."""
import json

import numpy as np

ROOT = "C:/Users/andrewwi/dev/nuke-navigator-new/"
c = json.load(open(ROOT + "apps/web/public/oracle_crest.json"))
th, rad, ht, home = np.array(c["bearing"]), np.array(c["radius"]), np.array(c["height"]), np.array(c["home"])


def load(file, mats):
    out = []
    g = json.load(open(ROOT + "data/derived/oracle/" + file))
    for m, v in g.items():
        if m in mats:
            V = np.array(v["verts"], np.float32)
            out.append(V[np.array(v["tris"], np.int64).reshape(-1, 3)])
    return np.concatenate(out)


T = np.concatenate([load("sf_prims.json", ("SF_Field", "Ads_Padding")), load("sf_grey.json", ("SF_Greyscale",))])
# keep triangles that can matter: centroid within 25 m of the crest radius range
cx, cz = T[:, :, 0].mean(1), T[:, :, 2].mean(1)
rc = np.hypot(cx - home[0], cz - home[1])
T = T[(rc > rad.min() - 20) & (rc < rad.max() + 20)]
print("triangles kept", len(T))
X, Z = T[:, :, 0], T[:, :, 2]
xmin, xmax, zmin, zmax = X.min(1), X.max(1), Z.min(1), Z.max(1)


def hits(x, z):
    m = (xmin <= x) & (xmax >= x) & (zmin <= z) & (zmax >= z)
    idx = np.flatnonzero(m)
    out = []
    for i in idx:
        (x0, y0, z0), (x1, y1, z1), (x2, y2, z2) = T[i]
        d = (z1 - z2) * (x0 - x2) + (x2 - x1) * (z0 - z2)
        if abs(d) < 1e-9:
            continue
        a = ((z1 - z2) * (x - x2) + (x2 - x1) * (z - z2)) / d
        b = ((z2 - z0) * (x - x2) + (x0 - x2) * (z - z2)) / d
        g = 1 - a - b
        if a >= -1e-6 and b >= -1e-6 and g >= -1e-6:
            out.append(a * y0 + b * y1 + g * y2)
    return np.array(out)


gap, nh = np.full(len(th), np.nan), np.zeros(len(th), int)
for i in range(len(th)):
    t = np.radians(th[i])
    x, z = home[0] + rad[i] * np.sin(t), home[1] - rad[i] * np.cos(t)
    h = hits(x, z)
    nh[i] = len(h)
    if len(h):
        gap[i] = ht[i] - h[np.argmin(np.abs(h - ht[i]))]
print("samples with no surface under them:", int((nh == 0).sum()), "of", len(th))
print("sector | median gap | 90th percentile of |gap| | worst (m)")
for lo in range(-45, 45, 5):
    m = (th >= lo) & (th < lo + 5) & np.isfinite(gap)
    g = gap[m]
    print("%+3d..%+3d | %+.2f | %.2f | %+.2f" % (lo, lo + 5, np.median(g), np.percentile(np.abs(g), 90), g[np.argmax(np.abs(g))]))
bad = np.flatnonzero(np.isfinite(gap) & (np.abs(gap) > 0.3))
print("samples more than 0.3 m from the surface under them:", len(bad), "of", len(th))
print("bearings of the worst 25:", ", ".join("%.2f(%+.2f)" % (th[i], gap[i]) for i in bad[np.argsort(-np.abs(gap[bad]))][:25]))
