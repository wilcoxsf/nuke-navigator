"""Oracle Park's wall, rebuilt from three sources (10 Nov 2026; Andrew: "Yeah let's build real wall models for the stadiums ... I'm fine investing extra juice in
oracle"). The app's wall (apps/web/public/oracle_wall.json) came from ray-casting the park model: good shape, but right-center was a 421 ft placeholder and the
height there assumed ("model era ambiguous"); science/otherpark_study.md found the app's physics calling 7.9% of contested Oracle balls wrong, nearly all real home
runs it said stayed in, in right-center and down the right-field line.
  1. The prior: the park model's shape, shifted to pass through Savant's measured 2023-2026 fence (distance and height at the five Savant bearings,
     data/derived/parks/savant_fence_by_year.csv); in right-center (4 to 21 deg), where the model had a placeholder, and left-center (-14 to -5 deg), where the stands contaminate it, Savant's line instead.
  2. The balls: every 2020-2026 ball at Oracle (after the 2020 fence change) in play near the wall, flown along its real bearing with its carry tuned so the
     physics lands at its real distance (the app's way); its height on a 1 ft grid of distances.
  3. The fit: knots every 3 deg from -45 to +45, a distance and a height correction at each, so that P(out) = logistic((height crossing the wall - wall height) / s)
     best matches the real outcomes; ridge toward the prior (the corrections stay small unless the balls insist) and a smoothness penalty between knots.
Checked fairly: fit on 2020-2024, scored on 2025-2026, against the app's current wall, Savant's five points alone, and the prior. Then refit on all of 2020-2026
and written as apps/web/public/oracle_wall.json (the app's format; the old one kept as oracle_wall_v1.json) and science/oracle_wall_fit.md.
Usage: python science/oracle_wall_fit.py [--write]"""
import argparse
import ctypes
import json
from pathlib import Path

import numpy as np
import pandas as pd
from scipy.optimize import minimize

from flight_fit import FT, MPH, RPM
from savant_xhr_compare import fly_path

ctypes.windll.kernel32.SetPriorityClass(ctypes.windll.kernel32.GetCurrentProcess(), 0x4000)
ROOT = "C:/Users/andrewwi/dev/nuke-navigator-new/"
ap = argparse.ArgumentParser(); ap.add_argument("--write", action="store_true"); a = ap.parse_args()
out = []
say = lambda s="": (out.append(s), print(s, flush=True))
sig = lambda z: 1 / (1 + np.exp(-np.clip(z, -40, 40)))

# ---- the balls at Oracle, 2020-2026 ----
b = pd.read_parquet(ROOT + "data/derived/bbe_2015_2026_x.parquet", columns=["game_pk", "game_year", "home_team", "stand", "launch_speed", "launch_angle", "hit_distance_sc",
                                                                          "hc_x", "hc_y", "events"])
