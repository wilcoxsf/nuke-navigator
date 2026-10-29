"""Voxel Coke bottle and glove for Study 25 (29 Oct, Andrew: "Can we actually build voxel coke bottle and mitt instead of having the 3D models?").
The source is the full-detail wireframe of the two attractions baked from the park model (apps/web/public/fun_oracle.json: the bottle's slides are the tubes and
rings groups, the bottle and the glove are in figures). Every edge is sampled every 0.12 m into a grid of 0.5 m cells, a 3D closing fills the gaps of the wire
lattice, and a hole fill makes each a solid shape; only the shell (cells with an empty neighbour) is kept, since nothing inside is ever seen.
The glove is everything east of x = -53.5 m (world frame: x toward right field, y up, z toward home); the rest is the bottle. Each bottle cell carries how far it is
along the bottle (0 at the base, 100 at the neck: the main axis, oriented so the neck is the high end), so the browser can paint a label band; each glove cell
carries its height above the glove's base.
Output: apps/web/public/coke_vox.json (git-ignored: derived from the park model). Usage: py science/bake_coke_vox.py"""
import json

import numpy as np
from scipy import ndimage as ndi

ROOT = "C:/Users/andrewwi/dev/nuke-navigator-new/"
VX = 0.5
d = json.load(open(ROOT + "apps/web/public/fun_oracle.json"))
pts = []
for g in d["groups"]:
    s = np.array(g["seg"], dtype=np.float64).reshape(-1, 2, 3) / 100.0
    for a, b in s:
        n = max(1, int(np.ceil(np.linalg.norm(b - a) / 0.12)))
        t = np.linspace(0, 1, n + 1)[:, None]
        pts.append(a + (b - a) * t)
P = np.concatenate(pts)
P = P[P[:, 1] > 7.6]  # off the concourse floor
o = P.min(axis=0) - VX * 2
idx = np.floor((P - o) / VX).astype(int)
shape = idx.max(axis=0) + 3
out = {"vx": VX, "o": [round(float(v), 3) for v in o]}
# the glove stands on a deck about 11 m up; it is kept (the browser paints it concrete, coke25.js)
for part, sel in (("bottle", P[:, 0] < -53.5), ("glove", P[:, 0] >= -53.5)):
    G = np.zeros(shape, dtype=bool)
    G[tuple(idx[sel].T)] = True
    # the glove's wire is sparser (an open cup, so no hole fill closes it): a wider closing for it
    G = ndi.binary_closing(G, structure=ndi.generate_binary_structure(3, 1 if part == "bottle" else 3), iterations=2)
    G = ndi.binary_fill_holes(G)
    lab, n = ndi.label(G)
    if n > 1:  # the part itself, not the stray railings near it
        sizes = ndi.sum(G, lab, range(1, n + 1))
        G = np.isin(lab, [1 + i for i, sz in enumerate(sizes) if sz >= (0.08 if part == "bottle" else 0.02) * sizes.max()])
    shell = G & ~ndi.binary_erosion(G, structure=ndi.generate_binary_structure(3, 1))
    ijk = np.argwhere(shell)
    if part == "bottle":
        c = ijk.mean(axis=0)
        u = np.linalg.svd(ijk - c, full_matrices=False)[2][0]
        if u[1] < 0:
            u = -u
        s = (ijk - c) @ u
        tag = np.round((s - s.min()) / (s.max() - s.min()) * 100).astype(int)
        out["axis"] = [round(float(v), 4) for v in u]
    else:
        tag = ijk[:, 1] - ijk[:, 1].min()
    out[part] = np.column_stack([ijk, tag]).astype(int).ravel().tolist()
    print(part, "cells", int(G.sum()), "shell", len(ijk), "size m", ((ijk.max(axis=0) - ijk.min(axis=0) + 1) * VX).tolist())
json.dump(out, open(ROOT + "apps/web/public/coke_vox.json", "w"), separators=(",", ":"))
print("written")
