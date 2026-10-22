"""Research sprint, two small studies on the hidden variables behind a batted ball's flight.

A. Side spin. build_replay.py had to add a per-ball side-spin offset (dws) so each real ball lands at its real bearing. Total side spin = the page's prior (-849 x hand - 94 x direction rpm)
   + dws. Fit what the total actually looks like against hand and direction on those 2,156 real balls, and propose a corrected prior (the what-if sandbox uses the old one).
B. Carry. Every ball's 'carry' is the air-density multiplier that makes the page's physics reach its observed Statcast distance (median 1.0, 5-95% 0.85 to 1.25; real home runs sit near
   the top). How much of log(carry) is predictable from what we measure (exit speed, angle, direction, weather, pitch spin and speed, plate height, bat speed, attack angle, launch angle
   minus attack angle)? 20,000 balls since 2023-07-14, carry by bisection, then a small LightGBM with 3-fold cross-validation grouped by game.
Runs at below-normal priority, about 10 minutes. Output: science/carry_spin_study.md.
"""
import json

import lightgbm as lgb
import numpy as np
import pandas as pd
from sklearn.model_selection import GroupKFold

from flight_fit import FT, MPH, RPM
from savant_xhr_compare import ROOT, fly_path

out = []


def say(s=""):
    print(s, flush=True)
    out.append(s)


# ---- A. side spin on the replay balls ------------------------------------------------------------------------------------------------------------------------------
R = json.load(open(ROOT + "apps/web/public/replay.json"))
b = pd.DataFrame(R["balls"])
b["hand"] = np.where(b.s == "R", 1.0, -1.0)
b["prior"] = -849 * b.hand - 94 * b.dir
b["total"] = b.prior + b.dws
say("# Carry and spin study (22 Oct 2026)")
say("\n## A. Side spin needed so real balls land where they landed (%d balls, Giants batting since 2023-07-14)" % len(b))
X = np.column_stack([np.ones(len(b)), b.hand, b.dir, b.hand * b.dir])
coef, res, *_ = np.linalg.lstsq(X, b.total.to_numpy(), rcond=None)
pred = X @ coef
say("total side spin (rpm) = %.0f + %.0f x hand + %.1f x direction + %.1f x hand x direction  (hand +1 right, -1 left; direction degrees, + toward right field)" % tuple(coef))
say("the page's prior is  0 - 849 x hand - 94 x direction;  residual sd of the new fit %.0f rpm vs %.0f rpm of the old prior around the same balls" % (np.std(b.total - pred), np.std(b.total - b.prior)))
for lab, d in (("pulled (right-handers left of CF, left-handers right of CF) beyond 15 deg", b[(b.hand * b.dir < -15)]), ("opposite field beyond 15 deg", b[(b.hand * b.dir > 15)]), ("center within 10 deg", b[b.dir.abs() < 10])):
    say("  %s: n %d, mean total side spin %.0f rpm, prior would say %.0f" % (lab, len(d), d.total.mean(), d.prior.mean()))
say("share of balls where |dws| > 1500 rpm: %.2f" % (b.dws.abs() > 1500).mean())

# ---- B. predictability of carry ---------------------------------------------------------------------------------------------------------------------------------
COLS = ["game_pk", "game_date", "type", "launch_speed", "launch_angle", "bearing", "hit_distance_sc", "air_density", "om_temp_f", "om_rh", "om_pressure_hpa", "om_wind_u", "om_wind_v",
        "stand_r", "release_speed", "release_spin_rate", "spin_axis", "pfx_x", "pfx_z", "plate_x", "plate_z", "bat_speed", "attack_angle", "swing_path_tilt", "swing_length", "vaa", "p_throws"]
df = pd.read_parquet(ROOT + "data/derived/exp_features.parquet", columns=COLS)
df = df[(df.game_date >= "2023-07-14") & (df.type == "X") & df.launch_speed.between(70, 125) & df.launch_angle.between(5, 55) & df.bearing.between(-44, 44) & df.hit_distance_sc.between(150, 480)
        & df.air_density.notna() & df.bat_speed.notna() & df.attack_angle.notna()].sample(20000, random_state=11).reset_index(drop=True)
