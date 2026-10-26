"""Numeric QA of the per-park home-run line (apps/web/public/parks/<TEAM>/crest.json, from park_crest.py) on the registered models. Per park:
  fence    the line's radius at Savant's five bearings (median over +-0.5 degree, less the hand's width it sits behind the face) minus Savant's latest distance, ft
  float    crest_float_check.py's test: a vertical ray under every line sample; gap = line height minus the nearest surface under it (the LIFT of 0.08 m is the target);
           count of samples more than 0.3 m from any surface and of samples with no surface under them
  face     the line against an independent wall face: the first surface the slice meets at 0.3 m below the crest, walking out; line radius minus that, m
  height   wall height at the five bearings (line height less LIFT, less the ground at the face) minus Savant's height, ft
plus, for SF, the generalized method against the shipped oracle_crest.json (a method check; SF itself is not changed).
Usage: python science/park_qa.py [TEAM ...]   Output: science/park_qa.md (table) and data/derived/parks/register/qa.json"""
from __future__ import annotations

import json
import sys

import numpy as np

from park_geom import FT, HOME, ROOT, SAV_B, TEAMS, Slicer, load_registered


def vertical_hits(T):
    X, Z = T[:, :, 0], T[:, :, 2]
    xmin, xmax, zmin, zmax = X.min(1), X.max(1), Z.min(1), Z.max(1)

    def hits(x, z):
        idx = np.flatnonzero((xmin <= x) & (xmax >= x) & (zmin <= z) & (zmax >= z))
        if not len(idx):
            return np.empty(0)
        t = T[idx].astype(np.float64)
        x0, y0, z0, x1, y1, z1, x2, y2, z2 = (t[:, k // 3, k % 3] for k in range(9))
        d = (z1 - z2) * (x0 - x2) + (x2 - x1) * (z0 - z2)
        ok = np.abs(d) > 1e-12
        d = np.where(ok, d, 1.0)
        a = ((z1 - z2) * (x - x2) + (x2 - x1) * (z - z2)) / d
        b = ((z2 - z0) * (x - x2) + (x0 - x2) * (z - z2)) / d
        g = 1 - a - b
        ok &= (a >= -1e-6) & (b >= -1e-6) & (g >= -1e-6)
        return (a * y0 + b * y1 + g * y2)[ok]
    return hits


def first_cross(seg, y, r0):
    """smallest radius beyond r0 where a slice segment passes height y"""
    lo, hi = np.minimum(seg[:, 1], seg[:, 3]), np.maximum(seg[:, 1], seg[:, 3])
    m = (lo <= y) & (hi >= y)
    s = seg[m]
    if not len(s):
        return np.nan
    dy = s[:, 3] - s[:, 1]
    f = np.where(np.abs(dy) > 1e-9, (y - s[:, 1]) / np.where(np.abs(dy) > 1e-9, dy, 1), 0.0)
    r = s[:, 0] + f * (s[:, 2] - s[:, 0])
    r = r[r > r0]
    return r.min() if len(r) else np.nan


def qa(team, crest, reg):
    T = load_registered(team, reg)
    A = np.concatenate(list(T.values()))
    th, rad, ht = np.array(crest["bearing"]), np.array(crest["radius"]), np.array(crest["height"])
    lift = crest.get("lift", 0.08)
    rel = A.astype(np.float64)
    rc = np.hypot(rel[:, :, 0].mean(1) - HOME[0], rel[:, :, 2].mean(1) - HOME[1])
    near = A[(rc > rad.min() - 20) & (rc < rad.max() + 20)]
    hits = vertical_hits(near)
    gap, nh = np.full(len(th), np.nan), np.zeros(len(th), int)
    for i in range(len(th)):
        t = np.radians(th[i])
        h = hits(HOME[0] + rad[i] * np.sin(t), HOME[1] - rad[i] * np.cos(t))
        nh[i] = len(h)
        if len(h):
            gap[i] = ht[i] - h[np.argmin(np.abs(h - ht[i]))]
    S = Slicer(A, rmin=50)
    dface, ground_at, dnear = np.full(len(th), np.nan), np.full(len(th), np.nan), np.full(len(th), np.nan)
    for i in range(len(th)):
        seg = S.slice(th[i])
        g = crest.get("ground", [None] * len(th))[i]
        ground_at[i] = g if g is not None else np.nan
        y = ht[i] - lift - 0.3
        f = first_cross(seg, y, 0.75 * rad[i])
        dface[i] = rad[i] - f
        # nearest model surface to the line point (less its lift) inside the slice: how far the line sits from the wall it is drawn on, thin walls included
        P = np.array([rad[i], ht[i] - lift])
        A2, B2 = seg[:, :2], seg[:, 2:]
        D = B2 - A2
        tt = np.clip(((P - A2) * D).sum(1) / np.maximum((D * D).sum(1), 1e-12), 0, 1)
        if len(seg):
            dnear[i] = np.hypot(*(A2 + tt[:, None] * D - P).T).min()
    sav, best = reg["fence"], reg["fence_best_season"]
    fence_err, fence_err_b, h_err, h_err_b, h_mod = [], [], [], [], []
    for k, b in enumerate(SAV_B):
        m = np.abs(th - b) <= 0.5
        r = np.median(rad[m]) - 0.15
        fence_err.append((r / FT) - sav["savant_ft"][k])
        fence_err_b.append((r / FT) - best["savant_ft"][k])
        hm = np.median((ht - lift - np.nan_to_num(ground_at, nan=0.0))[m]) / FT
        h_mod.append(hm)
        h_err.append(hm - sav["savant_h_ft"][k])
        h_err_b.append(hm - best["savant_h_ft"][k])
    dr, dh = np.abs(np.diff(rad)), np.abs(np.diff(ht))
    out = dict(team=team, venue=reg["venue"], season=sav["season"], best_season=best["season"],
               fence_err_ft=np.round(fence_err, 1).tolist(), max_abs_fence_err_ft=float(np.nanmax(np.abs(fence_err))),
               best_season_err_ft=np.round(fence_err_b, 1).tolist(), max_abs_best_err_ft=float(np.nanmax(np.abs(fence_err_b))),
               height_err_best_ft=np.round(h_err_b, 1).tolist(), max_step_radius_m=float(dr.max()), max_step_height_m=float(dh.max()), steps_over_1m=int((dh > 1).sum()),
               float_median_gap_m=float(np.nanmedian(gap)), float_p90_abs_m=float(np.nanpercentile(np.abs(gap - lift), 90)),
               float_over_0p3=int(np.sum(np.abs(gap) > 0.3)), float_no_surface=int((nh == 0).sum()),
               face_median_m=float(np.nanmedian(dface)), face_p95_abs_m=float(np.nanpercentile(np.abs(dface), 95)), face_nan=int(np.isnan(dface).sum()),
               near_median_m=float(np.nanmedian(dnear)), near_p95_m=float(np.nanpercentile(dnear, 95)), near_over_0p3=int(np.sum(dnear > 0.3)),
               height_model_ft=np.round(h_mod, 1).tolist(), height_savant_ft=sav["savant_h_ft"], height_err_ft=np.round(h_err, 1).tolist(),
               snapped=int(np.sum(crest["snapped"])), n=len(th))
    worst = np.argsort(-np.nan_to_num(np.abs(gap), nan=9))[:8]
    out["float_worst"] = ["%.2f(%+.2f)" % (th[i], gap[i]) for i in worst]
    return out


def main():
    teams = sys.argv[1:] or [t for t in TEAMS if t != "SF"]
    res = {}
    try:
        res = json.load(open(ROOT + "data/derived/parks/register/qa.json"))
    except Exception:
        pass
    for team in teams:
        reg = json.load(open(ROOT + "data/derived/parks/register/%s.json" % team))
        path = ROOT + ("scratch/parks_qa/SF_crest.json" if team == "SF" else "apps/web/public/parks/%s/crest.json" % team)
        c = json.load(open(path))
        r = qa(team, c, reg)
        if team == "SF":
            o = json.load(open(ROOT + "apps/web/public/oracle_crest.json"))
            r["vs_oracle_radius_m"] = np.round(np.percentile(np.array(c["radius"]) - np.array(o["radius"]), [5, 50, 95]), 2).tolist()
            r["vs_oracle_height_m"] = np.round(np.percentile(np.array(c["height"]) - np.array(o["height"]), [5, 50, 95]), 2).tolist()
        res[team] = r
        print(team, json.dumps({k: v for k, v in r.items()}), flush=True)
    json.dump(res, open(ROOT + "data/derived/parks/register/qa.json", "w"), indent=1)
    lines = ["# Per-park home-run line QA (science/park_qa.py)", "",
             "fence: the line's radius at Savant's bearings (LF line -45, LC -18, CF 0, RC +18, RF line +45; Savant's gap numbers sit near +-18, not +-22.5) minus Savant's distance, ft, for the latest season and for the season the model fits best (the models are not all current). "
             "float: crest_float_check.py's vertical-ray test, line height minus the surface under it (target +0.08 m, the lift), and the count of samples more than 0.3 m off; a thin wall (a plane with no top, e.g. the Green Monster) has no surface under the line, so this count is high there by construction. "
             "near: distance from the line (less its lift) to the nearest model surface in the vertical slice, m (median and 95th percentile; the meaningful sits-on-the-wall test for thin walls). "
             "height: wall height at the five bearings minus Savant's for the best-fitting season, ft. step: the largest height change between neighbouring 0.25 degree samples, m (real steps exist: the Monster's end, Houston's scoreboard).", "",
             "| park | venue | fence err ft, latest season | max abs | best season | fence err ft, best season | float median m | float >0.3 m | near median m | near p95 m | height err ft (best season) | step m |",
             "|---|---|---|---|---|---|---|---|---|---|---|---|"]
    for t in sorted(res):
        r = res[t]
        lines.append("| %s | %s | %s | %.1f | %d | %s | %+.2f | %d | %.2f | %.2f | %s | %.1f |" % (t, r["venue"], " ".join("%+.1f" % v for v in r["fence_err_ft"]), r["max_abs_fence_err_ft"],
                     r["best_season"], " ".join("%+.1f" % v for v in r["best_season_err_ft"]), r["float_median_gap_m"], r["float_over_0p3"], r["near_median_m"], r["near_p95_m"],
                     " ".join("%+.1f" % v for v in r["height_err_best_ft"]), r["max_step_height_m"]))
    open(ROOT + "science/park_qa.md", "w", encoding="utf-8").write("\n".join(lines) + "\n")


if __name__ == "__main__":
    main()