b = b[(b.home_team == "SF") & (b.game_year >= 2020) & b.hit_distance_sc.notna() & b.hc_x.notna() & b.launch_speed.notna() & b.launch_angle.notna()].copy()
g = pd.read_parquet(ROOT + "data/raw/game_context/games.parquet", columns=["game_pk", "venue_id"]).drop_duplicates("game_pk")
w = pd.read_parquet(ROOT + "data/raw/game_context/game_weather.parquet", columns=["game_pk", "om_temp_f", "om_rh", "om_pressure_hpa"]).drop_duplicates("game_pk")
b = b.merge(g, on="game_pk").merge(w, on="game_pk", how="left"); b = b[b.venue_id == 2395]
b["bearing"] = np.degrees(np.arctan2(b.hc_x - 125.42, 198.27 - b.hc_y))
b = b[(b.bearing.abs() <= 45) & (b.hit_distance_sc >= 280) & (((b.launch_speed >= 80) & b.launch_angle.between(15, 50)) | (b.events == "home_run"))].reset_index(drop=True)
b["y"] = (b.events == "home_run").astype(float)
say(f"# Oracle Park's wall, rebuilt\n- balls at Oracle 2020-2026 in play, 280 ft and up, |bearing| <= 45: {len(b):,}; home runs {int(b.y.sum()):,}")
# ---- each ball's anchored flight: height on a 1 ft grid of distances ----
t = (b.om_temp_f.fillna(62) - 32) * 5 / 9; tk = t + 273.15; pv = b.om_rh.fillna(70) / 100 * 6.1078 * 10 ** (7.5 * t / (t + 237.3))
rho0 = ((b.om_pressure_hpa.fillna(1015) - pv) * 100 / (287.058 * tk) + pv * 100 / (461.495 * tk)).to_numpy(float)
la = b.launch_angle.to_numpy(float); hand = np.where(b.stand == "R", 1.0, -1.0); br = b.bearing.to_numpy(float)
base = dict(v0=b.launch_speed.to_numpy(float) * MPH, theta=np.deg2rad(la), phi=np.deg2rad(br), w_back=np.maximum(0, -763 + 120 * la) * RPM, w_side=(-hand * 864 - 75 * br) * RPM)
target = b.hit_distance_sc.to_numpy(float)
GRID = np.arange(280, 461, 1.0); ZG = np.zeros((len(b), len(GRID)), np.float32); CH = 4000
for s0 in range(0, len(b), CH):
    sl = slice(s0, s0 + CH); n = len(target[sl]); lo, hi = np.full(n, 0.2), np.full(n, 1.8); kw = {k: v[sl] for k, v in base.items()}
    for _ in range(11):
        mid = 0.5 * (lo + hi); R, _ = fly_path(rho=rho0[sl] * mid, **kw); far = R[:, -1] / FT > target[sl]; lo, hi = np.where(far, mid, lo), np.where(far, hi, mid)
    R, Z = fly_path(rho=rho0[sl] * 0.5 * (lo + hi), **kw); Rf, Zf = R / FT, Z / FT
    for i in range(n):
        ZG[s0 + i] = np.where(GRID <= Rf[i, -1], np.interp(GRID, Rf[i], Zf[i]), -50.0)  # (past where it came down: far below any wall)
    print(f"  flown {min(s0 + CH, len(b)):,} of {len(b):,}", flush=True)
def zat(d):  # each ball's height at distance d (ft, per ball), from the grid
    k = np.clip((d - GRID[0]), 0, len(GRID) - 1.001); i0 = np.floor(k).astype(int); f = k - i0
    rows = np.arange(len(d)); return ZG[rows, i0] * (1 - f) + ZG[rows, i0 + 1] * f
# ---- the walls ----
_ow = ROOT + "apps/web/public/" + ("oracle_wall_v1.json" if Path(ROOT + "apps/web/public/oracle_wall_v1.json").exists() else "oracle_wall.json")
old = json.load(open(_ow)); OB = np.array(old["bearing_deg"], float); OD = np.array(old["wall_ft"], float); OH = np.array(old["height_ft"], float)
# (10 Nov, later) the wall the app's flights really use from -45 to +45: the crest measured off the park model (science/wall_crest.py, apps/web/public/oracle_crest.json, metres)
cr = json.load(open(ROOT + "apps/web/public/oracle_crest.json")); CB = np.array(cr["bearing"], float); CD = np.array(cr["radius"], float) / FT; CHh = np.array(cr["height"], float) / FT
sv = pd.read_csv(ROOT + "data/derived/parks/savant_fence_by_year.csv"); sv = sv[sv.venue_name.str.contains("Oracle") & (sv.season >= 2023)]
SB = np.array([-45, -22.5, 0, 22.5, 45.0])
SD = sv[["dist_lf_line", "dist_lf_gap", "dist_cf", "dist_rf_gap", "dist_rf_line"]].mean().to_numpy(float)
SH = sv[["height_lf_line", "height_lf_gap", "height_cf", "height_rf_gap", "height_rf_line"]].mean().to_numpy(float)
say(f"- Savant's measured Oracle fence (2023-2026 mean) at -45, -22.5, 0, +22.5, +45 deg: distance {np.round(SD, 1).tolist()} ft, height {np.round(SH, 1).tolist()} ft")
say(f"- the app's current wall at the same bearings: distance {np.round(np.interp(SB, OB, OD), 1).tolist()} ft, height {np.round(np.interp(SB, OB, OH), 1).tolist()} ft")
KB = np.arange(-45, 45.001, 3.0)
# prior: the model's shape shifted through Savant's points (the shift interpolated between them); right-center 4 to 21 deg from Savant's line
d_shift = np.interp(KB, SB, SD - np.interp(SB, OB, OD)); h_shift = np.interp(KB, SB, SH - np.interp(SB, OB, OH))
PD = np.interp(KB, OB, OD) + d_shift; PH = np.interp(KB, OB, OH) + h_shift
rc = ((KB >= 4) & (KB <= 21)) | ((KB >= -14) & (KB <= -5)); PD[rc] = np.interp(KB[rc], SB, SD); PH[rc] = np.interp(KB[rc], SB, SH)  # (also -14 to -5: the 21 Oct notes flag the stands contaminating the model there; it read 412 ft at -9)
PH = np.maximum(PH, 4.0)
def walls(dd, hh):
    return np.interp(br, KB, dd), np.interp(br, KB, hh)
