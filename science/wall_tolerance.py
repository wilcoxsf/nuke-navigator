"""Tolerance sweep for picking the wall's edges: for several distance windows (inside, outside) and height padding above the measured wall top, the length of selected structure+padding edges in each of the 18 five-degree sectors,
the number of empty sectors, and how much of the selection is 'contamination': edges that sit above the wall top by more than 2 m or whose chain is a long horizontal run far from the wall (stands behind it). Output: science/wall_tolerance.md."""
import json

import numpy as np

ROOT = "C:/Users/andrewwi/dev/nuke-navigator-new/"
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
# the same 3 degree running median the page uses
d_raw = np.array(w["wall_ft"]) * FT
d_med = np.array([np.median(d_raw[max(0, i - 3):i + 4]) for i in range(len(d_raw))])
dm, hm = d_med[bi], np.array(w["height_ft"])[bi] * FT
out = []
inb = (b > -46) & (b < 46)
print("tolerance sweep (wall distance window: inside, outside; height padding above the measured top)")
for ins, outs, hp in ((1.5, 1.0, 0.4), (1.5, 1.0, 1.5), (2.5, 1.5, 1.5), (3.0, 2.0, 1.5), (4.0, 2.0, 1.5), (3.0, 2.0, 2.5)):
    sel = inb & (r > dm - ins) & (r < dm + outs) & (y > -0.5) & (y < hm + hp)
    sec = np.array([L[sel & (b >= lo) & (b < lo + 5)].sum() for lo in range(-45, 45, 5)])
    cont = sel & ((y > hm + 2.0) | ((cl >= 8) & (np.abs(y - hm) > 1.2) & (np.abs(S[:, 1, 1] - S[:, 0, 1]) < 0.15 * L)))
    line = "inside %.1f outside %.1f height +%.1f m: edges %6d, length %6.0f m, empty sectors (under 4 m) %d, contaminated share %.1f%%, sector lengths %s" % (ins, outs, hp, sel.sum(), L[sel].sum(), int((sec < 4).sum()), 100 * L[cont].sum() / max(L[sel].sum(), 1), " ".join("%d" % v for v in sec))
    print(line)
    out.append(line)
open(ROOT + "science/wall_tolerance.md", "w", encoding="utf-8").write("\n".join(out) + "\n")
