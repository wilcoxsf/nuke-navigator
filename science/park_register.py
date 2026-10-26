"""Registration of the 30 park models (data/raw/drive/park_glbs/Stadium_<TEAM>.glb, private) into the Oracle scene frame (park_geom.py: metres, centre field -z,
home plate at (0.3, 1.0)), and a check of the result against Baseball Savant's measured fence distances at five bearings.

Home plate is not marked in the models. Every model's infield grass (the *_Infield material, flat at y = 0; also spelled _infield and _lnfield) is rasterized on a
4 cm grid. In most models the pitcher's mound is cut out of the grass as a circle, and the grass is mirror-symmetric about the line from home plate through the mound:
  mound centre = centroid of the enclosed hole in the grass (its radius is printed: 2.7 to 3.2 m)
  centre-field axis = the mirror line of the grass through the mound centre (searched to 0.005 degree); used only when the mirror fit is clean (mismatch under 0.5%
                      of the grass), else 0 (every clean fit came out within 0.07 degree of the model's own -z axis, except PIT 0.21)
  home plate = 59 ft from the mound centre along that axis toward the catcher (MLB rule 2.01: the mound circle's centre is 59 ft from the back point of home plate)
Without a mound hole (Detroit) the models' common convention is used: home plate at the model origin, centre field along -z (every other model puts its rule-geometry
home plate within 0.3 m of the origin). SF keeps the identity transform: the Oracle frame IS the SF model's own frame (the rule-geometry plate is printed for comparison
with the fitted (0.3, 1.0) the Oracle work uses).

Validation: the wall face on exact vertical slices of the registered model (park_geom.find_face: first rise of more than 0.5 m above the ground just before it, walking
out from 75% of the Savant distance), median over +-0.5 degree at each Savant bearing (lines +-45, gaps +-18 [where Savant's gap numbers sit; see park_geom.SAV_B],
centre 0), against the latest Savant season of each candidate venue (the A's and Rays models are matched to whichever venue they fit), plus the season that fits best.

Usage: python science/park_register.py [TEAM ...]
Output: data/derived/parks/register/<TEAM>.json (matrix 4x4 raw model world -> scene, home, axis, mound fit, venue, fence check) and summary.csv"""
from __future__ import annotations

import json
import os
import sys
import time

import numpy as np
from scipy import ndimage

from glb_lite import tris_by_material
from park_geom import CANDIDATES, FT, GLB, HOME, ROOT, SAV_B, SAV_D, SAV_H, TEAMS, Slicer, find_face, savant_rows

OUT = ROOT + "data/derived/parks/register/"
CELL = 0.04


def raster(T: np.ndarray):
    """grass mask on a CELL grid: (mask, x0, z0)"""
    P = T[:, :, [0, 2]].astype(np.float64)
    x0, z0 = P[:, :, 0].min() - 1, P[:, :, 1].min() - 1
    nx, nz = int((P[:, :, 0].max() + 1 - x0) / CELL) + 1, int((P[:, :, 1].max() + 1 - z0) / CELL) + 1
    M = np.zeros((nz, nx), bool)
    for (ax, az), (bx, bz), (cx, cz) in P:
        i0, i1 = int((min(ax, bx, cx) - x0) / CELL), int((max(ax, bx, cx) - x0) / CELL) + 1
        j0, j1 = int((min(az, bz, cz) - z0) / CELL), int((max(az, bz, cz) - z0) / CELL) + 1
        X, Z = np.meshgrid(x0 + (np.arange(i0, i1 + 1) + 0.5) * CELL, z0 + (np.arange(j0, j1 + 1) + 0.5) * CELL)
        d = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz)
        if abs(d) < 1e-12:
            continue
        a = ((bz - cz) * (X - cx) + (cx - bx) * (Z - cz)) / d
        b = ((cz - az) * (X - cx) + (ax - cx) * (Z - cz)) / d
        inside = (a >= -1e-9) & (b >= -1e-9) & (1 - a - b >= -1e-9)
        M[j0:j1 + 1, i0:i1 + 1] |= inside
    return M, x0, z0


