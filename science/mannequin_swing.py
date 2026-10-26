"""The batter at contact for the swing diagram (25 Oct 2026): the shaded mannequin from mannequin.py, seen from the side (camera yaw 62 degrees) with the bat lying in the picture plane at the attack angle, one picture per attack angle from -10 to +45 degrees.
Each picture is a PNG, red = tone, green = ink lines, blue = mask, in apps/web/public/batter_swing/aa_NN.png (NN = attack angle + 20), plus index.json with the picture size and the pixel the bat's sweet spot passes through (where the ball leaves from), so the page can draw the pitch and ball paths from it.
Usage: python science/mannequin_swing.py [--h 560]"""
import argparse
import json
import os
import sys

import numpy as np
from PIL import Image

ARGS = sys.argv[1:]
sys.argv = [sys.argv[0]]
import mannequin as M  # noqa: E402

ap = argparse.ArgumentParser()
ap.add_argument("--h", type=int, default=560)
ap.add_argument("--view", type=float, default=62.0)
a = ap.parse_args(ARGS)
V = M.V
OUT = "C:/Users/andrewwi/dev/nuke-navigator-new/apps/web/public/batter_swing/"
os.makedirs(OUT, exist_ok=True)
beta = np.radians(a.view)
Ry = np.array([[np.cos(beta), 0, np.sin(beta)], [0, 1, 0], [-np.sin(beta), 0, np.cos(beta)]])
H = a.h
W = int(H * 0.86)
scale = H / 250.0
cx, gy = W * 0.40, H - 12
light = (V(-0.55, 0.70, 0.45), V(0.7, 0.15, 0.5))
index = {"view": a.view, "w": W, "h": H, "frames": {}}
for aa in range(-10, 46, 5):
    p = dict(M.POSES["contact"])
    cam_dir = V(np.cos(np.radians(aa)), np.sin(np.radians(aa)), 0.12)
    cam_dir = cam_dir / np.linalg.norm(cam_dir)
    p["bat_vec"] = tuple(Ry.T @ cam_dir)  # the bat direction in the world, so that it lies in the picture plane after the camera turn
    S = M.batter(p)
    S2 = M.Scene()
    for c, r, R, al, sp in S.prims:
        S2.prims.append((Ry @ c, r, Ry @ R, al, sp))
    tone, mask, ink = M.render(S2, W, H, scale, cx, gy, light)
    grip = V(*p["grip"])
    bd = np.array(p["bat_vec"], float)
    bd = bd / np.linalg.norm(bd)
    knob = grip - bd * 6
    sweet = Ry @ (knob + bd * 62)
    px, py = cx + sweet[0] * scale, gy - sweet[1] * scale
    img = np.stack([np.clip(tone, 0, 1), np.clip(ink, 0, 1), mask.astype(float)], axis=-1)
    Image.fromarray((img * 255).astype(np.uint8)).save(OUT + "aa_%02d.png" % (aa + 20), optimize=True)
    index["frames"][str(aa)] = {"file": "aa_%02d.png" % (aa + 20), "contact": [round(float(px), 1), round(float(py), 1)]}
    print("aa %+3d  sweet spot at pixel (%.0f, %.0f)  ink %.3f" % (aa, px, py, mask.mean()))
json.dump(index, open(OUT + "index.json", "w"))
print("written", OUT)
