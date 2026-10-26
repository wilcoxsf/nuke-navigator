"""The home-run line (the crest of the outfield wall, foul pole to foul pole) for the other 29 parks, in the schema of apps/web/public/oracle_crest.json.
science/wall_crest.py (Oracle) is left as it is; this is the same idea on exact vertical slices of the registered model (park_register.py, park_geom.py):
  wall face  = walking out along each bearing (0.25 degree steps, -46 to +46), the first radius where the model rises more than 0.5 m above the ground just
               before it; only the slice below 3.5 m counts there, so dome roofs and overhangs are never taken for the wall (park_geom.find_face)
  height     = candidate tops from the slice's segments touching the face (0.3 m in front to 0.6 m behind), merged upward from the ground while they touch or
               stand on the face line (park_geom.crest_top: every horizontal piece met on the way up, and the run's top); then ONE level per bearing is picked over
               all 369 bearings at once (pick_levels, dynamic programming): close to Savant's measured wall height for the season the model's fences match
               (full weight within 4 degrees of Savant's five bearings, a fifth in between), smooth along the wall, a fee per step. So a foul pole, a batter's eye or a
               seat fascia standing right behind the wall is not taken for its top, while real steps (the Monster's end, Houston's scoreboard) stay. A bearing may borrow
               its neighbours' levels within 0.5 degree (a gap in the model); a rail up to 0.25 m above the picked level is taken as part of it (else it hides the line)
  cleanup    = face samples more than 1.5 m from the median of their 9 neighbours dropped and interpolated (a post or a gap); heights: running median over
               +-0.5 degree; face: 5-sample median then 5-sample mean (ray-step jitter), as in wall_crest.py
  line       = a hand's width (up to 0.15 m, never past the wall's own top) behind the face, 0.08 m above the top (LIFT, as for Oracle)
  ribbon     = the wall's top surface from the slice, up to 0.45 m each side of the line, narrowed where the surface ends (zero width on a wall with no top)
Usage: python science/park_crest.py [TEAM ...]   (SF goes to scratch/parks_qa/SF_crest.json for a method check against oracle_crest.json, never to public)
Output: apps/web/public/parks/<TEAM>/crest.json (git-ignored: derived from the private models)"""
from __future__ import annotations

import json
import os
import sys
import time

import numpy as np

from park_geom import FT, HOME, ROOT, SAV_B, TEAMS, Slicer, cap_of, crest_top, find_face, load_registered

LIFT = 0.08
TH = np.arange(-46.0, 46.01, 0.25)


def prior_distance(reg):
    """Savant's latest distances (the venue the model matched), interpolated by bearing: only used to start the outward walk (75% of it) and bound it (+40 m)"""
    d = np.array(reg["fence"]["savant_ft"], float) * FT
    return np.interp(TH, SAV_B, d)


def med(a, k):
    return np.array([np.nanmedian(a[max(0, i - k):i + k + 1]) for i in range(len(a))])


def prior_height(reg):
    """Savant's wall heights (m) for the season whose fences the model matches best, by bearing, and how much to trust that number at each bearing
    (full weight within 4 degrees of a measured bearing, a fifth of it in between, where the interpolation knows nothing about steps)"""
    h = np.array(reg["fence_best_season"]["savant_h_ft"], float) * FT
    w = np.where(np.min(np.abs(TH[:, None] - SAV_B[None, :]), 1) <= 4, 1.0, 0.2)
    return np.interp(TH, SAV_B, h), w


def pick_levels(cands, prior, w, own=None, lam=0.6, jump=0.3, borrow=0.3):
    """one level per bearing among the model's candidate levels (heights above the ground): least total of the distance to Savant's height (weighted, capped
    at 4 m) plus lam per metre of change between neighbouring bearings plus a fee per step; a foul pole, a batter's eye or a deck behind the wall is a
    candidate that costs more than the wall top beside it (dynamic programming over the 369 bearings)"""
    n = len(cands)
    own = own or [np.ones(len(c), bool) for c in cands]
    unary = lambda i: w[i] * np.minimum(np.abs(np.array(cands[i]) - prior[i]), 4.0) + borrow * ~own[i]
    cost = [unary(0)]
    back = []
    for i in range(1, n):
        c, p = np.array(cands[i]), np.array(cands[i - 1])
        d = np.abs(c[:, None] - p[None, :])
        tr = cost[-1][None, :] + lam * d + jump * (d > 0.15)
        k = tr.argmin(1)
        back.append(k)
        cost.append(tr[np.arange(len(c)), k] + unary(i))
    sel = [int(np.argmin(cost[-1]))]
    for i in range(n - 1, 0, -1):
        sel.append(int(back[i - 1][sel[-1]]))
    return sel[::-1]


