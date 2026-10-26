"""Which edges of the shipped model ARE the outfield wall? For every 5 degree sector from -45 to +45, using the measured wall profile (oracle_wall.json, distance and height by bearing): how many edges of each material lie on the wall surface
(within a tolerance of the measured distance, no higher than the wall top plus 0.4 m), how long they are, at what heights, and whether a wall TOP line exists (a peak of horizontal edge length at the wall height). Also looks for the wall
by its own signature: long horizontal chains at the wall height whatever their distance, to see how far the measured profile is from the model's real wall. Output: science/wall_edges.md."""
import json

import numpy as np

ROOT = "C:/Users/andrewwi/dev/nuke-navigator-new/"
out = []


def say(s=""):
    print(s, flush=True)
    out.append(s)


home = np.array([0.3, 1.0])
z = np.load(ROOT + "data/derived/oracle/shipped_chains.npz", allow_pickle=True)
S, cl, mats = z["S"].astype(float), z["chain_len"].astype(float), z["mats"].astype(str)
w = json.load(open(ROOT + "apps/web/public/oracle_wall.json"))
FT = 0.3048
mid = S.mean(axis=1)
L = np.linalg.norm(S[:, 1] - S[:, 0], axis=1)
r = np.hypot(mid[:, 0] - home[0], mid[:, 2] - home[1])
b = np.degrees(np.arctan2(mid[:, 0] - home[0], -(mid[:, 2] - home[1])))
y = mid[:, 1]
bi = np.clip(np.round(b + 47).astype(int), 0, 93)
dm = np.array(w["wall_ft"])[bi] * FT
hm = np.array(w["height_ft"])[bi] * FT
say("# Which edges are the wall? (23 Oct 2026) shipped model, %d edges; materials %s" % (len(S), {m: int((mats == m).sum()) for m in np.unique(mats)}))
inb = (b > -46) & (b < 46)
say("\n## Per 5 degree sector: edges within tolerance of the measured wall distance (-1.5 to +1.0 m) and under the wall top + 0.4 m, by material; and where the model's own long horizontal chains at wall height actually sit")
say("  sector      measured wall (ft, height ft) | padding edges | structure edges on the wall: n, length m, top height m | long horizontal structure chains (3 m+, 0.5 m of wall height): median distance from the plate (ft)")
for lo in range(-45, 45, 5):
    m = inb & (b >= lo) & (b < lo + 5)
    if not m.any():
        continue
    dd, hh = np.median(dm[m]), np.median(hm[m])
    on = m & (r > dm - 1.5) & (r < dm + 1.0) & (y > -0.5) & (y < hm + 0.4)
    pad = on & (mats == "Ads_Padding")
    st = on & np.char.startswith(mats, "SF_Greyscale")
    horiz = np.abs(S[:, 1, 1] - S[:, 0, 1]) < 0.15 * L
    long_h = m & horiz & (cl >= 3) & (np.abs(y - hh) < 0.5) & np.char.startswith(mats, "SF_Greyscale")
    far = np.median(r[long_h]) / FT if long_h.any() else float("nan")
    say("  %+3d to %+3d   %4.0f ft, %4.1f ft |  %4d | %5d, %6.0f m, top %.1f m | %s" % (lo, lo + 5, dd / FT, hh / FT, pad.sum(), st.sum(), L[st].sum(), y[st].max() if st.any() else float("nan"),
           ("%d chains, median %.0f ft (measured %.0f)" % (long_h.sum(), far, dd / FT)) if long_h.any() else "none"))
# what is at the wall height near the measured distance, at the centre-field sector?
m = inb & (b > -3) & (b < 3)
say("\n## Centre field (-3 to +3 degrees), structure and padding edges between 100 and 135 m from the plate, by height band and distance band (counts)")
for hl, hh2 in ((-0.5, 0.3), (0.3, 1.5), (1.5, 2.6), (2.6, 4), (4, 8)):
    row = []
    for dl, dh in ((100, 112), (112, 118), (118, 121), (121, 124), (124, 130), (130, 135)):
        mm = m & (y >= hl) & (y < hh2) & (r >= dl) & (r < dh)
        row.append("%4d" % mm.sum())
    say("  height %4.1f to %3.1f m:  distance 100-112 %s | 112-118 %s | 118-121 %s | 121-124 %s | 124-130 %s | 130-135 %s" % ((hl, hh2) + tuple(row)))
say("  (the measured distance at 0 degrees is %.1f m; the wall height is %.1f m)" % (np.median(dm[m]), np.median(hm[m])))
open(ROOT + "science/wall_edges.md", "w", encoding="utf-8").write("\n".join(out) + "\n")
