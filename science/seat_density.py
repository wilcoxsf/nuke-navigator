"""Calibrates the seat detector. On the SHIPPED Oracle model (what the page draws; hard edges over 40 degrees plus open boundaries, the same set the page builds) every edge gets a local density: how many other edge midpoints lie
within 0.5 m. Seat rows are the densest geometry anywhere; lines (field boundaries, the wall, long structural edges) have few close neighbours. For several thresholds K it reports, by region, the share of edges flagged as dense:
  must NOT be flagged: field and infield materials, the outfield wall region (long edges), long edges (3 m or more) anywhere,
  should be flagged: the seats nearest the field (within 30 m of the plate, under 6 m high), the lower bowl, the upper deck seating,
  and measures the exempt zones (scoreboard pixels, Coke cluster) that are dense too and are protected by boxes, not by the threshold.
Output: science/seat_density.md."""
import numpy as np
import trimesh
from scipy.spatial import cKDTree

ROOT = "C:/Users/andrewwi/dev/nuke-navigator-new/"
out = []


def say(s=""):
    print(s, flush=True)
    out.append(s)


home = np.array([0.3, 1.0])
scene = trimesh.load(ROOT + "scratch/deq/shipped.glb", force="scene")
segs, mats = [], []
for g in scene.dump(concatenate=False):
    name = getattr(getattr(g.visual, "material", None), "name", "") or ""
    m = trimesh.Trimesh(vertices=g.vertices, faces=g.faces, process=True)
    if not len(m.faces):
        continue
    keep = np.degrees(m.face_adjacency_angles) > 40
    e = [m.vertices[m.face_adjacency_edges[keep]]]
    uniq, cnt = np.unique(m.edges_sorted, axis=0, return_counts=True)
    if (cnt == 1).any():
        e.append(m.vertices[uniq[cnt == 1]])
    s = np.concatenate(e)
    segs.append(s)
    mats += [name] * len(s)
S = np.concatenate(segs)
mats = np.array(mats)
L = np.linalg.norm(S[:, 1] - S[:, 0], axis=1)
ok = L > 1e-4
S, mats, L = S[ok], mats[ok], L[ok]
mid = S.mean(axis=1)
r = np.hypot(mid[:, 0] - home[0], mid[:, 2] - home[1])
b = np.degrees(np.arctan2(mid[:, 0] - home[0], -(mid[:, 2] - home[1])))
y = mid[:, 1]
t = cKDTree(mid)
cnt = np.array([len(x) - 1 for x in t.query_ball_point(mid, 0.5)])
say("# Seat detector calibration on the shipped model (23 Oct 2026): %d edges; neighbours within 0.5 m: median %d, 90th percentile %d, 99th percentile %d" % (len(S), np.median(cnt), np.percentile(cnt, 90), np.percentile(cnt, 99)))
gs = np.char.startswith(mats.astype(str), "SF_Greyscale")
reg = {
    "field and infield materials (must stay)": ~gs,
    "long edges, 3 m or more (must stay)": L >= 3,
    "outfield wall zone (r 105 to 130 m, y under 12 m, 3 m+ edges; must stay)": gs & (r > 100) & (r < 135) & (y < 12) & (L >= 3),
    "seats nearest the field (r under 30 m, under 6 m high; should be flagged)": gs & (r < 30) & (y < 6),
    "lower bowl first and third base sides (bearing 15 to 80 or -80 to -15, r 25 to 80, under 20 m)": gs & (np.abs(b) > 15) & (np.abs(b) < 80) & (r > 25) & (r < 80) & (y < 20),
    "upper deck seating (y 20 to 36 m, r under 110 m)": gs & (y > 20) & (y < 36) & (r < 110),
    "scoreboard pixels (r 145 to 160, y 15 to 60, |bearing| under 25; protected by a box)": gs & (r > 145) & (r < 160) & (y > 15) & (y < 60) & (np.abs(b) < 25),
    "Coke cluster box (x -75 to -40, z -150 to -118, y 7 to 23; protected by a box)": gs & (mid[:, 0] > -75) & (mid[:, 0] < -40) & (mid[:, 2] > -150) & (mid[:, 2] < -118) & (y > 7) & (y < 23),
}
for k in (6, 10, 14, 20, 30):
    say("\n## threshold K = %d or more neighbours within 0.5 m: flagged %d of %d edges (%.0f%%), %.0f%% of edge length" % (k, (cnt >= k).sum(), len(cnt), 100 * (cnt >= k).mean(), 100 * L[cnt >= k].sum() / L.sum()))
    for name, m in reg.items():
        if m.sum():
            say("  %-92s n %6d  flagged %5.1f%%" % (name, m.sum(), 100 * (cnt[m] >= k).mean()))
np.savez_compressed(ROOT + "data/derived/oracle/shipped_edges.npz", S=S.astype(np.float32), cnt=cnt.astype(np.int16), mats=mats)
open(ROOT + "science/seat_density.md", "w", encoding="utf-8").write("\n".join(out) + "\n")
