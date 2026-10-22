"""Where does the page physics fall short of real home runs? Simulated landing distance vs Statcast projected distance for 2025 actual HRs and for all balls, by exit speed.
Uses savant_xhr_compare.fly_path (spin prior, real air density, no wind)."""
import numpy as np
import pandas as pd

from flight_fit import FT, MPH, RPM
from savant_xhr_compare import ROOT, fly_path

df = pd.read_parquet(ROOT + "data/derived/exp_features.parquet",
                     columns=["game_date", "game_year", "type", "launch_speed", "launch_angle", "bearing", "air_density", "stand_r", "y", "hit_distance_sc", "om_wind_mph", "om_pressure_hpa"])
df = df[(df.game_year == 2025) & (df.game_date <= "2025-09-28") & (df.type == "X") & (df.launch_speed >= 80) & df.launch_angle.between(12, 55)
        & df.bearing.between(-45, 45) & df.air_density.notna() & df.hit_distance_sc.notna()]
df = pd.concat([df[df.y == 1].sample(min(4000, int((df.y == 1).sum())), random_state=1), df[df.y == 0].sample(4000, random_state=1)]).reset_index(drop=True)
hand = np.where(df.stand_r == 1, 1.0, -1.0)
la, br = df.launch_angle.to_numpy(), df.bearing.to_numpy()
R, Z = fly_path(df.launch_speed.to_numpy() * MPH, np.deg2rad(la), np.deg2rad(br), np.maximum(0, -763 + 120 * la) * RPM, (-hand * 849 - 94 * br) * RPM, df.air_density.to_numpy())
df["sim_ft"] = R[:, -1] / FT
df["err"] = df.sim_ft - df.hit_distance_sc
for lab, d in (("actual HRs", df[df.y == 1]), ("non-HR balls", df[df.y == 0])):
    print(lab, "n", len(d), "| mean err %.1f ft, median %.1f, MAE %.1f" % (d.err.mean(), d.err.median(), d.err.abs().mean()))
hr = df[df.y == 1].copy()
hr["ev_bin"] = pd.cut(hr.launch_speed, [80, 95, 100, 103, 106, 109, 130])
print("\nActual HRs by exit speed: simulated minus Statcast projected distance (ft)")
print(hr.groupby("ev_bin", observed=True).err.agg(["count", "mean", "median"]).round(1).to_string())
hr["la_bin"] = pd.cut(hr.launch_angle, [12, 22, 26, 30, 34, 40, 55])
print("\nActual HRs by launch angle:")
print(hr.groupby("la_bin", observed=True).err.agg(["count", "mean", "median"]).round(1).to_string())
print("\nShare of actual HRs whose simulated distance is under their projected distance by 15+ ft: %.3f" % (hr.err < -15).mean())
print("tailwind check (om_wind_mph is speed only; skipping direction)")
