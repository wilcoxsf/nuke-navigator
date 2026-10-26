"""What are the Oracle model's tiny edges, structurally? Hard edges (angle over 40 degrees, plus open boundaries) of the ORIGINAL model, chained end to end where they meet and turn by less than 20 degrees. If the tiny edges are tessellated row lines,
chains will be long (many metres) and horizontal and stack at the row pitch; if they are individual seat shapes, chains will stay short and point in all directions.
Reports: chain-length distribution; orientation (horizontal share); in a sample of the lower bowl (bearing +25 to +40, 30 to 70 m from the plate) the chain count, lengths and the vertical spacing of horizontal chains; the same for the scoreboard
region (r 145 to 160 m, y 15 to 60) and the Coke-corner box (x -75 to -40, z -150 to -118, y 7 to 23). Saves the chains for the baking step: data/derived/oracle/chains.npz. Output: science/edge_chains.md."""
import collections

import numpy as np
import trimesh

ROOT = "C:/Users/andrewwi/dev/nuke-navigator-new/"
out = []


def say(s=""):
    print(s, flush=True)
    out.append(s)


home = np.array([0.3, 1.0])
scene = trimesh.load(ROOT + "data/raw/drive/Stadium_SF.glb", force="scene")
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
say("# Edge structure of the original Oracle model (23 Oct 2026): %d hard edges (over 40 degrees, plus boundaries), total length %.0f m" % (len(S), L.sum()))
D = (S[:, 1] - S[:, 0]) / L[:, None]
# chain edges: quantize endpoints to 5 mm, link edges at shared endpoints that continue within 20 degrees
Q = np.round(S / 0.005).astype(np.int64)
key = lambda p: (p[0], p[1], p[2])
ends = collections.defaultdict(list)
for i in range(len(S)):
    ends[key(Q[i, 0])].append((i, 0))
    ends[key(Q[i, 1])].append((i, 1))
parent = np.arange(len(S))


def find(x):
    while parent[x] != x:
        parent[x] = parent[parent[x]]
        x = parent[x]
    return x


cos20 = np.cos(np.radians(20))
for k, lst in ends.items():
    if len(lst) == 2:
        (i, ei), (j, ej) = lst
        di = D[i] if ei == 1 else -D[i]  # direction leaving the shared point, along edge i's travel into the point
        dj = D[j] if ej == 0 else -D[j]
        if i != j and float(di @ dj) > cos20 and mats[i] == mats[j]:
            parent[find(i)] = find(j)
roots = np.array([find(i) for i in range(len(S))])
chain_len = np.bincount(roots, weights=L, minlength=len(S))
chain_n = np.bincount(roots, minlength=len(S))
cl = chain_len[roots]
say("\n## Chain length distribution (edges joined end to end where they continue within 20 degrees)")
chains = np.unique(roots)
cls_ = chain_len[chains]
say("  chains %d; by chain length: under 0.5 m %d (%.0f%% of chains, %.1f%% of edge length), 0.5 to 2 m %d (%.1f%% of length), 2 to 10 m %d (%.1f%% of length), 10 m and over %d (%.1f%% of length)" % (
    len(chains), (cls_ < 0.5).sum(), 100 * (cls_ < 0.5).mean(), 100 * cls_[cls_ < 0.5].sum() / L.sum(), ((cls_ >= 0.5) & (cls_ < 2)).sum(), 100 * cls_[(cls_ >= 0.5) & (cls_ < 2)].sum() / L.sum(),
    ((cls_ >= 2) & (cls_ < 10)).sum(), 100 * cls_[(cls_ >= 2) & (cls_ < 10)].sum() / L.sum(), (cls_ >= 10).sum(), 100 * cls_[cls_ >= 10].sum() / L.sum()))
