"""Experiment E7 (GPT round-3 idea 8): is the incoming pitch a crude aerodynamic probe of the same baseball? Before contact the ball has already flown 55 feet; its measured acceleration (ax, ay, az)
should be explained by spin and release; whatever is left over might carry information about that particular ball's surface and drag, which could show up in how far it carries when hit.
Method on data/derived/carry_dataset.parquet (40,000 balls with bat tracking, carry known): fit a LightGBM for each of ax, ay, az from the pitch's release and spin variables (out of fold by game), take
the residuals, and test whether adding them to the carry model (contact, weather, pitch, swing) raises out-of-fold R squared; also a version with the residuals centered within pitcher and pitch type
(so they cannot just be a pitcher fingerprint). Kill rule from GPT: no incremental R squared above 0.005. Fast (a few minutes). Output: science/pitch_aero_probe.md."""
import lightgbm as lgb
import numpy as np
import pandas as pd
from sklearn.model_selection import GroupKFold

ROOT = "C:/Users/andrewwi/dev/nuke-navigator-new/"
out = []


def say(s=""):
    print(s, flush=True)
    out.append(s)


df = pd.read_parquet(ROOT + "data/derived/carry_dataset.parquet")
df["pt"] = df.pitch_type.astype("category").cat.codes
df["p_r"] = (df.p_throws == "R").astype(float)
P = dict(n_estimators=250, learning_rate=0.05, num_leaves=15, min_child_samples=60, subsample=0.8, subsample_freq=1, colsample_bytree=0.8, verbose=-1, n_jobs=3)
gkf = GroupKFold(n_splits=3)
RELEASE = ["release_speed", "release_spin_rate", "spin_axis", "release_pos_x", "release_pos_y", "release_pos_z", "release_extension", "vx0", "vy0", "vz0", "pt", "p_r", "arm_angle"]


def oof(feats, target, y=None):
    y = df[target].to_numpy() if y is None else y
    pred = np.zeros(len(df))
    for tr, te in gkf.split(df, y, df.game_pk):
        pred[te] = lgb.LGBMRegressor(**P).fit(df.loc[tr, feats], y[tr]).predict(df.loc[te, feats])
    return pred


say("# Pitch as an aerodynamic probe (22 Oct 2026), %d balls with bat tracking" % len(df))
for t in ("ax", "ay", "az"):
    p = oof(RELEASE, t)
    df["res_" + t] = df[t] - p
    say("  pitch %s: sd %.2f ft/s2, explained by release and spin %.1f%% (out of fold), residual sd %.3f" % (t, df[t].std(), 100 * (1 - np.var(df["res_" + t]) / np.var(df[t])), df["res_" + t].std()))
key = df.pitcher.astype(str) + "_" + df.pitch_type.astype(str)
for t in ("ax", "ay", "az"):
    df["resc_" + t] = df["res_" + t] - df.groupby(key)["res_" + t].transform("mean")
CONTACT = ["launch_speed", "launch_angle", "bearing", "stand_r"]
WX = CONTACT + ["om_temp_f", "om_rh", "om_pressure_hpa", "om_wind_u", "om_wind_v"]
PITCH = WX + ["release_speed", "release_spin_rate", "spin_axis", "pfx_x", "pfx_z", "plate_x", "plate_z", "vaa"]
ALL = PITCH + ["bat_speed", "attack_angle", "swing_path_tilt", "swing_length", "gap"]
y = df.logm.to_numpy()


def r2(feats):
    p = oof(feats, "logm", y)
    return 1 - np.sum((y - p) ** 2) / np.sum((y - y.mean()) ** 2), p


base_r2, base_p = r2(ALL)
say("\n## Carry model R squared (out of fold by game)")
say("  baseline (contact, weather, pitch, swing)                       %.4f" % base_r2)
for lab, extra in (("+ pitch acceleration residuals", ["res_ax", "res_ay", "res_az"]), ("+ residuals centered within pitcher and pitch type", ["resc_ax", "resc_ay", "resc_az"])):
    r, p = r2(ALL + extra)
    say("  %-62s %.4f   (gain %+.4f)" % (lab, r, r - base_r2))
resid = y - base_p
say("\n## Correlation of each residual with the carry model's own error (what the baseline cannot explain)")
for c in ("res_ax", "res_ay", "res_az", "resc_ax", "resc_ay", "resc_az"):
    ok = df[c].notna().to_numpy()  # six balls have no pitch acceleration
    say("  %-8s r = %+.4f" % (c, np.corrcoef(df[c].to_numpy()[ok], resid[ok])[0, 1]))
say("\nreading: kill rule is a gain under 0.005; a residual correlation near zero means the pitch's unexplained acceleration says nothing about the batted ball's carry.")
open(ROOT + "science/pitch_aero_probe.md", "w", encoding="utf-8").write("\n".join(out) + "\n")
