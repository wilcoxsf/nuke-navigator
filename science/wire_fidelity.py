"""How faithful is the wireframe the page draws? The page builds its lines from the hard edges (angle between faces over 75 degrees, plus open boundary edges) of the SLIMMED Oracle model (stadium_sf_color.glb, the
simplified copy). This compares those lines with the hard edges of the ORIGINAL full-resolution model (Stadium_SF.glb, 228k triangles): how much of the original's edge length has a shipped edge within a tolerance
(coverage), how much of the shipped edge length has no original edge within that tolerance (spurious lines the simplifier invented), overall and for the heavy zone (low edges within 150 m of the plate, which
carry the look). Also tests the wire-only candidates (data/private/wire/Stadium_SF_wire_*.glb) the same way.
Output: science/wire_fidelity.md. About a minute."""
import sys
from pathlib import Path

import numpy as np
import trimesh
from scipy.spatial import cKDTree

ROOT = Path("C:/Users/andrewwi/dev/nuke-navigator-new")
out = []


def say(s=""):
    print(s, flush=True)
    out.append(s)


def hard_edges(path, angle=75.0):
    scene = trimesh.load(str(path), force="scene")
    segs = []
    for g in scene.dump(concatenate=False):
        m = trimesh.Trimesh(vertices=g.vertices, faces=g.faces, process=True)
        if len(m.faces) == 0:
            continue
        adj, ang, shared = m.face_adjacency, m.face_adjacency_angles, m.face_adjacency_edges
        keep = np.degrees(ang) > angle
        e = [m.vertices[shared[keep]]]
        # open boundary edges (an edge used by one face), which three.js EdgesGeometry also keeps
        es = m.edges_sorted
        uniq, inv, cnt = np.unique(es, axis=0, return_inverse=True, return_counts=True)
        b = uniq[cnt == 1]
        if len(b):
            e.append(m.vertices[b])
        segs.append(np.concatenate(e, axis=0))
    S = np.concatenate(segs, axis=0)
    return S  # (n, 2, 3)


def sample(S, step=0.25):
    L = np.linalg.norm(S[:, 1] - S[:, 0], axis=1)
    n = np.maximum(1, np.ceil(L / step).astype(int))
    pts, w = [], []
    for a, b, k in zip(S[:, 0], S[:, 1], n):
        t = (np.arange(k) + 0.5) / k
        pts.append(a[None, :] + t[:, None] * (b - a)[None, :])
        w.append(np.full(k, np.linalg.norm(b - a) / k))
    return np.concatenate(pts), np.concatenate(w)


def compare(full, other, label, tol=0.3):
    P, wp = sample(full)
    Q, wq = sample(other)
    dpq, _ = cKDTree(Q).query(P)
    dqp, _ = cKDTree(P).query(Q)
    home = np.array([0.3, 0.0, 1.0])
    heavy = lambda X: (X[:, 1] < 12) & (np.hypot(X[:, 0] - home[0], X[:, 2] - home[2]) < 150)
    hp, hq = heavy(P), heavy(Q)
    L = lambda w: float(w.sum())
    say("## %s" % label)
    say("  edge length: original %.0f m (%d segments), this one %.0f m (%d segments)" % (L(wp), len(full), L(wq), len(other)))
    for name, m1, m2 in (("all edges", np.ones(len(P), bool), np.ones(len(Q), bool)), ("heavy zone (low, near the field)", hp, hq)):
        cov = wp[m1][dpq[m1] < tol].sum() / wp[m1].sum()
        spur = wq[m2][dqp[m2] >= tol].sum() / wq[m2].sum()
        say("  %-34s original edge length within %.1f m of this one: %.1f%%;  this one's length with no original edge within %.1f m: %.1f%%;  median offset %.2f m, 95th percentile %.2f m" % (name, tol, 100 * cov, tol, 100 * spur, np.median(dpq[m1]), np.percentile(dpq[m1], 95)))


say("# Oracle wireframe fidelity (23 Oct 2026): hard edges (over 75 degrees plus open boundaries) of each model against the original")
full = hard_edges(ROOT / "data/raw/drive/Stadium_SF.glb")
say("original Stadium_SF.glb: %d hard-edge segments" % len(full))
box = full.reshape(-1, 3)
say("original extent (m): x %.0f to %.0f, y %.0f to %.0f, z %.0f to %.0f" % (box[:, 0].min(), box[:, 0].max(), box[:, 1].min(), box[:, 1].max(), box[:, 2].min(), box[:, 2].max()))
DEQ = ROOT / "scratch/deq"  # dequantized copies made by apps/web/tools/dequant_glb.mjs (trimesh ignores the quantization transform)
cands = [("shipped copy (apps/web/public/stadium_sf_color.glb, what the page draws)", DEQ / "shipped.glb")]
cands += [("wire-only slim, ratio %s" % p.stem.split("_")[-1], p) for p in sorted(DEQ.glob("wire_*.glb"))]
for label, p in cands:
    try:
        other = hard_edges(p)
        b2 = other.reshape(-1, 3)
        say("  (%s extent: x %.0f to %.0f, y %.0f to %.0f, z %.0f to %.0f)" % (p.name, b2[:, 0].min(), b2[:, 0].max(), b2[:, 1].min(), b2[:, 1].max(), b2[:, 2].min(), b2[:, 2].max()))
        compare(full, other, label)
    except Exception as e:
        say("## %s: could not load (%s)" % (label, e))
(ROOT / "science" / "wire_fidelity.md").write_text("\n".join(out) + "\n", encoding="utf-8")
