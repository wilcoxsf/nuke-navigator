"""Experiment E14: does the sandbox physics respond to weather the way real balls do? Carry (the air-density multiplier that reproduces Statcast's projected distance) is measured against each ball's OWN
air density, so if the physics scaled air perfectly, carry would not move with temperature, altitude, humidity or wind once the ball's contact is controlled. A leftover slope means the what-if sliders
(temperature, wind, park elevation in the Goner Grid) are mis-scaled by that much. Method: ordinary least squares of log carry on contact controls (exit speed, launch angle, squares, hand, bearing, swing gap)
plus weather terms, over the 40,000-ball carry dataset; then the same with a LightGBM partial effect as a check on linearity. The slope is converted to feet of distance with the local sensitivity J.
Output: science/weather_response.md. Seconds."""
import lightgbm as lgb
import numpy as np
import pandas as pd

ROOT = "C:/Users/andrewwi/dev/nuke-navigator-new/"
out = []


def say(s=""):
    print(s, flush=True)
    out.append(s)


df = pd.read_parquet(ROOT + "data/derived/carry_dataset.parquet")
df = df[df.om_temp_f.notna() & df.om_wind_v.notna() & df.om_rh.notna()].reset_index(drop=True)
df["gap"] = df.launch_angle - df.attack_angle
hand = np.where(df.stand_r == 1, 1.0, -1.0)
br = df.bearing.to_numpy(float)
df["wind_along"] = df.om_wind_v.to_numpy(float) * np.cos(np.deg2rad(br)) + df.om_wind_u.to_numpy(float) * np.sin(np.deg2rad(br))  # field frame: v toward center, u toward right field
df["wind_cross"] = -df.om_wind_v.to_numpy(float) * np.sin(np.deg2rad(br)) + df.om_wind_u.to_numpy(float) * np.cos(np.deg2rad(br))
y = df.logm.to_numpy(float)
ctrl = pd.DataFrame({"ev": df.launch_speed, "la": df.launch_angle, "ev2": df.launch_speed ** 2, "la2": df.launch_angle ** 2, "evla": df.launch_speed * df.launch_angle, "hand": hand, "bear2": br ** 2,
                     "gap": df.gap.fillna(df.gap.median())})
wx = pd.DataFrame({"temp_10F": df.om_temp_f / 10, "elev_1000ft": df.elevation_ft / 1000, "rh_10pct": df.om_rh / 10, "wind_along_mph": df.wind_along, "wind_cross_mph": df.wind_cross})
say("# Does the physics respond to weather like real balls do? (22 Oct 2026), %d balls with a carry label (sidespin prior -864 / -75)" % len(df))
say("weather ranges: temperature %.0f to %.0f F (middle 90%%: %.0f to %.0f), elevation %.0f to %.0f ft, humidity %.0f to %.0f%%" % (df.om_temp_f.min(), df.om_temp_f.max(), df.om_temp_f.quantile(.05), df.om_temp_f.quantile(.95), df.elevation_ft.min(), df.elevation_ft.max(), df.om_rh.min(), df.om_rh.max()))
keep = np.isfinite(np.column_stack([ctrl.to_numpy(float), wx.to_numpy(float), y])).all(axis=1)
say("rows with every input present: %d of %d" % (keep.sum(), len(df)))
df, ctrl, wx, y = df[keep].reset_index(drop=True), ctrl[keep].reset_index(drop=True), wx[keep].reset_index(drop=True), y[keep]
X = np.column_stack([np.ones(len(df)), ctrl.to_numpy(float), wx.to_numpy(float)])
Xs = (X - X.mean(0)) / np.where(X.std(0) > 0, X.std(0), 1)
Xs[:, 0] = 1
coef, *_ = np.linalg.lstsq(X, y, rcond=None)
res = y - X @ coef
n, k = X.shape
cov = np.linalg.inv(X.T @ X) * (res @ res) / (n - k)
# cluster by game for honest errors
g = df.game_pk.to_numpy()
ug, inv = np.unique(g, return_inverse=True)
bread = np.linalg.inv(X.T @ X)
meat = np.zeros((k, k))
sc = X * res[:, None]
gsum = np.zeros((len(ug), k))
np.add.at(gsum, inv, sc)
meat = gsum.T @ gsum
vc = bread @ meat @ bread
se = np.sqrt(np.diag(vc))
names = ["const"] + list(ctrl.columns) + list(wx.columns)
J = df.J.median()
say("\n## Linear model of log carry (game-clustered standard errors); J = %.0f ft per unit log carry, so 0.01 in log carry is about %.1f ft" % (J, 0.01 * J))
for i, nm in enumerate(names):
    if i >= 1 + ctrl.shape[1]:
        say("  %-18s %+8.4f   (se %.4f)   -> %+.1f ft per unit   t = %+.1f" % (nm, coef[i], se[i], coef[i] * J, coef[i] / se[i]))
say("\nReading the weather terms (a negative feet figure = real balls travel LESS than the physics says as that variable rises; carry is a density multiplier and J is negative):")
t10 = coef[names.index("temp_10F")]
say("  temperature: %+.1f ft per +10 F beyond what the physics already gives (the physics itself gives about +3 ft per +10 F at 100 mph, 28 degrees)" % (t10 * J))
e = coef[names.index("elev_1000ft")]
say("  elevation: %+.1f ft per +1000 ft beyond the physics (Coors at 5,200 ft: %+.1f ft)" % (e * J, e * 5.2 * J))
w = coef[names.index("wind_along_mph")]
say("  wind along the ball's path: %+.1f ft per mph of tailwind, beyond the physics' calm-air carry (the sandbox's wind term is separate and is not in this regression's physics)" % (w * J))
# flexible check on temperature and elevation
F = list(ctrl.columns) + list(wx.columns)
Z = pd.concat([ctrl, wx], axis=1)
m = lgb.LGBMRegressor(n_estimators=300, learning_rate=0.05, num_leaves=15, min_child_samples=100, subsample=0.8, subsample_freq=1, verbose=-1, n_jobs=3).fit(Z, y)
say("\n## Flexible check: LightGBM partial effect of temperature on log carry, other inputs at their own values")
base = Z.copy()
for t in (45, 55, 65, 75, 85, 95):
    zz = base.copy()
    zz["temp_10F"] = t / 10
    say("  temperature %2d F: mean predicted log carry %+.4f  (%+.1f ft vs 65 F)" % (t, m.predict(zz).mean(), 0))
ref = m.predict(base.assign(temp_10F=6.5)).mean()
say("  (relative to 65 F, in feet at the median sensitivity)")
for t in (45, 55, 75, 85, 95):
    say("    %2d F: %+.1f ft" % (t, (m.predict(base.assign(temp_10F=t / 10)).mean() - ref) * J))
say("\n## Flexible check: elevation")
for ft in (0, 500, 1000, 5200):
    say("    %4d ft: %+.1f ft vs sea level" % (ft, (m.predict(base.assign(elev_1000ft=ft / 1000)).mean() - m.predict(base.assign(elev_1000ft=0.0)).mean()) * J))
open(ROOT + "science/weather_response.md", "w", encoding="utf-8").write("\n".join(out) + "\n")
