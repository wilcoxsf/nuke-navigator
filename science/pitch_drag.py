"""Pitch-derived drag, our own version of the Savant drag dashboard (26 Oct 2026; research sweep lead 1). For every four-seam fastball that was put in play (the only pitches we hold), drag coefficient from the Statcast nine-parameter fit:
  a' = (ax, ay, az + g), velocity at mid-flight v_m = v0 + a * t/2 (t = flight time from y = 50 ft to the plate), drag acceleration a_D = -(a' . v_m / |v_m|), Cd = 2 m a_D / (rho A |v_m|^2) in SI units, rho from the reanalysis air density.
Per-ball features (strictly earlier pitches only), written to data/derived/pitch_drag.parquet keyed by rid:
  cd_gm   shrunk mean Cd of the game's earlier four-seamers, as a deviation from the previous-day league mean (k = 10 pitches)
  cd_lg1  league mean Cd of the previous calendar day minus its 30-day mean; cd_lg3 the previous 3 days
Also prints the first check: correlation of the daily league Cd with the daily mean fly-ball distance miss (hit_distance_sc - mlp_d)."""
import numpy as np
import pandas as pd

ROOT = "C:/Users/andrewwi/dev/nuke-navigator-new/"
D = ROOT + "data/derived/"
x = pd.read_parquet(D + "bbe_2015_2026_x.parquet", columns=["game_pk", "at_bat_number", "pitch_number", "pitch_type", "vx0", "vy0", "vz0", "ax", "ay", "az"])
b = pd.read_parquet(D + "bakeoff_features.parquet", columns=["rid", "game_pk", "at_bat_number", "pitch_number"])
f = pd.read_parquet(D + "bakeoff_features_v5r.parquet", columns=["rid", "game_date", "air_density", "hit_distance_sc", "launch_angle", "launch_speed"])
f = f.merge(pd.read_parquet(D + "bakeoff_features_v39c.parquet", columns=["rid", "mlp_d"]), on="rid")
d = b.merge(x.drop_duplicates(["game_pk", "at_bat_number", "pitch_number"]), on=["game_pk", "at_bat_number", "pitch_number"], how="left").merge(f, on="rid")
d = d.sort_values(["game_date", "game_pk", "at_bat_number", "pitch_number"]).reset_index(drop=True)
print("rows %d, air density mean %.4f (units as stored)" % (len(d), d.air_density.mean()))
rho = d.air_density.to_numpy()
rho = np.where(rho < 0.2, rho * 16.0185, rho)  # lb/ft^3 -> kg/m^3 if stored that way
G = 32.174
vy0, ay = d.vy0.to_numpy(), d.ay.to_numpy()
yp = 17.0 / 12.0
disc = vy0 ** 2 - 2 * ay * (50.0 - yp)
t = (-vy0 - np.sqrt(np.clip(disc, 0, None))) / ay
v = np.column_stack([d.vx0 + d.ax * t / 2, vy0 + ay * t / 2, d.vz0 + d.az * t / 2])
ap_ = np.column_stack([d.ax, d.ay, d.az + G])
sp = np.linalg.norm(v, axis=1)
aD = -(ap_ * v).sum(1) / sp
M, A, FT = 0.145, np.pi * 0.0366 ** 2, 0.3048
cd = 2 * M * aD * FT / (rho * A * (sp * FT) ** 2)
ff = (d.pitch_type == "FF").to_numpy() & np.isfinite(cd) & (cd > 0.15) & (cd < 0.6)
d["cd"] = np.where(ff, cd, np.nan)
print("four-seamers with Cd: %d; Cd median %.3f, IQR %.3f..%.3f" % (ff.sum(), np.nanmedian(d.cd), *np.nanpercentile(d.cd, [25, 75])))
day = pd.to_datetime(d.game_date).dt.normalize()
d["day"] = day
fly = (d.launch_angle >= 15) & (d.launch_speed >= 80) & d.hit_distance_sc.notna() & d.mlp_d.notna()
d["dres"] = np.where(fly, d.hit_distance_sc - d.mlp_d, np.nan)
daily = d.groupby("day").agg(cd=("cd", "mean"), ncd=("cd", "count"), dres=("dres", "mean"), nd=("dres", "count"))
daily = daily[daily.ncd >= 50]
daily["year"] = daily.index.year
daily["cd_dev"] = daily.cd - daily.groupby("year").cd.transform("mean")
daily["dres_dev"] = daily.dres - daily.groupby("year").dres.transform("mean")
print("\ndays with 50+ four-seamers: %d" % len(daily))
print("corr(daily Cd, daily distance miss), all days: %+.3f; within-season deviations: %+.3f" % (daily.cd.corr(daily.dres), daily.cd_dev.corr(daily.dres_dev)))
yr = daily.groupby("year").agg(cd=("cd", "mean"), dres=("dres", "mean"), sd_cd_daily=("cd", "std"))
print(yr.round(4).to_string())
full = daily[["cd", "ncd"]].reindex(pd.date_range(daily.index.min(), daily.index.max()))
s = (full.cd * full.ncd).fillna(0)
n = full.ncd.fillna(0)
lg1 = (s.shift(1) / n.shift(1)).ffill()
lg3 = (s.rolling(3, min_periods=1).sum().shift(1) / n.rolling(3, min_periods=1).sum().shift(1)).ffill()
lg30 = (s.rolling(30, min_periods=1).sum().shift(1) / n.rolling(30, min_periods=1).sum().shift(1)).ffill()
d["lg1"] = lg1.reindex(day).to_numpy()
d["cd_lg1"] = d.lg1 - lg30.reindex(day).to_numpy()
d["cd_lg3"] = lg3.reindex(day).to_numpy() - lg30.reindex(day).to_numpy()
dev = np.nan_to_num(d.cd - d.lg1)
ok = d.cd.notna().to_numpy() & d.lg1.notna().to_numpy()
dev = np.where(ok, dev, 0.0)
g = d.game_pk.to_numpy()
sm = pd.Series(dev).groupby(g).cumsum().to_numpy() - dev
cn = pd.Series(ok.astype(float)).groupby(g).cumsum().to_numpy() - ok
d["cd_gm"] = sm / (cn + 10.0)
for c in ("cd_gm", "cd_lg1", "cd_lg3"):
    d[c] = d[c].fillna(0.0) * 1000.0  # thousandths of Cd
m = d.dres.notna()
print("\nper fly ball, corr with its own distance miss: cd_gm %+.3f, cd_lg1 %+.3f, cd_lg3 %+.3f" % tuple(np.corrcoef(d.loc[m, c], d.loc[m, "dres"])[0, 1] for c in ("cd_gm", "cd_lg1", "cd_lg3")))
d[["rid", "cd_gm", "cd_lg1", "cd_lg3"]].to_parquet(D + "pitch_drag.parquet")
print("wrote", D + "pitch_drag.parquet")
