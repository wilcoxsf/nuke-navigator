"""A swing in motion (25 Oct 2026): the mannequin batter from mannequin.py in N frames from stance through load to contact and follow-through, every pose parameter interpolated with an ease-in-out inside each phase (the load is slow, the swing from load to contact is fast, the follow-through settles).
Writes data/derived/batter_anim.json (frames at 360 px high: tone, mask, ink, as base64 grey) for apps/web/tools/batter_anim_lab.mjs. Usage: python science/mannequin_anim.py [--n 22] [--h 360] [--view 35]"""
import argparse
import base64
import json
import sys

import numpy as np

ARGS = sys.argv[1:]
sys.argv = [sys.argv[0]]
import mannequin as M  # noqa: E402

ap = argparse.ArgumentParser()
ap.add_argument("--n", type=int, default=22)
ap.add_argument("--h", type=int, default=360)
ap.add_argument("--view", type=float, default=35.0)
a = ap.parse_args(ARGS)
V = M.V


def bat_vec(p):
    if p.get("bat_vec") is not None:
        return np.array(p["bat_vec"], float) / np.linalg.norm(p["bat_vec"])
    az, el = np.radians(p["bat_az"]), np.radians(p.get("bat_el", 0))
    return np.array([np.cos(az) * np.cos(el), np.sin(az), np.cos(az) * np.sin(el)])


NUM = ["pelvis", "pelvis_yaw", "sh_yaw", "head_yaw", "head_pitch", "lean", "footR", "footL", "footyawR", "footyawL", "footpitchR", "footpitchL", "grip", "elbow_pole"]
ease = lambda u: u * u * (3 - 2 * u)


def blend(A, B, u):
    u = ease(u)
    out = {}
    for k in NUM:
        x, y = np.array(A.get(k, 0.0), float), np.array(B.get(k, 0.0), float)
        out[k] = tuple(x * (1 - u) + y * u) if x.ndim else float(x * (1 - u) + y * u)
    bv = bat_vec(A) * (1 - u) + bat_vec(B) * u
    out["bat_vec"] = tuple(bv / np.linalg.norm(bv))
    out["bat_az"] = 0
    out["top"] = A.get("top", "R") if u < 0.5 else B.get("top", "R")
    return out


KEY = [("stance", 0.0), ("load", 0.28), ("contact", 0.62), ("follow", 1.0)]


def pose_at(t):
    for (n0, t0), (n1, t1) in zip(KEY[:-1], KEY[1:]):
        if t <= t1 + 1e-9:
            return blend(M.POSES[n0], M.POSES[n1], (t - t0) / (t1 - t0))
    return blend(M.POSES["contact"], M.POSES["follow"], 1.0)


def main():
    H = a.h
    W = int(H * 0.95)
    scale = H / 250.0
    cx, gy = W * 0.42, H - 8
    beta = np.radians(a.view)
    Ry = np.array([[np.cos(beta), 0, np.sin(beta)], [0, 1, 0], [-np.sin(beta), 0, np.cos(beta)]])
    light = (V(-0.55, 0.70, 0.45), V(0.7, 0.15, 0.5))
    frames = []
    for i in range(a.n):
        t = i / (a.n - 1)
        p = pose_at(t)
        S = M.batter(p)
        S2 = M.Scene()
        for c, r, R, al, sp in S.prims:
            S2.prims.append((Ry @ c, r, Ry @ R, al, sp))
        tone, mask, ink = M.render(S2, W, H, scale, cx, gy, light)
        enc = lambda arr: base64.b64encode((np.clip(arr, 0, 1) * 255).astype(np.uint8).tobytes()).decode()
        frames.append({"t": round(t, 3), "tone": enc(tone), "mask": enc(mask.astype(float)), "ink": enc(ink)})
        print("frame %2d t %.2f" % (i, t))
    json.dump({"w": W, "h": H, "frames": frames}, open("C:/Users/andrewwi/dev/nuke-navigator-new/data/derived/batter_anim.json", "w"))
    print("written", a.n, "frames")


main()
