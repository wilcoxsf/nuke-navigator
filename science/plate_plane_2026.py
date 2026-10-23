"""Experiment E4 (GPT round-3 idea 10): did Statcast's plate coordinates change reference plane in 2026? Savant's CSV documentation (as GPT read it) says plate_x and plate_z were measured at the FRONT of
home plate through 2025 and at the MIDDLE from 2026. If so, for a descending pitch the height at the middle of the plate is lower by (plate depth, about 8.5 in) x tan(approach angle). Test: monthly
medians of plate_z, plate_x and the approach angle for fastballs (90+ mph) across 2025 and 2026; the expected 2026 drop in plate_z is about 8.5 in x tan(vaa) / 12 feet. Also checks whether our own pitch
features (vaa, haa, plate_speed, plate_z_rel) show the same break, since those feed the direction and collision models.
Fast (about a minute). Output: science/plate_plane_2026.md."""
import numpy as np
import pandas as pd

ROOT = "C:/Users/andrewwi/dev/nuke-navigator-new/"
df = pd.read_parquet(ROOT + "data/derived/exp_features.parquet", columns=["game_date", "game_year", "release_speed", "plate_x", "plate_z", "sz_top", "sz_bot", "vaa", "haa", "plate_speed", "plate_z_rel", "pitch_type", "release_extension", "release_pos_z", "vz0", "vy0", "az", "ay"])
df = df[(df.game_date >= "2025-03-01") & df.plate_z.notna() & (df.release_speed >= 90) & df.pitch_type.isin(["FF", "SI"])].copy()
df["month"] = df.game_date.astype(str).str[:7]
g = df.groupby("month").agg(n=("plate_z", "size"), plate_z=("plate_z", "median"), plate_x=("plate_x", "median"), z_rel=("plate_z_rel", "median"), vaa=("vaa", "median"), haa=("haa", "median"), speed=("plate_speed", "median"), sz_mid=("sz_top", "median"))
out = ["# Plate plane check (22 Oct 2026): four-seam and sinker fastballs, 90+ mph, by month", "", g.round(3).to_string(), ""]
pre = df[(df.game_date >= "2025-04-01") & (df.game_date < "2025-10-01")]
post = df[df.game_date >= "2026-03-01"]
tan = np.tan(np.deg2rad(-pre.vaa.median())) if pre.vaa.median() < 0 else np.tan(np.deg2rad(pre.vaa.median()))
exp_drop = 8.5 * tan / 12
dz = post.plate_z.median() - pre.plate_z.median()
dx = post.plate_x.median() - pre.plate_x.median()
dv = post.vaa.median() - pre.vaa.median()
# bootstrap by game date for an interval on the plate_z shift
rng = np.random.default_rng(0)
days_pre, days_post = pre.groupby("game_date").plate_z.median().to_numpy(), post.groupby("game_date").plate_z.median().to_numpy()
bs = [np.median(rng.choice(days_post, len(days_post))) - np.median(rng.choice(days_pre, len(days_pre))) for _ in range(2000)]
out += [f"Regular season 2025 (April to September) versus 2026: median plate_z {pre.plate_z.median():.3f} to {post.plate_z.median():.3f} ft, shift {dz:+.3f} ft (95% interval {np.percentile(bs, 2.5):+.3f} to {np.percentile(bs, 97.5):+.3f}, by day).",
        f"Expected shift if the reference plane moved from the front to the middle of the plate: about -{exp_drop:.3f} ft for a median approach angle of {pre.vaa.median():.1f} degrees.",
        f"plate_x shift {dx:+.3f} ft; our vaa shift {dv:+.2f} degrees; plate_z_rel shift {post.plate_z_rel.median() - pre.plate_z_rel.median():+.3f}.",
        "Reading: a plate_z shift near the expected drop supports the documented plane change (and says 2026 pitch-location features differ in definition from earlier years); a shift near zero says the data were not changed or were already corrected."]
open(ROOT + "science/plate_plane_2026.md", "w", encoding="utf-8").write("\n".join(out) + "\n")
print("\n".join(out))
