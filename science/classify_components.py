"""What counts as a seat? Test: in the ORIGINAL Oracle model, seats should be many identical small components (the same face count and size, repeated in rows), and the scoreboard, light towers, glove, Coke bottle and
other attractions should be one-off shapes. Splits every mesh into connected components, groups them by a shape signature (face count, bounding-box size to 0.1 m), and reports: the biggest repeated groups with how many
components, where they sit and how tightly they stack (to confirm they are seat rows); the one-off components that are big or detailed (scoreboard, towers, attractions) by bearing; and how many hard-edge segments each class
would own. Output: science/classify_components.md and data/derived/oracle/components.parquet (one row per component with its signature and class) for the edge baking step."""
import collections

import numpy as np
import pandas as pd
import trimesh

ROOT = "C:/Users/andrewwi/dev/nuke-navigator-new/"
out = []


def say(s=""):
    print(s, flush=True)
    out.append(s)


home = np.array([0.3, 1.0])
scene = trimesh.load(ROOT + "data/raw/drive/Stadium_SF.glb", force="scene")
rows = []
for gi, g in enumerate(scene.dump(concatenate=False)):
    name = getattr(getattr(g.visual, "material", None), "name", "") or ""
    m = trimesh.Trimesh(vertices=g.vertices, faces=g.faces, process=True)
    if not len(m.faces):
        continue
    for ci, c in enumerate(m.split(only_watertight=False)):
        lo, hi = c.bounds
        size = hi - lo
        ctr = (lo + hi) / 2
        sig = (len(c.faces), round(float(size[0]), 1), round(float(size[1]), 1), round(float(size[2]), 1))
        rows.append(dict(mesh=gi, comp=ci, mat=name, faces=len(c.faces), sx=size[0], sy=size[1], sz=size[2], cx=ctr[0], cy=ctr[1], cz=ctr[2], r=float(np.hypot(ctr[0] - home[0], ctr[2] - home[1])),
                         b=float(np.degrees(np.arctan2(ctr[0] - home[0], -(ctr[2] - home[1])))), sig=sig, vol=float(np.prod(np.maximum(size, 1e-3)))))
df = pd.DataFrame(rows)
cnt = collections.Counter(df.sig)
df["rep"] = df.sig.map(cnt)
say("# What counts as a seat (23 Oct 2026): %d connected components in the original model, %d distinct shape signatures" % (len(df), len(cnt)))
say("\n## Repeated shapes (same face count and size): the biggest groups")
for sig, n in cnt.most_common(12):
    g = df[df.sig == sig]
    say("  %5d identical components: %d faces, %.1f x %.1f x %.1f m; heights %.1f to %.1f m, distance from the plate %.0f to %.0f m, material %s" % (n, sig[0], sig[1], sig[2], sig[3], g.cy.min(), g.cy.max(), g.r.min(), g.r.max(), g.mat.iloc[0]))
for k in (3, 10, 30, 100, 300):
    s = df[df.rep >= k]
    say("  components in groups of at least %3d identical copies: %6d (%.0f%% of components, %.0f%% of faces)" % (k, len(s), 100 * len(s) / len(df), 100 * s.faces.sum() / df.faces.sum()))
SEAT = 30
df["cls"] = np.where(df.rep >= SEAT, "seat", "other")
say("\n## One-off components (fewer than %d identical copies) that are big or detailed, by bearing (these are scoreboard, towers, attractions, structure)" % SEAT)
oth = df[(df.cls == "other") & ((df.faces >= 600) | (df.vol > 600))].sort_values("b")
say("  %d components; the largest 25 by faces:" % len(oth))
for _, r in oth.sort_values("faces", ascending=False).head(25).iterrows():
    say("    mesh %d comp %5d  faces %6d  bearing %+6.1f  r %6.1f m  y %5.1f to %5.1f  size %.1f x %.1f x %.1f m  [%s]" % (r.mesh, r.comp, r.faces, r.b, r.r, r.cy - r.sy / 2, r.cy + r.sy / 2, r.sx, r.sy, r.sz, r.mat))
say("\n## Do the repeated components stack like seat rows? (for the seat class: share within 1 m of another seat component)")
S = df[df.cls == "seat"]
from scipy.spatial import cKDTree
t = cKDTree(S[["cx", "cy", "cz"]].to_numpy())
d, _ = t.query(S[["cx", "cy", "cz"]].to_numpy(), k=2)
say("  seat components %d; median distance to the nearest other seat %.2f m; share within 1.5 m: %.1f%%" % (len(S), np.median(d[:, 1]), 100 * np.mean(d[:, 1] < 1.5)))
say("  seat heights %.1f to %.1f m (5th to 95th percentile %.1f to %.1f); distance from the plate %.0f to %.0f m" % (S.cy.min(), S.cy.max(), S.cy.quantile(.05), S.cy.quantile(.95), S.r.min(), S.r.max()))
near = S[(S.r < 45)]
say("  seat components within 45 m of the plate (the rows closest to the field): %d, lowest at %.2f m, median height %.1f m" % (len(near), near.cy.min(), near.cy.median()))
df.drop(columns=["sig"]).to_parquet(ROOT + "data/derived/oracle/components.parquet")
open(ROOT + "science/classify_components.md", "w", encoding="utf-8").write("\n".join(out) + "\n")