def crest(team, reg, verbose=True):
    T = load_registered(team, reg)
    S = Slicer(np.concatenate(list(T.values())), rmin=50)
    d0 = prior_distance(reg)
    hp, hw = prior_height(reg)
    n = len(TH)
    face, ground, top = (np.full(n, np.nan) for _ in range(3))
    levels, caps = [None] * n, [None] * n
    for i, th in enumerate(TH):
        seg = S.slice(th)
        f, g = find_face(seg, 0.75 * d0[i], d0[i] + 40)
        if not np.isfinite(f):
            continue
        face[i], ground[i] = f, g
        t, _, _, lv = crest_top(seg, f, g)
        if np.isfinite(t) and lv:
            top[i] = t
            win = seg[(seg[:, 2] >= f - 0.3) & (seg[:, 0] <= f + 0.6)]
            levels[i] = lv
            caps[i] = [cap_of(win, L, f) for L in lv]
    have_r = np.isfinite(face)
    fm = med(face, 4)
    okf = have_r & (np.abs(face - fm) <= 1.5)
    have_y = okf & np.isfinite(top)
    face_c = np.where(okf, face, np.interp(TH, TH[okf], face[okf]))
    # candidates for every bearing: its own levels plus those of its neighbours within 0.5 degree (a slice that runs through a gap or up a foul pole can then
    # carry the wall top across; a borrowed level costs a little more and gets no ribbon). A bearing with nothing near takes its nearest neighbour's.
    have_y &= np.array([lv is not None for lv in levels])
    idx_y = np.flatnonzero(have_y)
    gnd = np.where(np.isfinite(ground), ground, np.nanmedian(ground))
    cands, meta = [], []
    for i in range(n):
        own = [i] if have_y[i] else []
        near = [j for j in range(max(0, i - 2), min(n, i + 3)) if j != i and have_y[j]]
        if not own and not near:
            near = [int(idx_y[np.argmin(np.abs(idx_y - i))])]
        c, m = [], []
        for j in own + near:
            for L, cp in zip(levels[j], caps[j]):
                c.append(L - gnd[j])  # heights above the ground
                m.append((L, cp, j == i))
        cands.append(np.array(c))
        meta.append(m)
    sel = pick_levels(cands, hp, hw, own=[np.array([x[2] for x in m]) for m in meta])
    # a rail or cap standing up to 0.25 m above the chosen top is part of it: take the highest such level, or the line would sit just under it and be hidden by it
    for i in range(n):
        L0 = meta[i][sel[i]][0]
        up = [k for k, (L, _, o) in enumerate(meta[i]) if o == meta[i][sel[i]][2] and L0 <= L <= L0 + 0.25]
        sel[i] = max(up, key=lambda k: meta[i][k][0]) if up else sel[i]
    y = np.array([meta[i][sel[i]][0] for i in range(n)])
    cap_lo = np.array([meta[i][sel[i]][1][0] for i in range(n)])
    cap_hi = np.array([meta[i][sel[i]][1][1] for i in range(n)])
    own_sel = np.array([meta[i][sel[i]][2] for i in range(n)])
    top = np.where(have_y & own_sel, y, np.nan)
    have_y = have_y & own_sel
    y_s = med(y, 2)
    fc5 = med(face_c, 2)
    fc5 = np.array([fc5[max(0, i - 2):i + 3].mean() for i in range(n)])
    w_top = np.where(have_y, np.clip(cap_hi - face_c, 0, None), 0.0)
    r_line = fc5 + np.minimum(0.15, w_top / 2)
    # ribbon: the top surface around the line, only where the top was measured and is level with the smoothed height
    snapped = have_y & (np.abs(top - y_s) <= 0.3)
    r_in = np.where(snapped, np.maximum(r_line - 0.45, np.minimum(cap_lo, r_line)), r_line)
    r_out = np.where(snapped, np.minimum(r_line + 0.45, np.maximum(cap_hi, r_line)), r_line)
    out = {"bearing": TH.round(3).tolist(), "radius": r_line.round(3).tolist(), "height": (y_s + LIFT).round(3).tolist(), "snapped": snapped.astype(int).tolist(),
           "ribbon": {"r_in": r_in.round(3).tolist(), "y_in": (y_s + 0.02).round(3).tolist(), "r_out": r_out.round(3).tolist(), "y_out": (y_s + 0.02).round(3).tolist(),
                      "y_mid": (y_s + 0.02).round(3).tolist()},
           "radius_from_model": okf.astype(int).tolist(), "height_from_model": have_y.astype(int).tolist(), "lift": LIFT, "home": HOME.tolist(),
           "park": team, "venue": reg["venue"], "ground": np.round(np.where(np.isfinite(ground), ground, np.nan), 3).tolist()}
    out["ground"] = [None if not np.isfinite(v) else v for v in out["ground"]]
    if verbose:
        print("%s: face found at %d of %d bearings (%d kept), top at %d, ribbon at %d; radius %.1f..%.1f m, height %.2f..%.2f m" % (
            team, have_r.sum(), n, okf.sum(), have_y.sum(), snapped.sum(), r_line.min(), r_line.max(), y_s.min(), y_s.max()), flush=True)
    return out


def main():
    args = sys.argv[1:]
    teams = [a for a in args if not a.startswith("--")] or [t for t in TEAMS if t != "SF"]
    for team in teams:
        t0 = time.time()
        reg = json.load(open(ROOT + "data/derived/parks/register/%s.json" % team))
        out = crest(team, reg)
        if team == "SF":
            path = ROOT + "scratch/parks_qa/SF_crest.json"
        else:
            os.makedirs(ROOT + "apps/web/public/parks/" + team, exist_ok=True)
            path = ROOT + "apps/web/public/parks/%s/crest.json" % team
        json.dump(out, open(path, "w"))
        print("  wrote", path, "%.0fs" % (time.time() - t0), flush=True)


if __name__ == "__main__":
    main()
