"""GPT brief 7, week 2 (cheap version): how much of the HitTrax launch bearing do the MLB-style bat measurements explain, and does anything biomechanical beyond them help? Driveline OpenBiomechanics, 604 paired swings from 98 athletes (CC BY-NC-SA data, private research use), held out by ATHLETE (grouped 5-fold; never by swing).
Bearing is mirrored so that pull is positive for both hands.
  M0  hand only (the mean)            M1  MLB-legal analogs: exit velocity, launch angle, bat speed, sweet-spot velocity vector (attack direction and attack angle), point of impact, pitch speed
  M2  M1 minus the attack direction   M3  M1 plus everything else in poi_metrics (body angles, bat-torso angle, joint positions; NOT available in MLB data)  M4  M1 plus point-of-impact only in a nonlinear form (a check that the interaction is not missing)
Usage: python science/driveline_bearing.py"""
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.linear_model import RidgeCV
from sklearn.model_selection import GroupKFold
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

R = "C:/Users/andrewwi/dev/nuke-navigator-new/data/raw/driveline/"
h = pd.read_csv(R + "baseball_hitting__data__poi__hittrax.csv")
p = pd.read_csv(R + "baseball_hitting__data__poi__poi_metrics.csv")
m = pd.read_csv(R + "baseball_hitting__data__metadata.csv")[["session_swing", "user", "hitter_side"]]
d = h.merge(p, on="session_swing").merge(m, on="session_swing")
d = d.dropna(subset=["bearing", "la", "exit_velo_mph_x", "sweet_spot_velo_mph_contact_y"]).reset_index(drop=True)
side = np.where(d.hitter_side == "R", 1.0, -1.0)
d["pull"] = d.bearing * np.where(d.hitter_side == "R", -1.0, 1.0)  # README: + is the lefty pull side, - the righty pull side; mirrored so pull is positive
d["atk_dir"] = np.degrees(np.arctan2(d.sweet_spot_velo_mph_contact_y, d.sweet_spot_velo_mph_contact_x))  # direction the sweet spot moves, toward the pull side positive
d["atk_ang"] = d.attack_angle_contact_x
d["poi_in"] = d.poi_x * side  # inside (toward the batter) positive for both hands
d["is_r"] = (d.hitter_side == "R").astype(float)
print(len(d), "swings,", d.user.nunique(), "athletes; pull-positive bearing: mean %.1f sd %.1f; sweet-spot direction vs bearing correlation %.2f" % (d.pull.mean(), d.pull.std(), np.corrcoef(d.atk_dir, d.pull)[0, 1]))
base = ["exit_velo_mph_x", "la", "bat_speed_mph_contact_x", "sweet_spot_velo_mph_contact_x", "sweet_spot_velo_mph_contact_y", "sweet_spot_velo_mph_contact_z", "atk_dir", "atk_ang", "poi_in", "poi_y", "poi_z", "pitch", "is_r"]
no_dir = [c for c in base if c not in ("atk_dir", "sweet_spot_velo_mph_contact_y")]
other = [c for c in p.columns if c not in ("session_swing", "session") and not c.startswith(("exit_velo", "blast")) and p[c].dtype != object]
M = {"M0 hand only": ["is_r"], "M1 MLB-style bat and contact measures": base, "M2 M1 without attack direction": no_dir, "M3 M1 plus all body and bat kinematics": base + other, "M4 M1 plus pitch zone code": base + ["strike_zone"]}
gkf = GroupKFold(n_splits=5)
y = d.pull.to_numpy()
res = {}
for name, cols in M.items():
    X = d[cols].astype(float)
    X = X.fillna(X.median()).to_numpy()
    for mk, mod in (("ridge", make_pipeline(StandardScaler(), RidgeCV(alphas=np.logspace(-1, 3, 20)))), ("gbm", GradientBoostingRegressor(n_estimators=150, max_depth=2, learning_rate=0.05, subsample=0.8, random_state=0))):
        pr = np.zeros(len(d))
        for tr, te in gkf.split(X, y, d.user):
            mod.fit(X[tr], y[tr])
            pr[te] = mod.predict(X[te])
        res[(name, mk)] = (np.abs(pr - y).mean(), np.sqrt(((pr - y) ** 2).mean()), 1 - ((pr - y) ** 2).sum() / ((y - y.mean()) ** 2).sum())
print("\nheld out by athlete (5 folds): MAE degrees, RMSE degrees, R2")
for (name, mk), (mae, rmse, r2) in res.items():
    print("  %-42s %-5s MAE %5.2f  RMSE %5.2f  R2 %5.2f" % (name, mk, mae, rmse, r2))
print("\nconstant-mean MAE %.2f, sd %.2f" % (np.abs(y - y.mean()).mean(), y.std()))