short = L < 0.3
say("  edges shorter than 0.3 m: %d; the share of them that sit inside a chain of 3 m or more: %.1f%% (tessellated lines) versus staying in chains under 1 m: %.1f%% (stray detail)" % (short.sum(), 100 * np.mean(cl[short] >= 3), 100 * np.mean(cl[short] < 1)))
mid = S.mean(axis=1)
r = np.hypot(mid[:, 0] - home[0], mid[:, 2] - home[1])
b = np.degrees(np.arctan2(mid[:, 0] - home[0], -(mid[:, 2] - home[1])))
horiz = np.abs(D[:, 1]) < 0.17  # within 10 degrees of horizontal


def region(name, m):
    n = m.sum()
    if n == 0:
        say("\n## %s: no edges (check the region)" % name)
        return
    ch = np.unique(roots[m])
    lens = chain_len[ch]
    say("\n## %s: %d edges, %d chains, edge length %.0f m, horizontal share of length %.0f%%, edges under 0.3 m %.0f%%" % (name, n, len(ch), L[m].sum(), 100 * L[m & horiz].sum() / max(L[m].sum(), 1e-9), 100 * np.mean(L[m] < 0.3)))
    say("  chain lengths: median %.1f m, 90th percentile %.1f m, share of edge length in chains of 3 m or more %.0f%%" % (np.median(lens), np.percentile(lens, 90), 100 * L[m][cl[m] >= 3].sum() / max(L[m].sum(), 1e-9)))
    hy = []
    for c in ch:
        mm = (roots == c) & m
        if chain_len[c] >= 2 and horiz[mm].mean() > 0.8:
            hy.append(float(mid[mm, 1].mean()))
    hy = np.sort(hy)
    if len(hy) > 3:
        dd = np.diff(hy)
        say("  horizontal chains of 2 m or more: %d; vertical spacing between neighbours: median %.2f m, 10th to 90th percentile %.2f to %.2f m" % (len(hy), np.median(dd[dd > 0.02]) if (dd > 0.02).any() else 0, np.percentile(dd[dd > 0.02], 10) if (dd > 0.02).any() else 0, np.percentile(dd[dd > 0.02], 90) if (dd > 0.02).any() else 0))


gs = np.char.startswith(mats.astype(str), "SF_Greyscale")
say("\nmaterials: " + ", ".join("%s %d" % (k, v) for k, v in collections.Counter(mats.tolist()).most_common(6)))
say("structure edges: bearing %.0f to %.0f, distance from the plate %.0f to %.0f m (5th to 95th percentile %.0f to %.0f), height %.1f to %.1f m" % (b[gs].min(), b[gs].max(), r[gs].min(), r[gs].max(), np.percentile(r[gs], 5), np.percentile(r[gs], 95), mid[gs, 1].min(), mid[gs, 1].max()))
region("lower bowl sample (bearing +25 to +40, 30 to 70 m from the plate, structure material)", gs & (b > 25) & (b < 40) & (r > 25) & (r < 75) & (mid[:, 1] < 25))
region("seats nearest the field (within 30 m of the plate, structure material, under 6 m high)", gs & (r < 30) & (mid[:, 1] < 6))
region("scoreboard region (145 to 160 m from the plate, 15 to 60 m high, bearing -25 to +25)", gs & (r > 145) & (r < 160) & (mid[:, 1] > 15) & (mid[:, 1] < 60) & (np.abs(b) < 25))
region("Coke-corner box (x -75 to -40, z -150 to -118, y 7 to 23)", gs & (mid[:, 0] > -75) & (mid[:, 0] < -40) & (mid[:, 2] > -150) & (mid[:, 2] < -118) & (mid[:, 1] > 7) & (mid[:, 1] < 23))
region("everything else structural above 25 m (roof, upper deck)", gs & (mid[:, 1] > 25) & (r < 140))
np.savez_compressed(ROOT + "data/derived/oracle/chains.npz", S=S.astype(np.float32), roots=roots.astype(np.int32), mats=mats, L=L.astype(np.float32))
open(ROOT + "science/edge_chains.md", "w", encoding="utf-8").write("\n".join(out) + "\n")
