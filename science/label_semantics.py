"""Audit (GPT brief-5 point 4 and idea 10): is hit_distance_sc a common physical target across event types? MLB defines hit distance as where the ball lands, hits the fence or seats, or is caught,
and projected home-run distance as the extrapolated unobstructed flight, so the 587k carry labels (physics inversion against hit_distance_sc) could mix mechanisms. Using the 40,000-ball carry dataset
(events known) this tabulates, by event type: the share of balls, the mean log-carry residual after removing the exit speed x launch angle table mean (so event types are compared at matched contact),
the residual's spread, and the same for balls the model would call fly balls (launch angle 20 to 40, exit speed 95+) only. A large event-type shift in matched-contact carry means the label mechanism
differs by outcome. Also: how far a pure event-type indicator can move the carry model's out-of-fold R2 (if event type is a strong carry predictor beyond contact, the label carries outcome semantics).
Output: science/label_semantics.md. Seconds."""
import json

import lightgbm as lgb
import numpy as np
import pandas as pd
from scipy.interpolate import RegularGridInterpolator
from sklearn.model_selection import GroupKFold

ROOT = "C:/Users/andrewwi/dev/nuke-navigator-new/"
out = []


def say(s=""):
    print(s, flush=True)
    out.append(s)


T = json.load(open(ROOT + "apps/web/public/carry_table.json"))
evn = T["ev0"] + T["de"] * np.arange(len(T["mean"]))
lan = T["la0"] + T["dl"] * np.arange(len(T["mean"][0]))
f = RegularGridInterpolator((evn, lan), np.array(T["mean"]), bounds_error=False, fill_value=None)
df = pd.read_parquet(ROOT + "data/derived/carry_dataset.parquet")
df["base"] = f(np.column_stack([df.launch_speed.clip(evn[0], evn[-1]), df.launch_angle.clip(lan[0], lan[-1])]))
df["res"] = df.logm - df.base
df["res"] -= 0.0 * df.res  # (the table already holds weather terms at reference weather; compare event types at matched contact only)
ev = df.events.fillna("none").replace({"field_out": "field out", "grounded_into_double_play": "ground out type", "force_out": "ground out type", "fielders_choice": "ground out type", "fielders_choice_out": "ground out type", "double_play": "ground out type", "sac_fly": "sac fly"})
df["ev"] = ev
J = df.J.median()
say("# Distance label semantics by event type (23 Oct 2026), %d balls with a carry label; J median %.0f ft per unit log carry" % (len(df), J))
say("\n## All balls: mean carry residual at matched exit speed and launch angle (positive = ball went SHORTER than the table's typical ball)")
rows = []
for k, g in df.groupby("ev"):
    if len(g) < 150:
        continue
    rows.append((k, len(g), g.res.mean(), g.res.std(), g.res.mean() * J, g.y.mean()))
for k, n, m, s, ft, hr in sorted(rows, key=lambda r: -r[1]):
    say("  %-20s n %6d  residual mean %+.4f  sd %.3f   = %+5.1f ft of distance   home-run share %.3f" % (k, n, m, s, -ft, hr))
fly = df[df.launch_angle.between(20, 40) & (df.launch_speed >= 95)]
say("\n## Hard-hit fly balls only (20 to 40 degrees, 95 mph and up): n %d" % len(fly))
for k, g in fly.groupby("ev"):
    if len(g) < 100:
        continue
    say("  %-20s n %6d  residual mean %+.4f  sd %.3f   = %+5.1f ft   home-run share %.3f" % (k, len(g), g.res.mean(), g.res.std(), -g.res.mean() * J, g.y.mean()))
# how much does event type add to a carry model that already has contact, weather, pitch and swing?
base = ["launch_speed", "launch_angle", "bearing", "stand_r", "om_temp_f", "om_rh", "om_pressure_hpa", "om_wind_u", "om_wind_v", "release_speed", "release_spin_rate", "spin_axis", "pfx_x", "pfx_z", "plate_x", "plate_z", "bat_speed", "attack_angle", "swing_path_tilt", "swing_length"]
d2 = df.dropna(subset=["bat_speed"]).reset_index(drop=True)
d2["hr"] = (d2.events == "home_run").astype(float)
d2["is_out"] = d2.events.isin(["field_out", "sac_fly", "force_out", "grounded_into_double_play", "fielders_choice_out", "double_play"]).astype(float)
P = dict(n_estimators=250, learning_rate=0.05, num_leaves=15, min_child_samples=80, subsample=0.8, subsample_freq=1, colsample_bytree=0.9, verbose=-1, n_jobs=3)


def r2(feats):
    y = d2.logm.to_numpy()
    pred = np.zeros(len(d2))
    for tr, te in GroupKFold(n_splits=3).split(d2, y, d2.game_pk):
        pred[te] = lgb.LGBMRegressor(**P).fit(d2.loc[tr, feats], y[tr]).predict(d2.loc[te, feats])
    return 1 - np.sum((y - pred) ** 2) / np.sum((y - y.mean()) ** 2)


r0 = r2(base)
say("\n## Does the outcome add to a carry model? (out-of-fold R2 of log carry, grouped by game, %d balls with bat tracking)" % len(d2))
say("  contact, weather, pitch, swing:                      %.4f" % r0)
say("  + home-run indicator (the label itself, diagnostic):   %.4f  (gain %+.4f)" % (r2(base + ["hr"]), r2(base + ["hr"]) - r0))
say("  + out indicator (caught or fielded, diagnostic):       %.4f  (gain %+.4f)" % (r2(base + ["is_out"]), r2(base + ["is_out"]) - r0))
say("\nreading: if the home-run or out indicator adds a lot, the distance label carries the outcome's semantics (projected for home runs, endpoint for outs) and the 'carry' feature is partly an outcome-shaped target; the E10 feature chain is still leak-free (game-out-of-fold, legal inputs only), but its physical story would be weaker.")
open(ROOT + "science/label_semantics.md", "w", encoding="utf-8").write("\n".join(out) + "\n")
