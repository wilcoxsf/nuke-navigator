"""Builds the shared dataset for the next experiments so none of them has to re-run the flight simulation: 40,000 balls since 2023-07-14 with bat tracking (random sample of airborne fair balls, 8 to 55 degrees),
each with its carry (air-density multiplier that reproduces the Statcast projected distance, by bisection), the local sensitivity J = dD/dlog(carry), the simulated distance at carry 1, and every feature the
experiments use (contact, weather, the whole pitch trajectory including vx0 to az, release point, extension, swing tracking, outcome). Written to data/derived/carry_dataset.parquet (git-ignored with data/).
Runs at below-normal priority, about 25 minutes."""
import numpy as np
import pandas as pd

from flight_fit import FT, MPH, RPM
from savant_xhr_compare import ROOT, fly_path

COLS = ["game_pk", "game_date", "game_year", "type", "events", "batter", "pitcher", "home_team", "stand_r", "p_throws", "pitch_type", "launch_speed", "launch_angle", "bearing", "hit_distance_sc", "air_density",
        "om_temp_f", "om_rh", "om_pressure_hpa", "om_wind_u", "om_wind_v", "elevation_ft", "release_speed", "release_spin_rate", "spin_axis", "pfx_x", "pfx_z", "plate_x", "plate_z", "sz_top", "sz_bot",
        "vx0", "vy0", "vz0", "ax", "ay", "az", "release_pos_x", "release_pos_y", "release_pos_z", "release_extension", "arm_angle", "bat_speed", "attack_angle", "swing_path_tilt", "swing_length", "vaa", "y"]
df = pd.read_parquet(ROOT + "data/derived/exp_features.parquet", columns=COLS)
df["game_date"] = df.game_date.astype(str)
df = df[(df.game_date >= "2023-07-14") & (df.type == "X") & df.launch_speed.between(70, 125) & df.launch_angle.between(8, 55) & df.bearing.between(-44, 44) & df.hit_distance_sc.between(150, 480)
        & df.air_density.notna() & df.bat_speed.notna() & df.attack_angle.notna()].sample(40000, random_state=17).reset_index(drop=True)
hand = np.where(df.stand_r == 1, 1.0, -1.0)
la, br = df.launch_angle.to_numpy(float), df.bearing.to_numpy(float)
base = dict(v0=df.launch_speed.to_numpy(float) * MPH, theta=np.deg2rad(la), phi=np.deg2rad(br), w_back=np.maximum(0, -763 + 120 * la) * RPM, w_side=(-hand * 864 - 75 * br) * RPM)
rho0, target = df.air_density.to_numpy(float), df.hit_distance_sc.to_numpy(float)
n, CH = len(df), 4000


def flown(mult):
    d = np.zeros(n)
    for s in range(0, n, CH):
        sl = slice(s, s + CH)
        R, _ = fly_path(rho=rho0[sl] * mult[sl], **{k: v[sl] for k, v in base.items()})
        d[sl] = R[:, -1] / FT
    return d


df["sim0"] = flown(np.ones(n))
lo, hi = np.full(n, 0.2), np.full(n, 1.8)
for k in range(11):
    mid = 0.5 * (lo + hi)
    too_far = flown(mid) > target
    lo, hi = np.where(too_far, mid, lo), np.where(too_far, hi, mid)
    print("  carry pass", k + 1, flush=True)
m = 0.5 * (lo + hi)
df["logm"] = np.log(m)
df["J"] = (flown(m * np.exp(0.01)) - flown(m * np.exp(-0.01))) / 0.02
df["gap"] = df.launch_angle - df.attack_angle
df.to_parquet(ROOT + "data/derived/carry_dataset.parquet")
print("written", len(df), "rows; log carry mean %.3f sd %.3f; share of roots at the bounds %.4f" % (df.logm.mean(), df.logm.std(), np.mean((m < 0.25) | (m > 1.7))), flush=True)
