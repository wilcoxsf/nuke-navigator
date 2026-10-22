"""Research sprint, ideas B and C from GPT-RESEARCH-BRIEF-3.

B. Does a bat-tracking spin model improve distance? 20,000 league balls since 2023-07-14 (same sample as carry_spin_study.py). Carry (air-density multiplier that makes the page's physics reach the
   observed distance) is predicted out of fold from three feature sets, and the physics is flown again with the PREDICTED carry; report mean absolute distance error in feet for: the prior (carry 1),
   contact only, contact plus weather plus pitch, and everything including bat tracking.
C. Is a what-if band calibrated? Using only what a what-if user sets (exit speed, launch angle, bearing, hand, temperature), fit LightGBM quantile models for log carry at 10%, 50% and 90%
   (out of fold, grouped by game), check the 80% interval covers about 80% of real balls, and translate the band into feet of distance for a typical home-run swing and for a near-wall swing.
Runs at below-normal priority, about 12 minutes. Output: science/carry_band_study.md.
"""
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


COLS = ["game_pk", "game_date", "type", "launch_speed", "launch_angle", "bearing", "hit_distance_sc", "air_density", "om_temp_f", "om_rh", "om_pressure_hpa", "om_wind_u", "om_wind_v",
        "stand_r", "release_speed", "release_spin_rate", "spin_axis", "pfx_x", "pfx_z", "plate_x", "plate_z", "bat_speed", "attack_angle", "swing_path_tilt", "swing_length", "vaa"]
df = pd.read_parquet(ROOT + "data/derived/exp_features.parquet", columns=COLS)
df = df[(df.game_date >= "2023-07-14") & (df.type == "X") & df.launch_speed.between(70, 125) & df.launch_angle.between(5, 55) & df.bearing.between(-44, 44) & df.hit_distance_sc.between(150, 480)
        & df.air_density.notna() & df.bat_speed.notna() & df.attack_angle.notna()].sample(20000, random_state=11).reset_index(drop=True)
hand = np.where(df.stand_r == 1, 1.0, -1.0)
la, br = df.launch_angle.to_numpy(float), df.bearing.to_numpy(float)
base = dict(v0=df.launch_speed.to_numpy(float) * MPH, theta=np.deg2rad(la), phi=np.deg2rad(br), w_back=np.maximum(0, -763 + 120 * la) * RPM, w_side=(-hand * 849 - 94 * br) * RPM)
rho0, target = df.air_density.to_numpy(float), df.hit_distance_sc.to_numpy(float)
n, CH = len(df), 4000


def flown(mult):
    d = np.zeros(n)
    for s in range(0, n, CH):
        sl = slice(s, s + CH)
        R, _ = fly_path(rho=rho0[sl] * mult[sl], **{k: v[sl] for k, v in base.items()})
        d[sl] = R[:, -1] / FT
    return d


lo, hi = np.full(n, 0.2), np.full(n, 1.8)
for k in range(10):
    mid = 0.5 * (lo + hi)
    too_far = flown(mid) > target
    lo, hi = np.where(too_far, mid, lo), np.where(too_far, hi, mid)
    print("  carry pass", k + 1, flush=True)
y = np.log(0.5 * (lo + hi))
df["gap"] = df.launch_angle - df.attack_angle
say("# Carry band study (22 Oct 2026), 20,000 balls with bat tracking since 2023-07-14")
CONTACT = ["launch_speed", "launch_angle", "bearing", "stand_r"]
WX = CONTACT + ["om_temp_f", "om_rh", "om_pressure_hpa", "om_wind_u", "om_wind_v"]
PITCH = WX + ["release_speed", "release_spin_rate", "spin_axis", "pfx_x", "pfx_z", "plate_x", "plate_z", "vaa"]
ALL = PITCH + ["bat_speed", "attack_angle", "swing_path_tilt", "swing_length", "gap"]
gkf = GroupKFold(n_splits=3)


def oof_pred(feats, **kw):
    oof = np.zeros(n)
    for tr, te in gkf.split(df, y, df.game_pk):
        m = lgb.LGBMRegressor(n_estimators=300, learning_rate=0.04, num_leaves=15, min_child_samples=40, subsample=0.8, subsample_freq=1, colsample_bytree=0.8, verbose=-1, n_jobs=2, **kw)
        m.fit(df.loc[tr, feats], y[tr])
        oof[te] = m.predict(df.loc[te, feats])
    return oof


say("\n## B. Distance error when the physics uses a predicted carry (feet, mean absolute error against Statcast's projected distance)")
d0 = flown(np.ones(n))
say("  carry fixed at 1 (the page's prior)                      MAE %.1f ft, bias %+.1f ft" % (np.mean(np.abs(d0 - target)), np.mean(d0 - target)))
for lab, f in (("contact only", CONTACT), ("contact + weather + pitch", PITCH), ("everything including bat tracking", ALL)):
    d = flown(np.exp(oof_pred(f)))
    say("  carry predicted from %-36s MAE %.1f ft, bias %+.1f ft" % (lab, np.mean(np.abs(d - target)), np.mean(d - target)))
say("  (the floor, carry known exactly, is 0 by construction)")

say("\n## C. What-if band: quantiles of log carry from exit speed, launch angle, bearing, hand and temperature only")
WHATIF = ["launch_speed", "launch_angle", "bearing", "stand_r", "om_temp_f"]
q = {a: oof_pred(WHATIF, objective="quantile", alpha=a) for a in (0.1, 0.5, 0.9)}
cover = np.mean((y >= q[0.1]) & (y <= q[0.9]))
say("  80%% interval coverage out of fold: %.3f (target 0.80); below the band %.3f, above %.3f" % (cover, np.mean(y < q[0.1]), np.mean(y > q[0.9])))
w = q[0.9] - q[0.1]
say("  median interval width in log carry: %.3f (about %.0f%% of air density)" % (np.median(w), 100 * np.median(w)))
# the same band in feet for typical swings
for lab, ev, la_, dr in (("a typical home-run swing (104 mph, 28 deg, 15 deg right)", 104, 28, 15), ("a near-wall swing (98 mph, 27 deg, 15 deg right)", 98, 27, 15)):
    sel = (df.launch_speed.sub(ev).abs() <= 3) & (df.launch_angle.sub(la_).abs() <= 3) & (df.bearing.sub(dr).abs() <= 10)
    if sel.sum() < 20:
        continue
    idx = np.where(sel)[0]
    dd = {}
    for a in (0.1, 0.5, 0.9):
        mult = np.ones(n)
        mult[idx] = np.exp(q[a][idx])
        dd[a] = flown(mult)[idx]
    say("  %s: %d real balls; distance at the 10%%, 50%%, 90%% carry: %.0f, %.0f, %.0f ft (real balls: median %.0f ft, 10-90%% %.0f to %.0f)" % (
        lab, sel.sum(), np.median(dd[0.1]), np.median(dd[0.5]), np.median(dd[0.9]), np.median(target[idx]), *np.percentile(target[idx], [10, 90])))
say("\nreading: B shows what bat tracking buys in distance accuracy; C shows whether a Goner Grid band built on carry alone is honest (coverage near 80%) and how wide it is in feet.")
open(ROOT + "science/carry_band_study.md", "w", encoding="utf-8").write("\n".join(out) + "\n")
