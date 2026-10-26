"""Finds the fan attractions (the giant glove, the Coke bottle slide and anything else that is a compact, tall object) in the ORIGINAL Oracle Park model, by splitting every mesh into connected components and listing the ones that
sit behind the left-field wall and look like objects (compact footprint, real height, thousands of faces). Read-only; prints candidates with their bounding boxes so the extraction (fun_objects.py) can use them.
Output: science/find_fun_objects.md."""
import numpy as np
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
        ctr = (lo + hi) / 2
        dx, dz = ctr[0] - home[0], ctr[2] - home[1]
        r = float(np.hypot(dx, dz))
        b = float(np.degrees(np.arctan2(dx, -dz)))
        size = hi - lo
        rows.append(dict(mesh=gi, mat=name, comp=ci, faces=len(c.faces), cx=ctr[0], cy=ctr[1], cz=ctr[2], r=r, b=b, sx=size[0], sy=size[1], sz=size[2], ymax=hi[1], ymin=lo[1]))
say("# Fun-object search (23 Oct 2026): %d connected components in the original model" % len(rows))
cand = [r for r in rows if 60 < r["r"] < 170 and r["faces"] >= 300 and max(r["sx"], r["sz"]) < 45 and r["sy"] > 4 and r["faces"] < 60000]
cand.sort(key=lambda r: (r["b"], -r["faces"]))
say("\n## Compact, tall components 60 to 170 m from the plate (footprint under 45 m, height over 4 m, 300 to 60,000 faces), by bearing (negative = left field)")
for r in cand:
    say("  mesh %d comp %3d [%-14s] faces %6d  bearing %+6.1f  r %5.1f m  center (%.1f, %.1f, %.1f)  size %.1f x %.1f x %.1f m (height %.1f, top %.1f)" % (r["mesh"], r["comp"], r["mat"], r["faces"], r["b"], r["r"], r["cx"], r["cy"], r["cz"], r["sx"], r["sz"], r["sy"], r["sy"], r["ymax"]))
open(ROOT + "science/find_fun_objects.md", "w", encoding="utf-8").write("\n".join(out) + "\n")