hand = np.where(df.stand_r == 1, 1.0, -1.0)
la, br = df.launch_angle.to_numpy(float), df.bearing.to_numpy(float)
base = dict(v0=df.launch_speed.to_numpy(float) * MPH, theta=np.deg2rad(la), phi=np.deg2rad(br), w_back=np.maximum(0, -763 + 120 * la) * RPM, w_side=(-hand * 849 - 94 * br) * RPM)
rho0, target = df.air_density.to_numpy(float), df.hit_distance_sc.to_numpy(float)
n, CH = len(df), 4000
lo, hi = np.full(n, 0.2), np.full(n, 1.8)
for k in range(10):
    mid = 0.5 * (lo + hi)
    dist = np.zeros(n)
    for s in range(0, n, CH):
        sl = slice(s, s + CH)
        Rr, _ = fly_path(rho=rho0[sl] * mid[sl], **{kk: v[sl] for kk, v in base.items()})
        dist[sl] = Rr[:, -1] / FT
    too_far = dist > target
    lo, hi = np.where(too_far, mid, lo), np.where(too_far, hi, mid)
    print("  carry pass", k + 1, flush=True)
df["logm"] = np.log(0.5 * (lo + hi))
df["gap"] = df.launch_angle - df.attack_angle
df["wind_out"] = df.om_wind_v  # toward center field component as stored (see exp_data.py)
FEATS = ["launch_speed", "launch_angle", "bearing", "om_temp_f", "om_rh", "om_pressure_hpa", "om_wind_u", "om_wind_v", "stand_r", "release_speed", "release_spin_rate", "spin_axis", "pfx_x", "pfx_z",
         "plate_x", "plate_z", "bat_speed", "attack_angle", "swing_path_tilt", "swing_length", "vaa", "gap"]
say("\n## B. How predictable is the carry multiplier (20,000 balls with bat tracking)")
say("log(carry): mean %.3f, sd %.3f (so carry typically varies by about %.0f%% around its mean)" % (df.logm.mean(), df.logm.std(), 100 * df.logm.std()))
y = df.logm.to_numpy()
gkf = GroupKFold(n_splits=3)


def cv(feats):
    oof = np.zeros(n)
    for tr, te in gkf.split(df, y, df.game_pk):
        m = lgb.LGBMRegressor(n_estimators=300, learning_rate=0.04, num_leaves=15, min_child_samples=40, subsample=0.8, subsample_freq=1, colsample_bytree=0.8, verbose=-1, n_jobs=2)
        m.fit(df.loc[tr, feats], y[tr])
        oof[te] = m.predict(df.loc[te, feats])
    return 1 - np.sum((y - oof) ** 2) / np.sum((y - y.mean()) ** 2), oof


r2_all, oof = cv(FEATS)
say("R squared of log(carry) from everything measured: %.3f (out of fold, grouped by game)" % r2_all)
groups = {
    "contact only (exit speed, angle, bearing, hand)": ["launch_speed", "launch_angle", "bearing", "stand_r"],
    "+ weather (temp, humidity, pressure, wind)": ["launch_speed", "launch_angle", "bearing", "stand_r", "om_temp_f", "om_rh", "om_pressure_hpa", "om_wind_u", "om_wind_v"],
    "+ pitch (speed, spin, axis, break, location, approach angle)": ["launch_speed", "launch_angle", "bearing", "stand_r", "om_temp_f", "om_rh", "om_pressure_hpa", "om_wind_u", "om_wind_v", "release_speed", "release_spin_rate", "spin_axis", "pfx_x", "pfx_z", "plate_x", "plate_z", "vaa"],
    "+ swing (bat speed, attack angle, tilt, length, launch minus attack)": FEATS,
}
prev = None
for lab, f in groups.items():
    r2, _ = cv(f)
    say("  %-70s R2 %.3f%s" % (lab, r2, "" if prev is None else "   (gain %+.3f)" % (r2 - prev)))
    prev = r2
m = lgb.LGBMRegressor(n_estimators=300, learning_rate=0.04, num_leaves=15, min_child_samples=40, subsample=0.8, subsample_freq=1, colsample_bytree=0.8, verbose=-1, n_jobs=2, importance_type="gain").fit(df[FEATS], y)
imp = sorted(zip(FEATS, m.feature_importances_), key=lambda t: -t[1])
tot = sum(v for _, v in imp)
say("top features by gain: " + ", ".join("%s %.0f%%" % (f, 100 * v / tot) for f, v in imp[:8]))
say("\nreading: the unexplained share (1 - R2) is the hidden carry (wind variation inside a game, true batted-ball spin, the ball itself); a what-if band should use that spread, not a fixed one.")
open(ROOT + "science/carry_spin_study.md", "w", encoding="utf-8").write("\n".join(out) + "\n")
