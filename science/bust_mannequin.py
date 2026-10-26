"""Generic head-and-shoulders portraits for batters we have no photo of (25 Oct 2026), built like the batter mannequin: oriented ellipsoids ray cast into a tone map, a mask and an ink-line map, lit from the upper left. They are NOT likenesses of anyone: twelve different
invented faces (skin tone, jaw, brow, nose, facial hair, cap, build), so a player without a photo gets a face that is stable (picked from the player id) but not a copy of the next player's.
Output public/batter_bust.json: {variants: [{id, name, w, h, tone, mask, ink}]}. Usage: python science/bust_mannequin.py [--h 360]"""
import argparse
import base64
import json
import sys

import numpy as np

sys.argv = [sys.argv[0]]  # mannequin.py parses argv at import; hand it nothing
import mannequin as M  # noqa: E402

ap = argparse.ArgumentParser()
ap.add_argument("--h", type=int, default=360)
ap.add_argument("--view", type=float, default=16.0)
ap.add_argument("--out", default="C:/Users/andrewwi/dev/nuke-navigator-new/apps/web/public/batter_bust.json")
a = ap.parse_args(sys.argv[1:])
V = M.V


def rot_y(deg):
    r = np.radians(deg)
    return np.array([[np.cos(r), 0, np.sin(r)], [0, 1, 0], [-np.sin(r), 0, np.cos(r)]])


def rot_x(deg):
    r = np.radians(deg)
    return np.array([[1, 0, 0], [0, np.cos(r), -np.sin(r)], [0, np.sin(r), np.cos(r)]])


def rot_z(deg):
    r = np.radians(deg)
    return np.array([[np.cos(r), -np.sin(r), 0], [np.sin(r), np.cos(r), 0], [0, 0, 1]])


JERSEY, CAP, HAIR = 0.90, 0.34, 0.20
# name, skin albedo, jaw width, face length, jaw depth, brow weight, nose scale, beard, cap tilt (deg), build (shoulder scale), sideburns, mustache
VARIANTS = [
    ("A", "lean, clean-shaven", 0.78, 0.96, 1.00, 0.95, 0.9, 1.0, "none", 0, 1.00, 0, 0),
    ("B", "square jaw, stubble", 0.66, 1.06, 1.04, 1.15, 1.1, 1.05, "stubble", 4, 1.10, 1, 0),
    ("C", "round face, goatee", 0.60, 1.10, 0.96, 0.85, 0.9, 1.0, "goatee", -3, 1.08, 0, 0),
    ("D", "full beard", 0.72, 1.00, 1.04, 1.00, 1.0, 1.1, "full", 0, 1.05, 1, 1),
    ("E", "dark skin, strong brow", 0.40, 1.04, 1.02, 1.20, 1.2, 1.05, "none", 3, 1.12, 0, 0),
    ("F", "dark skin, trim beard", 0.36, 1.08, 1.00, 1.00, 1.0, 1.1, "trim", -2, 1.04, 0, 1),
    ("G", "narrow face, long nose", 0.84, 0.88, 1.08, 0.90, 0.9, 1.25, "none", 0, 0.94, 0, 0),
    ("H", "heavy jaw, mustache", 0.70, 1.14, 1.02, 1.10, 1.1, 1.05, "none", 5, 1.14, 1, 1),
    ("I", "medium skin, stubble", 0.54, 1.00, 1.00, 1.00, 1.0, 1.0, "stubble", -4, 1.00, 1, 0),
    ("J", "young, soft jaw", 0.76, 0.96, 0.96, 0.92, 0.85, 0.95, "none", 2, 0.96, 0, 0),
    ("K", "big frame, short beard", 0.64, 1.18, 1.06, 1.08, 1.15, 1.1, "trim", 0, 1.22, 1, 0),
    ("L", "tan, goatee and sideburns", 0.50, 1.02, 1.00, 1.04, 1.0, 1.05, "goatee", -5, 1.00, 1, 0),
]


