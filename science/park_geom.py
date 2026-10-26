"""Shared geometry for the 29-park wireframe work (park_register.py, park_crest.py, park_qa.py).

Frame: the Oracle scene frame used by the web viewer (apps/web/src/main.js): metres, +y up, centre field along -z, right field +x, home plate (the back point of the plate)
at HOME = (0.3, 1.0) in x, z (where the Oracle fit put it; science/wall_crest.py). Bearing 0 = centre field, positive toward right field, foul lines at +-45.

Vertical slices: the park is cut by the vertical half-plane through home plate at each bearing; every triangle that crosses it leaves a segment in (r, y), r = horizontal
distance from home plate. The slice is exact (no sampling) and is what the wall face, the crest height and the QA checks are measured on."""
from __future__ import annotations

import json

import numpy as np

from glb_lite import tris_by_material

ROOT = "C:/Users/andrewwi/dev/nuke-navigator-new/"
GLB = ROOT + "data/raw/drive/park_glbs/Stadium_%s.glb"
FT = 0.3048
HOME = np.array([0.3, 1.0])


def load_registered(team: str, reg: dict | None = None, want=None) -> dict:
    """triangles per material, transformed by the park's registration (identity for SF)"""
    T = tris_by_material(GLB % team, want=want)
    if reg is None:
        reg = json.load(open(ROOT + "data/derived/parks/register/%s.json" % team))
    M = np.array(reg["matrix"], float)  # 4x4 world -> registered
    return {k: (v.reshape(-1, 3) @ M[:3, :3].T + M[:3, 3]).reshape(-1, 3, 3).astype(np.float32) for k, v in T.items()}


class Slicer:
    """vertical slices of a triangle soup around home plate"""

    def __init__(self, T: np.ndarray, rmin: float = 40.0, rmax: float = 220.0, bmax: float = 60.0):
        rel = T.astype(np.float64).copy()
        rel[:, :, 0] -= HOME[0]
        rel[:, :, 2] -= HOME[1]
        r = np.hypot(rel[:, :, 0], rel[:, :, 2])
        b = np.degrees(np.arctan2(rel[:, :, 0], -rel[:, :, 2]))
        keep = (r.max(1) > rmin) & (r.min(1) < rmax) & (np.abs(b).min(1) < bmax) & (r.min(1) > 5.0)
        rel, b = rel[keep], b[keep]
        # a triangle whose vertices straddle the +-180 cut is behind the plate: never in the outfield
        self.rel = rel
        self.bmin, self.bmax = b.min(1), b.max(1)
        self.n = len(rel)

    def slice(self, theta: float, pad: float = 0.0):
        """segments (r1, y1, r2, y2) where the half-plane at bearing theta (degrees) cuts the soup"""
        sel = np.flatnonzero((self.bmin <= theta + pad) & (self.bmax >= theta - pad))
        if not len(sel):
            return np.zeros((0, 4))
        t = np.radians(theta)
        d = np.array([np.sin(t), 0.0, -np.cos(t)])
        nrm = np.array([np.cos(t), 0.0, np.sin(t)])
        V = self.rel[sel]
        s = V @ nrm
        s = np.where(np.abs(s) < 1e-9, 1e-9, s)
        pts = []
        for a, c in ((0, 1), (1, 2), (2, 0)):
            cross = (s[:, a] * s[:, c]) < 0
            f = np.where(cross, s[:, a] / np.where(cross, s[:, a] - s[:, c], 1.0), 0.0)
            P = V[:, a] + f[:, None] * (V[:, c] - V[:, a])
            pts.append((cross, P @ d, P[:, 1]))
        cnt = pts[0][0].astype(int) + pts[1][0] + pts[2][0]
        ok = cnt == 2
        R = np.stack([p[1] for p in pts], 1)
        Y = np.stack([p[2] for p in pts], 1)
        C = np.stack([p[0] for p in pts], 1)
        R, Y, C = R[ok], Y[ok], C[ok]
        # the two crossing edges of each triangle
        order = np.argsort(~C, axis=1, kind="stable")[:, :2]
        r1, r2 = np.take_along_axis(R, order, 1).T
        y1, y2 = np.take_along_axis(Y, order, 1).T
        seg = np.stack([r1, y1, r2, y2], 1)
        seg = seg[(seg[:, 0] > 0) | (seg[:, 2] > 0)]
        sw = seg[:, 0] > seg[:, 2]
        seg[sw] = seg[sw][:, [2, 3, 0, 1]]
        return seg


