"""Label audit (GPT round 2, item 4): the direction and distance training labels are read off Statcast's hit coordinates (hc_x, hc_y) and the projected distance
(hit_distance_sc). They are not one physical measurement. This checks how the two agree by event type, era and launch angle, and how often each is missing, so we know
which balls make clean training labels for the direction and distance teachers. Output: science/label_audit.md. Reads a dozen columns, about 150 MB."""
import numpy as np
import pandas as pd

def _md(self, index=False):  # pandas' to_markdown needs tabulate; a plain version avoids installing it
    cs = [str(c) for c in self.columns]
    rows = ["| " + " | ".join(cs) + " |", "|" + "|".join("---" for _ in cs) + "|"]
    for r in self.itertuples(index=False):
        rows.append("| " + " | ".join(str(v) for v in r) + " |")
    return "\n".join(rows)


pd.DataFrame.to_markdown = _md
D = "C:/Users/andrewwi/dev/nuke-navigator-new/data/derived/"
cols =["rid", "game_year", "hawkeye", "events", "bb_type", "hc_x", "hc_y", "hit_distance_sc", "launch_speed", "launch_angle", "bearing", "split"]
df = pd.read_parquet(D + "exp_features.parquet", columns=[c for c in cols if c != "split"])
sp = pd.read_parquet(D + "bakeoff_features_v9.parquet", columns=["rid", "split"])
df = df.merge(sp, on="rid", how="left")
df["dx"], df["dy"] = df.hc_x - 125.42, 198.27 - df.hc_y
df["rpx"] = np.hypot(df.dx, df.dy)
air = df[df.bb_type.isin(["fly_ball", "line_drive"]) & df.hc_x.notna() & df.hit_distance_sc.notna() & df.launch_speed.notna()].copy()
# the scale from hit-coordinate pixels to feet, from fly-ball outs that were not obviously caught at the wall
ref = air[(air.bb_type == "fly_ball") & (air.events == "field_out") & air.hit_distance_sc.between(250, 380) & (air.game_year >= 2020)]
scale = float((ref.hit_distance_sc / ref.rpx).median())
air["hc_ft"] = air.rpx * scale
air["res"] = air.hit_distance_sc - air.hc_ft  # positive: the projected distance is longer than the spot the coordinates mark
def cls(r):
    e = r
    return "home_run" if e == "home_run" else "double_triple" if e in ("double", "triple") else "single" if e == "single" else "out_in_air" if e in ("field_out", "force_out", "sac_fly", "double_play", "grounded_into_double_play") else "other"
air["cls"] = air.events.map(cls)
L = []
L.append("# Label audit: hit coordinates against projected distance\n")
L.append(f"Rows with both labels in the air (fly balls and line drives): {len(air):,}. Pixel to feet scale from {len(ref):,} fly-ball outs between 250 and 380 ft since 2020: {scale:.3f} ft per pixel (home plate at 125.42, 198.27).\n")
L.append("`res` = projected distance minus the distance implied by the hit coordinates. Positive means the projected distance is longer than the marked spot.\n")
def tab(g, keys):
    t = g.groupby(keys).res.agg(n="size", median="median", mad=lambda s: float((s - s.median()).abs().median()), p10=lambda s: s.quantile(.1), p90=lambda s: s.quantile(.9)).round(1)
    return t.reset_index().to_markdown(index=False)
L.append("## By event class, 2020 and later (Hawk-Eye era)\n")
L.append(tab(air[air.game_year >= 2020], ["cls"]) + "\n")
L.append("## By event class and year, fly balls only\n")
fb = air[air.bb_type == "fly_ball"]
L.append(tab(fb[fb.cls.isin(["home_run", "out_in_air", "double_triple"])], ["cls", "game_year"]) + "\n")
L.append("## By launch angle band, fly balls and line drives, 2020 and later\n")
air["la_band"] = pd.cut(air.launch_angle, [-90, 10, 20, 30, 40, 50, 90]).astype(str)
L.append(tab(air[air.game_year >= 2020], ["la_band"]) + "\n")
L.append("## Missingness of each label by year (all balls in the modeling table)\n")
m = df.groupby("game_year").agg(n=("rid", "size"), no_hc=("hc_x", lambda s: s.isna().mean()), no_dist=("hit_distance_sc", lambda s: s.isna().mean()), no_bearing=("bearing", lambda s: s.isna().mean())).round(3).reset_index()
L.append(m.to_markdown(index=False) + "\n")
L.append("## Missingness by event class, fly balls, 2020 and later\n")
fb20 = df[(df.bb_type == "fly_ball") & (df.game_year >= 2020)].copy()
fb20["cls"] = fb20.events.map(cls)
L.append(fb20.groupby("cls").agg(n=("rid", "size"), no_dist=("hit_distance_sc", lambda s: s.isna().mean()), no_hc=("hc_x", lambda s: s.isna().mean())).round(3).reset_index().to_markdown(index=False) + "\n")
# how much of the direction-teacher training set is each class
tr = df[(df.split == "train") & df.bearing.notna()]
L.append("## What the direction teacher trains on (train split, rows with a bearing)\n")
L.append(tr.assign(cls=tr.events.map(cls)).groupby("cls").size().rename("n").reset_index().assign(share=lambda t: (t.n / t.n.sum()).round(3)).to_markdown(index=False) + "\n")
open("C:/Users/andrewwi/dev/nuke-navigator-new/science/label_audit.md", "w", encoding="utf-8").write("\n".join(L))
print("\n".join(L))