def probs(dd, hh, s):
    wd_, wh_ = walls(dd, hh); return sig((zat(wd_) - wh_) / s)
def hard(dd, hh):
    wd_, wh_ = walls(dd, hh); return (zat(wd_) > wh_).astype(float)
# the fit
y = b.y.to_numpy(); yr = b.game_year.to_numpy()
nk = len(KB); LD, LH, LS = 1 / 8.0 ** 2, 1 / 3.0 ** 2, 1 / 4.0 ** 2  # ridge: corrections of about 8 ft in distance and 3 ft in height are cheap; smoothness between knots
def fit(mask, ridge=1.0, icpt=False):
    def loss(th):
        dd, hh, s = PD + th[:nk], np.maximum(PH + th[nk:2 * nk], 1.0), np.exp(th[-1])
        wd_, wh_ = walls(dd, hh)
        p = np.clip(sig((zat(wd_) - wh_) / s + (th[-2] if icpt else 0.0))[mask], 1e-6, 1 - 1e-6)
        nll = -(y[mask] * np.log(p) + (1 - y[mask]) * np.log(1 - p)).sum()
        rough = (np.diff(th[:nk], 2) ** 2).sum() * LS + (np.diff(th[nk:2 * nk], 2) ** 2).sum() * LS * 4
        return nll + ridge * mask.sum() / 1000 * (LD * (th[:nk] ** 2).sum() + LH * (th[nk:2 * nk] ** 2).sum()) * 50 + rough * 50
    th0 = np.zeros(2 * nk + 2); th0[-1] = np.log(2.0)
    r = minimize(loss, th0, method="L-BFGS-B", options={"maxiter": 600})
    return PD + r.x[:nk], np.maximum(PH + r.x[nk:2 * nk], 1.0), float(np.exp(r.x[-1])), (float(r.x[-2]) if icpt else 0.0)
tr, te = yr <= 2024, yr >= 2025
EVAL = te & (np.abs(target - np.interp(br, SB, SD)) <= 40)  # one evaluation set for every wall: 2025-2026 balls within 40 ft of Savant's line
from sklearn.linear_model import LogisticRegression
def score(name, dd, hh, soft=None):
    wd_, wh_ = walls(dd, hh); c = zat(wd_) - wh_
    if soft is None:  # odds from the clearance, fit on the training years; the yes/no call is the odds over one half
        lr = LogisticRegression(C=10).fit(c[tr].reshape(-1, 1), y[tr]); ps = lr.predict_proba(c.reshape(-1, 1))[:, 1]
    else:
        ps = sig(c / soft[0] + soft[1])
    pk = (ps > 0.5).astype(float); near = EVAL
    say(f"- {name}: 2025-2026 balls near the wall ({int(near.sum()):,}): yes/no wrong {np.mean(pk[near] != y[near]):.1%} (says in but went out {np.mean((pk[near] == 0) & (y[near] == 1)):.1%}, says out but stayed in {np.mean((pk[near] == 1) & (y[near] == 0)):.1%}); odds Brier {np.mean((ps[near] - y[near]) ** 2):.4f}")
    return near
