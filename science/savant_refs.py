"""Savant's own per-ball expectations as home-run references for the lockbox (10 Nov 2026; Andrew: "Can we test it against other models too to see if it's better
than like expected HR from savant?"). Savant's xHR on its leaderboards counts the parks a ball would leave from where it actually flew (distance and direction),
a measurement of the outcome, not a prediction from contact, so it cannot be a fair opponent and would need the sealed landing data. Savant's contact-time
expectations can: every ball carries Savant's launch-speed-angle class (the barrel classification, 1 weak to 6 barrel) and its expected batting average,
slugging and wOBA from exit speed and launch angle. Two references, each fit on the regular-season TRAINING balls only (2015-2024):
  p_savant_lsa  the home-run rate of the ball's Savant launch-speed-angle class
  p_savant_x    a logistic on Savant's expected BA, SLG and wOBA (with squares), a missing value set to the training mean with a missing flag
A ball without Savant's value gets the training home-run rate. Writes data/prod/lockbox/savant_refs.parquet (keys and the two probabilities for every
postseason ball in the frozen cohort) and prints, for context, both references against the champion on the 2025-26 test balls (labels long since used).
Reads no outcome of a sealed ball. Usage: python science/savant_refs.py"""
import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression

ROOT = "C:/Users/andrewwi/dev/nuke-navigator-new/"
P = ROOT + "data/prod/"; R = ROOT + "data/derived/"
K = ["game_pk", "at_bat_number", "pitch_number"]
X = ["estimated_ba_using_speedangle", "estimated_slg_using_speedangle", "estimated_woba_using_speedangle"]
b = pd.read_parquet(P + "bbe_prod.parquet", columns=K + ["game_date", "launch_speed_angle", "is_home_run", "sealed"] + X)
for c in K: b[c] = b[c].astype("int64")
b["gd"] = pd.to_datetime(b.game_date)
tr = b[(~b.sealed.fillna(False).astype(bool)) & (b.gd < "2025-03-01")].copy()
tr["y"] = tr.is_home_run.astype(float)
flat = float(tr.y.mean())
lsa = tr.groupby("launch_speed_angle").y.mean().to_dict()
mu = {c: float(tr[c].mean()) for c in X}
def design(d):
    cols = []
    for c in X:
        v = d[c].astype(float); m = v.isna().to_numpy(); v = v.fillna(mu[c]).to_numpy()
        cols += [v, v * v, m.astype(float)]
    return np.column_stack(cols)
clf = LogisticRegression(max_iter=2000, C=10.0).fit(design(tr), tr.y)
def refs(d):
    p_lsa = d.launch_speed_angle.map(lsa).astype(float).fillna(flat).to_numpy()
    p_x = clf.predict_proba(design(d))[:, 1]
    allmiss = d[X].isna().all(axis=1).to_numpy(); p_x[allmiss] = flat
    return p_lsa, p_x
print(f"training balls {len(tr):,}; home-run rate {flat:.4f}; by Savant class: " + ", ".join(f"{int(k)} {v:.3f}" for k, v in sorted(lsa.items()) if k == k))
# the 2025-26 test balls, for context
keys = pd.read_parquet(P + "bakeoff_features.parquet", columns=["rid", "at_bat_number", "pitch_number"]).merge(
    pd.read_parquet(P + "bakeoff_features_v5r.parquet", columns=["rid", "split", "y", "game_pk"]), on="rid")
te = keys[keys.split == "test"].merge(b[K + ["launch_speed_angle"] + X], on=K, how="left", validate="one_to_one")
te = te.merge(pd.read_parquet(R + "blend_c25_t200_m1500.parquet")[["rid", "p_hr"]], on="rid")
a, c = refs(te); y = te.y.to_numpy()
B = lambda p: float(((p - y) ** 2).mean())
print(f"2025-26 test ({len(te):,} balls): champion {B(te.p_hr.to_numpy()):.5f}; Savant class {B(a):.5f}; Savant expected stats {B(c):.5f}; flat {B(np.full(len(y), flat)):.5f}")
# the frozen postseason cohort
fz = pd.read_parquet(P + "lockbox/frozen/cohort_keys.parquet")
po = fz.merge(b[K + ["launch_speed_angle"] + X], on=K, how="left", validate="one_to_one")
assert len(po) == len(fz) == 1931
a, c = refs(po)
pd.DataFrame({**{k: po[k].to_numpy() for k in K}, "p_savant_lsa": a, "p_savant_x": c}).to_parquet(P + "lockbox/savant_refs.parquet")
print(f"postseason cohort: {len(po):,} balls; mean Savant class reference {a.mean():.4f}, Savant expected-stats reference {c.mean():.4f}; missing Savant class {int(po.launch_speed_angle.isna().sum())}, missing all expected stats {int(po[X].isna().all(axis=1).sum())}")
