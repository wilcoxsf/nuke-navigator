"""Calibrates the chain-based seat definition on the SHIPPED model (what the page draws). Hard edges (over 40 degrees plus open boundaries) are chained where they meet (5 mm) and continue within 20 degrees, within one material.
Definition under test: SEAT DETAIL = an edge of the structure material whose chain is shorter than C metres and that lies outside the protected boxes (scoreboard, Coke cluster); row lines and structure are the long chains; the field,
infield and padding materials are never touched. For C in 1, 2, 3 and 5 m it reports, by region, how much is flagged as seat detail: what must stay (field materials, long edges, the wall, the scoreboard and the Coke cluster
inside their boxes) against what should go (seats nearest the field, the lower bowl, the upper deck). Output: science/seat_chains.md."""
import collections

import numpy as np

ROOT = "C:/Users/andrewwi/dev/nuke-navigator-new/"
out = []


def say(s=""):
    print(s, flush=True)
    out.append(s)


home = np.array([0.3, 1.0])
z = np.load(ROOT + "data/derived/oracle/shipped_edges.npz", allow_pickle=True)
S, mats = z["S"].astype(np.float64), z["mats"].astype(str)
L = np.linalg.norm(S[:, 1] - S[:, 0], axis=1)
D = (S[:, 1] - S[:, 0]) / L[:, None]
Q = np.round(S / 0.005).astype(np.int64)
ends = collections.defaultdict(list)
for i in range(len(S)):
    ends[tuple(Q[i, 0])].append((i, 0))
    ends[tuple(Q[i, 1])].append((i, 1))
parent = np.arange(len(S))


def find(x):
    while parent[x] != x:
        parent[x] = parent[parent[x]]
        x = parent[x]
    return x


cos20 = np.cos(np.radians(20))
for k, lst in ends.items():
    if len(lst) == 2:
        (i, ei), (j, ej) = lst
        di = D[i] if ei == 1 else -D[i]
        dj = D[j] if ej == 0 else -D[j]
        if i != j and float(di @ dj) > cos20 and mats[i] == mats[j]:
            parent[find(i)] = find(j)
roots = np.array([find(i) for i in range(len(S))])
chain_len = np.bincount(roots, weights=L)
cl = chain_len[roots]
mid = S.mean(axis=1)
r = np.hypot(mid[:, 0] - home[0], mid[:, 2] - home[1])
b = np.degrees(np.arctan2(mid[:, 0] - home[0], -(mid[:, 2] - home[1])))
y = mid[:, 1]
gs = np.char.startswith(mats, "SF_Greyscale")
sb = gs & (r > 145) & (r < 160) & (y > 15) & (y < 60) & (np.abs(b) < 25)
coke = gs & (mid[:, 0] > -75) & (mid[:, 0] < -40) & (mid[:, 2] > -150) & (mid[:, 2] < -118) & (y > 7) & (y < 23)
prot = sb | coke
reg = {
    "field, infield and padding materials (never touched)": ~gs,
    "outfield wall zone (r 100 to 135 m, y under 12 m; must stay)": gs & (r > 100) & (r < 135) & (y < 12),
    "seats nearest the field (r under 30 m, under 6 m; should go)": gs & (r < 30) & (y < 6) & ~prot,
    "lower bowl, both sides (|bearing| 15 to 80, r 25 to 80, under 20 m; should go)": gs & (np.abs(b) > 15) & (np.abs(b) < 80) & (r > 25) & (r < 80) & (y < 20) & ~prot,
    "upper deck (y 20 to 36 m, r under 110 m; should go)": gs & (y > 20) & (y < 36) & (r < 110) & ~prot,
    "scoreboard box (protected)": sb,
    "Coke cluster box (protected)": coke,
}
say("# Chain-based seat definition on the shipped model (23 Oct 2026): %d edges in %d chains" % (len(S), len(np.unique(roots))))
for C in (1, 2, 3, 5):
    seat = gs & ~prot & (cl < C)
    say("\n## seat detail = structure edge outside the boxes in a chain shorter than %d m: %d edges flagged (%.0f%% of all edges, %.1f%% of edge length)" % (C, seat.sum(), 100 * seat.mean(), 100 * L[seat].sum() / L.sum()))
    for name, m in reg.items():
        if m.sum():
            say("  %-84s n %6d  flagged %5.1f%% of edges, %5.1f%% of their length" % (name, m.sum(), 100 * seat[m].mean(), 100 * L[m & seat].sum() / max(L[m].sum(), 1e-9)))
np.savez_compressed(ROOT + "data/derived/oracle/shipped_chains.npz", S=S.astype(np.float32), chain_len=cl.astype(np.float32), mats=mats)
open(ROOT + "science/seat_chains.md", "w", encoding="utf-8").write("\n".join(out) + "\n")