def profile(seg: np.ndarray, r0: float, r1: float, dr: float = 0.05):
    """upper envelope H(r) of the slice on a grid (nan where nothing)"""
    n = int(round((r1 - r0) / dr)) + 1
    H = np.full(n, -np.inf)
    s = seg[(seg[:, 2] >= r0) & (seg[:, 0] <= r1)]
    if not len(s):
        return np.full(n, np.nan)
    k0 = np.clip(np.ceil((s[:, 0] - r0) / dr).astype(int), 0, n - 1)
    k1 = np.clip(np.floor((s[:, 2] - r0) / dr).astype(int), 0, n - 1)
    # endpoints in their own cells (vertical faces)
    for rr, yy in ((s[:, 0], s[:, 1]), (s[:, 2], s[:, 3])):
        kk = np.round((rr - r0) / dr).astype(int)
        inr = (kk >= 0) & (kk < n)
        np.maximum.at(H, kk[inr], yy[inr])
    L = np.maximum(k1 - k0 + 1, 0)
    if L.sum():
        idx = np.repeat(np.arange(len(s)), L)
        k = np.repeat(k0, L) + (np.arange(L.sum()) - np.repeat(np.cumsum(L) - L, L))
        rr = r0 + k * dr
        span = np.maximum(s[idx, 2] - s[idx, 0], 1e-9)
        f = np.clip((rr - s[idx, 0]) / span, 0, 1)
        np.maximum.at(H, k, s[idx, 1] + f * (s[idx, 3] - s[idx, 1]))
    H[~np.isfinite(H)] = np.nan
    return H


def clip_y(seg: np.ndarray, ycap: float):
    """the slice below ycap only: segments wholly above are dropped, segments crossing it are cut at it"""
    lo = np.minimum(seg[:, 1], seg[:, 3])
    s = seg[lo < ycap].copy()
    for a, b in ((1, 3), (3, 1)):
        m = s[:, a] > ycap
        if m.any():
            ra, rb = (0, 2) if a == 1 else (2, 0)
            f = (ycap - s[m, b]) / (s[m, a] - s[m, b])
            s[m, ra] = s[m, rb] + f * (s[m, ra] - s[m, rb])
            s[m, a] = ycap
    sw = s[:, 0] > s[:, 2]
    s[sw] = s[sw][:, [2, 3, 0, 1]]
    return s


def find_face(seg: np.ndarray, r_start: float, r_end: float, rise: float = 0.5, dr: float = 0.05, ycap: float = 3.5):
    """walk outward from r_start: the wall face is the first radius where the slice's upper envelope rises more than `rise` above the ground just before it
    (ground = median of the envelope over the previous 2 m). Only the slice below ycap counts (the playing field is within 1.5 m of y = 0 in every model), so a
    dome roof, a deck or a scoreboard hanging over the warning track never reads as the wall. Returns (face_r, ground_y) or (nan, nan)."""
    H = profile(clip_y(seg, ycap), r_start, r_end, dr)
    if np.isnan(H).all():
        return np.nan, np.nan
    Hf = H.copy()
    good = np.isfinite(Hf)
    if not good.any():
        return np.nan, np.nan
    Hf[~good] = np.interp(np.flatnonzero(~good), np.flatnonzero(good), Hf[good])
    w = int(2.0 / dr)
    g0 = np.median(Hf[:w])
    for k in range(w, len(Hf)):
        g = np.median(Hf[k - w:k]) if k >= w else g0
        if Hf[k] > g + rise:
            # back up to the first cell of the rise (the face itself)
            j = k
            while j > 0 and Hf[j - 1] > g + 0.25:
                j -= 1
            return r_start + j * dr, g
    return np.nan, np.nan