def mound_hole(M, x0, z0):
    lab, n = ndimage.label(~M)
    best = None
    for k in range(1, n + 1):
        jj, ii = np.nonzero(lab == k)
        if jj.min() == 0 or ii.min() == 0 or jj.max() == M.shape[0] - 1 or ii.max() == M.shape[1] - 1:
            continue  # touches the border: outside the grass
        area = len(jj) * CELL * CELL
        if 12 < area < 50:
            c = np.array([x0 + (ii.mean() + 0.5) * CELL, z0 + (jj.mean() + 0.5) * CELL])
            if best is None or abs(area - 30) < abs(best[1] - 30):
                best = (c, area)
    if best is None:
        return None, None
    return best[0], float(np.sqrt(best[1] / np.pi))


def mirror_axis(M, x0, z0, m):
    jj, ii = np.nonzero(M)
    X, Z = x0 + (ii + 0.5) * CELL - m[0], z0 + (jj + 0.5) * CELL - m[1]

    def cost(a):
        t = np.radians(a)
        u = np.array([np.sin(t), -np.cos(t)])
        v = np.array([np.cos(t), np.sin(t)])
        al, ac = X * u[0] + Z * u[1], X * v[0] + Z * v[1]
        RX, RZ = m[0] + al * u[0] - ac * v[0], m[1] + al * u[1] - ac * v[1]
        i2, j2 = ((RX - x0) / CELL).astype(int), ((RZ - z0) / CELL).astype(int)
        ok = (i2 >= 0) & (i2 < M.shape[1]) & (j2 >= 0) & (j2 < M.shape[0])
        hit = np.zeros(len(X), bool)
        hit[ok] = M[j2[ok], i2[ok]]
        return 1 - hit.mean()

    grid = np.arange(-3, 3.001, 0.05)
    c = np.array([cost(a) for a in grid])
    a0 = grid[np.argmin(c)]
    fine = np.arange(a0 - 0.06, a0 + 0.0601, 0.005)
    cf = np.array([cost(a) for a in fine])
    return float(fine[np.argmin(cf)]), float(cf.min()), float(cost(0.0))


def matrix_for(home_raw, a_deg):
    t = np.radians(a_deg)
    c, s = np.cos(t), np.sin(t)
    R = np.array([[c, 0, s], [0, 1, 0], [-s, 0, c]])
    M = np.eye(4)
    M[:3, :3] = R
    M[:3, 3] = np.array([HOME[0], 0, HOME[1]]) - R @ np.array([home_raw[0], 0, home_raw[1]])
    return M


def geometry(team):
    T = tris_by_material(GLB % team, want=lambda m: "nfield" in m.lower())
    T = np.concatenate(list(T.values()))
    G, x0, z0 = raster(T)
    m, r_m = mound_hole(G, x0, z0)
    if m is None:
        jj, ii = np.nonzero(G)
        cen = np.array([x0 + (ii.mean() + 0.5) * CELL, z0 + (jj.mean() + 0.5) * CELL])
        a, cost, cost0 = mirror_axis(G, x0, z0, cen)
        return dict(method="convention (no mound hole in the grass): home at the model origin, centre field -z", mound=None, mound_r=None, axis=0.0,
                    axis_fit=a, mirror_cost=cost, mirror_cost0=cost0, home=np.zeros(2))
    a, cost, cost0 = mirror_axis(G, x0, z0, m)
    use = a if cost < 0.005 else 0.0
    t = np.radians(use)
    u_home = -np.array([np.sin(t), -np.cos(t)])
    return dict(method="mound + 59 ft along the %s axis" % ("mirror" if cost < 0.005 else "model -z (mirror fit not clean)"), mound=m, mound_r=r_m, axis=use, axis_fit=a,
                mirror_cost=cost, mirror_cost0=cost0, home=m + 59 * FT * u_home)


