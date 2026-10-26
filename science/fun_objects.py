"""Bakes the Oracle fan attractions at full detail from the ORIGINAL model (the page's slimmed copy loses detail on small objects): every component inside the Coke-corner box (x -75 to -40, z -150 to -118, y 7 to 23)
that is object-sized (under 25 m, at least 20 faces, wider than 0.6 m), with its hard edges at 25 degrees plus boundaries, grouped by shape so each group can get its own halo colour:
  tubes    the large 160- and 164-face rings (11 to 14 m across, stacked up the structure: the slides)
  rings    the 192-face rings (5 to 7 m across, spiralling up)
  figures  everything else that is object-sized (the glove, the bottle fittings, ...)
Coordinates are written as integer centimetres in the model's own frame, so the file stays small. Output: apps/web/public/fun_oracle.json (git-ignored derived model data) and science/fun_objects.md."""
import json

import numpy as np
import trimesh

ROOT = "C:/Users/andrewwi/dev/nuke-navigator-new/"
out = []


def say(s=""):
    print(s, flush=True)
    out.append(s)


BOX = dict(x=(-75, -40), z=(-150, -118), y=(7, 23))
scene = trimesh.load(ROOT + "data/raw/drive/Stadium_SF.glb", force="scene")
groups = {"tubes": [], "rings": [], "figures": []}
counts = {k: 0 for k in groups}
for g in scene.dump(concatenate=False):
    m = trimesh.Trimesh(vertices=g.vertices, faces=g.faces, process=True)
    if not len(m.faces):
        continue
    for c in m.split(only_watertight=False):
        lo, hi = c.bounds
        ctr, size = (lo + hi) / 2, hi - lo
        if not (BOX["x"][0] < ctr[0] < BOX["x"][1] and BOX["z"][0] < ctr[2] < BOX["z"][1] and BOX["y"][0] < ctr[1] < BOX["y"][1] + 5):
            continue
        if len(c.faces) < 20 or max(size) > 25 or max(size[0], size[2]) < 0.6 or lo[1] < 6.5:
            continue
        keep = np.degrees(c.face_adjacency_angles) > 25
        e = [c.vertices[c.face_adjacency_edges[keep]]]
        uniq, cnt = np.unique(c.edges_sorted, axis=0, return_counts=True)
        if (cnt == 1).any():
            e.append(c.vertices[uniq[cnt == 1]])
        s = np.concatenate(e)
        nf = len(c.faces)
        k = "tubes" if nf in (160, 164) else "rings" if nf == 192 else "figures"
        groups[k].append(s)
        counts[k] += 1
data = {"unit": "cm", "box": BOX, "groups": []}
for k, lst in groups.items():
    if not lst:
        continue
    S = np.concatenate(lst)
    q = np.round(S.reshape(-1, 6) * 100).astype(np.int32)
    data["groups"].append({"name": k, "components": counts[k], "seg": q.reshape(-1).tolist()})
    say("%-8s %3d components, %6d edge segments" % (k, counts[k], len(q)))
json.dump(data, open(ROOT + "apps/web/public/fun_oracle.json", "w"), separators=(",", ":"))
import os

say("wrote apps/web/public/fun_oracle.json, %.2f MB" % (os.path.getsize(ROOT + "apps/web/public/fun_oracle.json") / 1e6))
open(ROOT + "science/fun_objects.md", "w", encoding="utf-8").write("\n".join(out) + "\n")