say("## Fit on 2020-2024, scored on 2025-2026 (each wall's odds from its own clearance)")
cur_d, cur_h = np.interp(KB, OB, OD), np.interp(KB, OB, OH)
score("the old profile (oracle_wall_v1.json)", cur_d, cur_h)
score("the app's flight wall today (the crest, oracle_crest.json)", np.interp(KB, CB, CD), np.interp(KB, CB, CHh))
score("Savant's five points alone (straight lines between)", np.interp(KB, SB, SD), np.interp(KB, SB, SH))
score("the prior (model shape through Savant's points)", PD, PH)
best = None
for ridge in (1.0, 0.2, 0.05):
    for icpt in (False, True):
        fd, fh, fs, fc = fit(tr, ridge, icpt)
        nm = f"fitted to the real balls (pull toward the measured wall x{ridge}{', with one overall offset' if icpt else ''})"
        near = score(nm, fd, fh, (fs, fc))
        wd_, wh_ = walls(fd, fh); br_ = float(np.mean((sig((zat(wd_) - wh_) / fs + fc)[near] - y[near]) ** 2))
        if best is None or br_ < best[0]: best = (br_, ridge, icpt, nm)
# the same, starting from the crest's shape instead of the old profile's
P0 = (PD.copy(), PH.copy())
cd_k, ch_k = np.interp(KB, CB, CD), np.interp(KB, CB, CHh)
PD = cd_k + np.interp(KB, SB, SD - np.interp(SB, CB, CD)); PH = np.maximum(ch_k + np.interp(KB, SB, SH - np.interp(SB, CB, CHh)), 4.0)
score("the crest's shape through Savant's points", PD, PH)
for ridge in (0.2, 0.05):
    fd, fh, fs, fc = fit(tr, ridge, True)
    nm = f"fitted from the crest's shape (pull x{ridge}, with one overall offset)"
    near = score(nm, fd, fh, (fs, fc)); wd_, wh_ = walls(fd, fh); br_ = float(np.mean((sig((zat(wd_) - wh_) / fs + fc)[near] - y[near]) ** 2))
    if br_ < best[0]: best = (br_, ridge, True, nm, "crest")
if len(best) < 5: PD, PH = P0
say(f"- the best on 2025-2026: {best[3]} (Brier {best[0]:.4f}); refit on all of 2020-2026 with it")
fd2, fh2, fs2, fc2 = fit(np.ones(len(b), bool), best[1], best[2])
say("## The wall fitted on all of 2020-2026 (distance ft / height ft every 9 deg; the app's current wall in brackets)")
for k in range(0, nk, 3):
    say(f"- {KB[k]:+.0f} deg: {fd2[k]:.0f} / {fh2[k]:.1f}   [{cur_d[k]:.0f} / {cur_h[k]:.1f}]   Savant line {np.interp(KB[k], SB, SD):.0f} / {np.interp(KB[k], SB, SH):.1f}")
say(f"- the odds: P(out) = logistic(clearance / {fs2:.2f} ft {fc2:+.2f}); a ball is called out when the odds pass one half (clearance above {-fc2 * fs2:+.1f} ft)")
if a.write:
    OUT = ROOT + "apps/web/public/oracle_wall.json"
    if not Path(ROOT + "apps/web/public/oracle_wall_v1.json").exists():
        Path(ROOT + "apps/web/public/oracle_wall_v1.json").write_text(json.dumps(old), encoding="utf-8")
    bb = np.arange(-47, 48)
    nd = np.interp(np.clip(bb, -45, 45), KB, fd2); nh = np.interp(np.clip(bb, -45, 45), KB, fh2)
    # (beyond 45 deg the foul poles: the old file's ends, shifted the same way as at 45)
    for side, k in ((bb < -45, 0), (bb > 45, -1)):
        nd[side] = OD[np.isin(OB, bb[side])] + (fd2[k] - np.interp(KB[k], OB, OD)); nh[side] = OH[np.isin(OB, bb[side])] + (fh2[k] - np.interp(KB[k], OB, OH))
    new = {**old, "bearing_deg": bb.tolist(), "wall_ft": np.round(nd, 2).tolist(), "height_ft": np.round(nh, 2).tolist(), "soft_ft": round(fs2, 3), "offset": round(fc2, 3),
           "note": "Rebuilt 10 Nov 2026 (science/oracle_wall_fit.py): the park model's shape through Savant's measured 2023-2026 fence, then fitted to the real 2020-2026 Oracle balls in play near the wall (their anchored flights against the outcome); the old wall is oracle_wall_v1.json."}
    Path(OUT).write_text(json.dumps(new), encoding="utf-8"); say(f"- written {OUT} (the old wall kept as oracle_wall_v1.json)")
Path(ROOT + "science/oracle_wall_fit.md").write_text("\n".join(out) + "\n", encoding="utf-8")