def build(v):
    _, _, skin, jw, fl, jd, brow, nose, beard, tilt, build_, sb, must = v
    S = M.Scene()
    head, torso = [], []  # (center, radii, albedo, spec), built in the head frame / the body frame

    def H(c, r, al, sp=0.1):
        head.append((V(*c), V(*r), al, sp))

    def T(c, r, al, sp=0.0, R=None):
        torso.append((V(*c), V(*r), al, sp, R))
    # skull and face
    H((0, 3.0, -0.8), (7.7, 10.4 * fl ** 0.3, 9.4), skin)
    H((0, -5.2 * fl, 1.6), (6.1 * jw, 6.0 * fl, 7.0 * jd), skin)  # jaw and cheeks
    H((0, -10.4 * fl, 4.2 * jd), (3.4 * jw, 2.6, 3.0), skin)  # chin
    for sx in (-1, 1):
        H((sx * 4.9 * jw, -1.2, 5.4), (2.7, 2.2, 2.3), skin)  # cheekbone
        H((sx * 7.9, 0.0, -1.0), (0.9, 2.6, 1.8), skin * 0.9)  # ear
        H((sx * 3.3, 1.3, 7.3), (1.5, 0.8, 0.4), 0.10, 0.4)  # eye (nearly flush: a dark patch, not a ball)
        H((sx * 3.5, 3.0, 7.9), (2.5, 0.55, 0.9), HAIR + 0.06)  # eyebrow
    H((0, 2.4, 7.4), (6.6, 1.3 * brow, 2.0 * brow), skin * 0.95)  # brow ridge
    H((0, -0.8, 7.9), (1.05 * nose, 3.0, 1.5 * nose), skin)  # nose bridge
    H((0, -3.3, 9.0 * (0.97 + 0.04 * nose)), (1.45 * nose, 1.15, 1.3 * nose), skin)  # nose tip
    for sx in (-1, 1):
        H((sx * 1.3 * nose, -3.3, 8.2), (0.8, 0.8, 0.8), skin * 0.85)  # nostril wing
    H((0, -6.7 * fl, 7.0 * jd), (3.1, 0.65, 1.1), skin * 0.62, 0.2)  # lips
    H((0, -7.8 * fl, 6.6 * jd), (2.5, 0.5, 0.8), skin * 0.8)  # lower lip
    # facial hair as slightly larger darker shells over the lower face
    if beard in ("stubble", "full", "trim"):
        al = HAIR + (0.18 if beard == "stubble" else 0.05)
        sc = 1.03 if beard == "stubble" else 1.08
        H((0, -6.0 * fl, 1.8), (6.1 * jw * sc, 5.2 * fl, 7.0 * jd * sc), al)
        H((0, -10.6 * fl, 4.4 * jd), (3.5 * jw * sc, 2.7, 3.1 * sc), al)
    if beard == "full":
        H((0, -11.8 * fl, 4.0 * jd), (4.0 * jw, 3.0, 3.6), HAIR)
    if beard == "goatee":
        H((0, -10.8 * fl, 4.6 * jd), (2.3, 2.9, 2.4), HAIR)
        H((0, -8.4 * fl, 6.0 * jd), (1.5, 0.9, 1.0), HAIR)
    if must or beard in ("full", "trim"):
        H((0, -5.0 * fl, 8.4), (3.5, 0.9, 1.2), HAIR)  # mustache
        for sx in (-1, 1):
            H((sx * 2.6, -6.4 * fl, 7.6), (1.0, 1.3, 1.0), HAIR)
    if sb:
        for sx in (-1, 1):
            H((sx * 7.4, -0.6, 2.2), (0.9, 4.0, 1.6), HAIR)  # sideburns
    # cap: crown, a seam line, a brim tilted down
    H((0, 5.9, -0.8), (8.9, 7.2, 10.2), CAP, 0.35)
    H((0, 3.6, 2.4), (8.5, 3.8, 8.0), CAP, 0.35)
    H((0, 3.6, 10.8), (7.8, 0.9, 6.6), CAP * 0.9, 0.3)  # brim (rotated below)
    # neck, collar and shoulders (body frame); the shoulders turn a little away from the head
    T((0, -13.0, -1.8), (5.8, 7.0, 5.6), skin)
    T((0, -23.5, -1.5), (17.5 * build_, 7.2, 9.6), JERSEY)
    T((0, -19.8, -1.0), (11.5 * build_, 4.4, 8.0), JERSEY)  # trapezius slope
    T((0, -17.6, 0.2), (6.6, 2.4, 6.0), JERSEY * 0.65)  # collar band
    T((0, -27.0, 8.6), (0.5, 7.0, 0.6), 0.34)  # button placket
    for sx in (-1, 1):
        T((sx * 17.8 * build_, -25.0, -1.5), (5.8, 5.8, 5.8), JERSEY)  # deltoid
        T((sx * 19.0 * build_, -32.0, -1.5), (5.0, 8.0, 5.0), JERSEY)  # upper arm
    # head frame -> world: the head turns 14 degrees and the cap tilts
    Rh = rot_y(12) @ rot_z(tilt * 0.6)
    pivot = V(0, -11.0, -1.5)
    brim_R = rot_x(-14)
    for i, (c, r, al, sp) in enumerate(head):
        axes = np.eye(3)
        cc = c
        if abs(r[0] - 7.8 * 1.0) < 1e-9 and r[1] == 0.9:
            axes = brim_R
            cc = V(c[0], c[1], c[2])
        S.ell(pivot + Rh @ (cc - pivot), r, Rh @ axes, al, sp)
    Rt = rot_y(-10)
    for c, r, al, sp, R in torso:
        S.ell(Rt @ c, r, Rt @ (np.eye(3) if R is None else R), al, sp)
    return S


def main():
    Hpx = a.h
    Wpx = int(Hpx * 0.9)
    scale = Hpx / 50.0
    cx, gy = Wpx * 0.5, Hpx * 0.36
    Ry = rot_y(a.view)
    light = (V(-0.55, 0.70, 0.55), V(0.7, 0.15, 0.5))
    out = []
    for v in VARIANTS:
        S = build(v)
        S2 = M.Scene()
        for c, r, R, al, sp in S.prims:
            S2.prims.append((Ry @ c, r, Ry @ R, al, sp))
        tone, mask, ink = M.render(S2, Wpx, Hpx, scale, cx, gy, light)
        enc = lambda arr: base64.b64encode((np.clip(arr, 0, 1) * 255).astype(np.uint8).tobytes()).decode()
        out.append({"id": v[0], "name": v[1], "w": Wpx, "h": Hpx, "tone": enc(tone), "mask": enc(mask.astype(float)), "ink": enc(ink)})
        print(v[0], v[1], "ink fraction %.3f" % mask.mean())
    json.dump({"variants": out}, open(a.out, "w"))
    print("written", a.out)


main()
