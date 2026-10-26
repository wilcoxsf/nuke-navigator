"""Where does the wireframe's density come from? Counts the page's heavy (thick) edge set by height above the field and by length, and estimates how much of it is seat-row repetition (many nearly parallel edges stacked
closer than a pixel or two at the default camera), using the dequantized shipped model. Read-only analysis for choosing a cleaner stands treatment. Output: science/wire_density.md."""
import numpy as np
import trimesh

ROOT = "C:/Users/andrewwi/dev/nuke-navigator-new/"
out = []


def say(s=""):
    print(s, flush=True)
    out.append(s)


scene = trimesh.load(ROOT + "scratch/deq/shipped.glb", force="scene")
segs = []
for g in scene.dump(concatenate=False):
    m = trimesh.Trimesh(vertices=g.vertices, faces=g.faces, process=True)
    if not len(m.faces):
        continue
    keep = np.degrees(m.face_adjacency_angles) > 78
    e = [m.vertices[m.face_adjacency_edges[keep]]]
    uniq, cnt = np.unique(m.edges_sorted, axis=0, return_counts=True)
    if (cnt == 1).any():
        e.append(m.vertices[uniq[cnt == 1]])
    segs.append(np.concatenate(e))
S = np.concatenate(segs)
mid = S.mean(axis=1)
ln = np.linalg.norm(S[:, 1] - S[:, 0], axis=1)
home = np.array([0.3, 1.0])
r = np.hypot(mid[:, 0] - home[0], mid[:, 2] - home[1])
y = mid[:, 1]
heavy = (y < 12) & (r < 150)
say("# Where the density comes from (23 Oct 2026): hard edges over 78 degrees of the shipped Oracle model, %d segments; heavy set (below 12 m, within 150 m of the plate) %d" % (len(S), heavy.sum()))
say("\n## Heavy set by height above the ground (m)")
for lo, hi in ((-5, 0.6), (0.6, 2), (2, 3.5), (3.5, 6), (6, 9), (9, 12)):
    m = heavy & (y >= lo) & (y < hi)
    say("  %4.1f to %4.1f m: %6d segments (%.0f%%), total length %6.0f m, median length %.2f m" % (lo, hi, m.sum(), 100 * m.sum() / heavy.sum(), ln[m].sum(), np.median(ln[m]) if m.any() else 0))
say("\n## Heavy set by segment length")
for lo, hi in ((0, 0.3), (0.3, 1), (1, 3), (3, 10), (10, 1000)):
    m = heavy & (ln >= lo) & (ln < hi)
    say("  %5.1f to %6.1f m: %6d segments (%.0f%%), total length %6.0f m" % (lo, hi, m.sum(), 100 * m.sum() / heavy.sum(), ln[m].sum()))
# row repetition: quantize each heavy segment's height to 0.15 m and count how many share a bin per 10 degrees of bearing (seat rows stack tightly in height)
b = np.degrees(np.arctan2(mid[:, 0] - home[0], -(mid[:, 2] - home[1])))
hb = np.floor(y / 0.15).astype(int)
key = (np.floor(b / 10).astype(int) * 1000 + np.floor(r / 5).astype(int))
import collections
stack = collections.Counter(zip(key[heavy].tolist(), hb[heavy].tolist()))
per_cell = collections.defaultdict(set)
for (k, h) in stack:
    per_cell[k].add(h)
levels = np.array([len(v) for v in per_cell.values()])
say("\n## Stacked rows: in each 10 degree by 5 m cell of the heavy set, how many distinct 0.15 m height levels carry an edge")
say("  cells %d; cells with 8 or more distinct levels (closely stacked rows): %d (%.0f%% of cells)" % (len(levels), (levels >= 8).sum(), 100 * (levels >= 8).mean()))
dense = np.array([k for k, v in per_cell.items() if len(v) >= 8])
inb = np.isin(key, dense) & heavy
say("  heavy segments inside those stacked cells: %d (%.0f%% of the heavy set), at heights %.1f to %.1f m (median %.1f)" % (inb.sum(), 100 * inb.sum() / heavy.sum(), np.percentile(y[inb], 5), np.percentile(y[inb], 95), np.median(y[inb])))
say("\n## What each treatment would remove (segment counts, heavy set)")
say("  heavy only below 3.5 m (field level, wall, dugouts): keeps %d, moves %d to the faint set" % ((heavy & (y < 3.5)).sum(), (heavy & (y >= 3.5)).sum()))
say("  heavy only below 2 m: keeps %d" % (heavy & (y < 2)).sum())
say("  drop heavy edges shorter than 1 m: removes %d (%.0f%%)" % ((heavy & (ln < 1)).sum(), 100 * (heavy & (ln < 1)).sum() / heavy.sum()))
say("  every other seat row (keep a stacked-cell edge only when its 0.3 m height level is even): removes about %d" % int(0.5 * inb.sum()))
open(ROOT + "science/wire_density.md", "w", encoding="utf-8").write("\n".join(out) + "\n")