def crest_top(seg: np.ndarray, face_r: float, ground: float, back: float = 0.3, fwd: float = 0.6, gap: float = 0.3, bridge: float = 1.6):
    """top of the wall: the segments that touch the radius window [face - back, face + fwd] are merged by height, starting from the one that holds
    ground + 0.4 m; a segment joins the run when it starts within `gap` of the run's top, or within `bridge` of it if it stands on the face line itself
    (face +-0.3 m: some models leave the middle of a padded wall open, e.g. Yankee Stadium's 8 ft wall is a 1 m base plus a separate top rail).
    Returns (top_y, r_lo, r_hi of the cap within 0.12 m of the top, candidate levels): the candidates are the run's top and every horizontal piece met on the
    way up; park_crest.py picks among them (a padded wall with a batter's eye or a foul pole standing right behind it has its real top among the candidates)."""
    m = (seg[:, 2] >= face_r - back) & (seg[:, 0] <= face_r + fwd)
    s = seg[m]
    if not len(s):
        return np.nan, np.nan, np.nan
    lo = np.minimum(s[:, 1], s[:, 3])
    hi = np.maximum(s[:, 1], s[:, 3])
    o = np.argsort(lo)
    lo, hi, s = lo[o], hi[o], s[o]
    online = (s[:, 2] >= face_r - 0.3) & (s[:, 0] <= face_r + 0.3)
    start = ground + 0.4
    top = None
    levels = []  # horizontal pieces met on the way up (a cap, a ledge, a rail top): the candidate crests
    for (r1, y1, r2, y2), a, b, on in zip(s, lo, hi, online):
        if top is None:
            if b >= start and a <= start + gap:
                top = b
            elif a > start + gap:
                break
            else:
                continue
        elif a <= top + gap or (on and a <= top + bridge):
            top = max(top, b)
        elif not on:
            continue  # a piece behind the face that starts higher up (a seat row, a deck): skip it, a face piece may still follow
        else:
            break
        if b - a < 0.03 and abs(r2 - r1) >= 0.03 and b >= ground + 0.5:  # a horizontal piece at least wall-high (never the field itself)
            levels.append(b)
    if top is None:
        return np.nan, np.nan, np.nan, []
    levels.append(top)
    levels = sorted(set(float(v) for v in np.round(levels, 3)))
    merged = []
    for y in levels:  # levels within 8 cm are one level (the higher)
        if merged and y - merged[-1] <= 0.08:
            merged[-1] = y
        else:
            merged.append(y)
    return top, *cap_of(s, top, face_r, back), merged


def cap_of(s, level, face_r, back=0.3):
    """radius extent of the horizontal surface at `level` (segment points within 0.12 m of it) near the face"""
    cap = []
    for r1, y1, r2, y2 in s:
        for rr, yy in ((r1, y1), (r2, y2)):
            if abs(yy - level) <= 0.12 and face_r - back <= rr <= face_r + 1.0:
                cap.append(rr)
        if abs(y1 - level) <= 0.12 and abs(y2 - level) <= 0.12:
            cap += [max(r1, face_r - back), min(r2, face_r + 1.0)]
    cap = np.array(cap) if cap else np.array([face_r])
    return cap.min(), cap.max()


def savant_rows():
    import pandas as pd
    return pd.read_csv(ROOT + "data/derived/parks/savant_fence_by_year.csv")


# Savant's "gap" distances sit at about +-18 degrees, not +-22.5: on every model checked the fence reaches the gap number at 17 to 19 degrees (scratch/parks_qa/gap_bearing.py; pooled fit in park_qa.py)
SAV_B = np.array([-45.0, -18.0, 0.0, 18.0, 45.0])
SAV_D = ["dist_lf_line", "dist_lf_gap", "dist_cf", "dist_rf_gap", "dist_rf_line"]
SAV_H = ["height_lf_line", "height_lf_gap", "height_cf", "height_rf_gap", "height_rf_line"]
# candidate venues per GLB (team code -> venue ids the team has used since 2015, newest first); the GLB's venue is the one whose fences it matches
CANDIDATES = {"ARI": [15], "ATH": [2529, 10], "ATL": [4705], "BAL": [2], "BOS": [3], "CHC": [17], "CIN": [2602], "CLE": [5], "COL": [19], "CWS": [4], "DET": [2394],
              "HOU": [2392], "KC": [7], "LAA": [1], "LAD": [22], "MIA": [4169], "MIL": [32], "MIN": [3312], "NYM": [3289], "NYY": [3313], "PHI": [2681], "PIT": [31],
              "SD": [2680], "SEA": [680], "SF": [2395], "STL": [2889], "TB": [12, 2523], "TEX": [5325], "TOR": [14], "WSH": [3309]}
TEAMS = sorted(CANDIDATES)