def fence_check(team, M):
    T = tris_by_material(GLB % team)
    A = np.concatenate([v for v in T.values()]).reshape(-1, 3) @ M[:3, :3].T + M[:3, 3]
    S = Slicer(A.reshape(-1, 3, 3).astype(np.float32), rmin=60)
    sav = savant_rows()
    out, best = {}, None
    cache = {}
    for vid in CANDIDATES[team]:
        sv = sav[sav.venue_id == vid].sort_values("season")
        if not len(sv):
            continue
        res = []
        for _, row in sv.iterrows():
            d_ft = np.array([row[c] for c in SAV_D], float)
            faces = []
            for b, d in zip(SAV_B, d_ft):
                key = (b, round(d))
                if key not in cache:
                    fr = [find_face(S.slice(bb), 0.75 * d * FT, d * FT + 25)[0] for bb in np.arange(b - 0.5, b + 0.501, 0.25)]
                    cache[key] = np.nanmedian(fr) / FT if np.isfinite(fr).any() else np.nan
                faces.append(cache[key])
            err = np.array(faces) - d_ft
            res.append(dict(venue_id=int(vid), venue=row.venue_name, season=int(row.season), savant_ft=d_ft.round(1).tolist(), model_ft=np.round(faces, 1).tolist(),
                            err_ft=np.round(err, 1).tolist(), savant_h_ft=[float(row[c]) for c in SAV_H], mae=float(np.nanmean(np.abs(err))), n_nan=int(np.isnan(err).sum())))
        latest = res[-1]
        best_season = min(res, key=lambda r: (r["mae"], -r["season"]))
        out[int(vid)] = dict(latest=latest, best_season=best_season)
        if best is None or latest["mae"] < best["latest"]["mae"]:
            best = out[int(vid)]
    return best, out


def main():
    teams = sys.argv[1:] or TEAMS
    os.makedirs(OUT, exist_ok=True)
    rows = []
    for team in teams:
        t0 = time.time()
        g = geometry(team)
        M = np.eye(4) if team == "SF" else matrix_for(g["home"], g["axis"])
        best, allv = fence_check(team, M)
        L, B = best["latest"], best["best_season"]
        rec = dict(team=team, matrix=M.tolist(), method=g["method"], home_raw=np.round(g["home"], 4).tolist(), axis_deg=round(g["axis"], 4), axis_fit_deg=round(g["axis_fit"], 4),
                   mirror_mismatch=round(g["mirror_cost"], 5), mirror_mismatch_at_0=round(g["mirror_cost0"], 5),
                   mound_raw=None if g["mound"] is None else np.round(g["mound"], 4).tolist(), mound_r_m=None if g["mound_r"] is None else round(g["mound_r"], 3),
                   venue_id=L["venue_id"], venue=L["venue"], fence=L, fence_best_season=B, fence_all={k: v for k, v in allv.items()}, secs=round(time.time() - t0, 1))
        if team == "SF":
            rec["note"] = "identity: the Oracle frame is the SF model's own; the rule-geometry home plate is home_raw, the Oracle fit uses (0.3, 1.0)"
        json.dump(rec, open(OUT + team + ".json", "w"), indent=1)
        print("%-4s %-46s axis %+.3f (fit %+.3f, mismatch %.4f)  home raw (%+.2f, %+.2f)  %s %d err ft %s | best season %d err %s  %.0fs" % (
            team, g["method"][:46], g["axis"], g["axis_fit"], g["mirror_cost"], *g["home"], L["venue"], L["season"], L["err_ft"], B["season"], B["err_ft"], time.time() - t0), flush=True)
        rows.append(dict(team=team, method=g["method"], axis_deg=g["axis"], home_x=g["home"][0], home_z=g["home"][1], mound_r=g["mound_r"], venue=L["venue"], season=L["season"],
                         **{"err_" + k: v for k, v in zip(["lf", "lc", "cf", "rc", "rf"], L["err_ft"])}, best_season=B["season"], best_mae=B["mae"]))
    import pandas as pd
    df = pd.DataFrame(rows)
    if not sys.argv[1:]:
        df.to_csv(OUT + "summary.csv", index=False)
    E = df[[c for c in df.columns if c.startswith("err_")]].to_numpy(float)
    print("all bearings: median error %+.2f ft, median |error| %.2f ft, 90th pct |error| %.2f ft" % (np.nanmedian(E), np.nanmedian(np.abs(E)), np.nanpercentile(np.abs(E), 90)))


if __name__ == "__main__":
    main()
