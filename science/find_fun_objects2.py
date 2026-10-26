"""Second pass: every connected component of the original model in a box around the left-field-corner fan area (x -95 to -20, z -185 to -105), any size, with its dimensions, to identify the glove and the Coke bottle.
Also prints the tallest components anywhere behind the outfield wall. Output: science/find_fun_objects2.md."""
import numpy as np
import trimesh

ROOT = "C:/Users/andrewwi/dev/nuke-navigator-new/"
out = []


def say(s=""):
    print(s, flush=True)
    out.append(s)


scene = trimesh.load(ROOT + "data/raw/drive/Stadium_SF.glb", force="scene")
rows = []
for gi, g in enumerate(scene.dump(concatenate=False)):
    name = getattr(getattr(g.visual, "material", None), "name", "") or ""
    m = trimesh.Trimesh(vertices=g.vertices, faces=g.faces, process=True)
    if not len(m.faces):
        continue
    for ci, c in enumerate(m.split(only_watertight=False)):
        lo, hi = c.bounds
        rows.append((gi, ci, name, len(c.faces), lo, hi))
say("# Left-field corner area (x -95 to -20, z -185 to -105): all components with 60 or more faces, by height")
box = [r for r in rows if r[3] >= 60 and -95 < (r[4][0] + r[5][0]) / 2 < -20 and -185 < (r[4][2] + r[5][2]) / 2 < -105]
box.sort(key=lambda r: -(r[5][1] - r[4][1]))
for gi, ci, name, nf, lo, hi in box[:40]:
    say("  mesh %d comp %5d [%-13s] faces %6d  x %6.1f to %6.1f  y %5.1f to %5.1f  z %7.1f to %7.1f   size %.1f x %.1f x %.1f" % (gi, ci, name, nf, lo[0], hi[0], lo[1], hi[1], lo[2], hi[2], hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]))
say("\n# Biggest components (by faces) in that box")
for gi, ci, name, nf, lo, hi in sorted(box, key=lambda r: -r[3])[:12]:
    say("  mesh %d comp %5d [%-13s] faces %6d  y %5.1f to %5.1f  size %.1f x %.1f x %.1f" % (gi, ci, name, nf, lo[1], hi[1], hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]))
open(ROOT + "science/find_fun_objects2.md", "w", encoding="utf-8").write("\n".join(out) + "\n")
