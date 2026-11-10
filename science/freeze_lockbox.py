"""Freeze the 2026 postseason lockbox (10 Nov 2026, after GPT's red team; LOCKBOX-PLAN.md v2). Reads no outcome of a sealed ball.

1. The cohort ledger, label-blind: raw pull rows -> de-duplicated -> in play (type X) -> measured (launch speed, angle, stand) = the scored cohort; missingness by
   game, venue and date; and every scored key found exactly once among the sealed file's KEYS (only the key columns of sealed.parquet are read).
2. One frozen prediction file, data/prod/lockbox/frozen/pred_frozen.parquet: keys, game_date, venue_id, margin_hat, and p_blend (the champion), p_s3, p_xgb
   (three-seed XGBoost), p_logit (contact-only logistic, trained on the training split), p_flat (the training split's home-run rate). Asserts: 1,931 unique keys,
   40 games, every probability finite and in [0, 1].
3. What changed against the first prediction vector (pred_post_v1_constantfalse.parquet, before the history fix), ball by ball.
4. manifest.json: SHA-256 of the frozen file, the opener (open_lockbox.py), the plan, this script and the cohort keys; the git commit; library versions.
Usage: python science/freeze_lockbox.py [--plan <LOCKBOX-PLAN.md>]"""
import argparse
import hashlib
import json
import platform
import subprocess
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = "C:/Users/andrewwi/dev/nuke-navigator-new/"
P = ROOT + "data/prod/"
LB = Path(P + "lockbox"); FZ = LB / "frozen"; FZ.mkdir(parents=True, exist_ok=True)
ap = argparse.ArgumentParser()
ap.add_argument("--plan", default="C:/Users/andrewwi/Documents/NukeNavigator/LOCKBOX-PLAN.md")
a = ap.parse_args()
K = ["game_pk", "at_bat_number", "pitch_number"]
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
out = []
say = lambda s: (out.append(s), print(s))

# ---- 1. the cohort ledger (no outcome column is read) ----
raw = pd.read_parquet(ROOT + "data/raw/statcast_post2026/statcast_bbe_2026_raw.parquet", columns=K + ["game_date", "home_team", "type", "launch_speed", "launch_angle", "stand"])
for c in K: raw[c] = pd.to_numeric(raw[c], errors="coerce")
raw["launch_speed"] = pd.to_numeric(raw.launch_speed, errors="coerce"); raw["launch_angle"] = pd.to_numeric(raw.launch_angle, errors="coerce")
n0 = len(raw); dd = raw.drop_duplicates(K); n1 = len(dd)
inplay = dd[(dd.type == "X") | dd.type.isna()]; n2 = len(inplay)
meas = inplay[inplay.launch_speed.notna() & inplay.launch_angle.notna() & inplay.stand.isin(["L", "R"])]; n3 = len(meas)
say("# Lockbox freeze, " + datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"))
say("## Cohort ledger (label-blind)")
say(f"- raw pull rows: {n0:,}; after de-duplicating on game, at-bat and pitch: {n1:,}; in play (type X): {n2:,} (not in play: {n1 - n2:,}); with exit speed, launch angle and a batter side: {n3:,} (missing a measurement: {n2 - n3:,})")
miss = inplay.assign(m=~inplay.index.isin(meas.index)).groupby(["game_date", "home_team"]).m.agg(["size", "sum"]).rename(columns={"size": "in_play", "sum": "unmeasured"})
say(f"- games: {inplay.game_pk.nunique()} with balls in play, {meas.game_pk.nunique()} with measured balls; unmeasured balls by game (date, home team): " + ", ".join(f"{d} {t} {int(r.unmeasured)}/{int(r.in_play)}" for (d, t), r in miss[miss.unmeasured > 0].iterrows()))
sk = pd.read_parquet(LB / "sealed.parquet", columns=K)  # (keys only)
dup_sealed = int(sk.duplicated(K).sum())
say(f"- sealed outcome file: {len(sk):,} keyed rows ({dup_sealed} duplicated keys)")

# ---- 2. the frozen prediction file ----
t = pd.read_parquet(P + "bakeoff_features_v5r.parquet", columns=["rid", "split", "y", "game_pk", "game_date", "venue_id", "margin_hat"])
flat = float(t.y[t.split == "train"].mean())  # (the training split's labels: regular season 2015-2024)
t = t[t.split == "post"].merge(pd.read_parquet(P + "bakeoff_features.parquet", columns=["rid", "at_bat_number", "pitch_number"]), on="rid")
for name, f in (("p_blend", "blend_prod.parquet"), ("p_s3", "final8/S3.parquet"), ("p_xgb", "v39c_avg/pred_xgb.parquet"), ("p_logit", "logit/pred_logit.parquet")):
    x = pd.read_parquet(P + f)[["rid", "p_hr"]].rename(columns={"p_hr": name})
    assert not x.rid.duplicated().any(), f
    t = t.merge(x, on="rid", how="left", validate="one_to_one")
t["p_flat"] = flat
fz = t[K + ["game_date", "venue_id", "margin_hat", "p_blend", "p_s3", "p_xgb", "p_logit", "p_flat"]].copy()
for c in K: fz[c] = fz[c].astype("int64")
cols = ["p_blend", "p_s3", "p_xgb", "p_logit", "p_flat"]
assert len(fz) == 1931 and not fz.duplicated(K).any(), (len(fz), int(fz.duplicated(K).sum()))
assert fz.game_pk.nunique() == 40, fz.game_pk.nunique()
assert np.isfinite(fz[cols].to_numpy()).all() and (fz[cols].to_numpy() >= 0).all() and (fz[cols].to_numpy() <= 1).all(), "a probability is missing or out of [0, 1]"
mk = set(map(tuple, meas[K].astype("int64").to_numpy())); fk = set(map(tuple, fz[K].to_numpy()))
assert fk == mk, f"the scored cohort is not the measured in-play cohort: {len(fk - mk)} extra, {len(mk - fk)} missing"
sc = sk.astype("int64").value_counts().rename("n").reset_index()
m = fz[K].merge(sc, on=K, how="left")
assert m.n.notna().all() and (m.n == 1).all(), f"{int(m.n.isna().sum())} scored balls have no sealed record, {int((m.n > 1).sum())} have more than one"
say(f"- scored cohort: {len(fz):,} balls, {fz.game_pk.nunique()} games; every scored ball has exactly one sealed record; {len(sk) - len(fz):,} sealed records are outside the cohort (not in play or unmeasured), counted, never scored")
fz.to_parquet(FZ / "pred_frozen.parquet")
pd.DataFrame(sorted(fk), columns=K).to_parquet(FZ / "cohort_keys.parquet")
say("## The frozen predictions")
say(f"- mean predicted chance: " + ", ".join(f"{c} {fz[c].mean():.4f}" for c in cols) + f"; expected home runs (champion) {fz.p_blend.sum():.1f}")

# ---- 3. against the first prediction vector (before the history fix) ----
v1 = pd.read_parquet(LB / "pred_post_v1_constantfalse.parquet")[K + ["p_blend"]].rename(columns={"p_blend": "v1"})
for c in K: v1[c] = v1[c].astype("int64")
c1 = fz[K + ["p_blend"]].merge(v1, on=K, validate="one_to_one"); d = (c1.p_blend - c1.v1).to_numpy()
say("## What the history fix changed (the champion, against the first vector)")
say(f"- {len(c1):,} balls; changed by more than 0.0001: {int((np.abs(d) > 1e-4).sum()):,}; mean change {d.mean():+.5f}; |change| median {np.median(np.abs(d)):.5f}, 95th {np.percentile(np.abs(d), 95):.5f}, max {np.abs(d).max():.4f}; expected home runs {c1.v1.sum():.1f} -> {c1.p_blend.sum():.1f}")

# ---- 4. the manifest ----
opener = Path(ROOT + "science/open_lockbox.py")
commit = subprocess.run(["git", "-C", ROOT, "rev-parse", "HEAD"], capture_output=True, text=True).stdout.strip()
dirty = subprocess.run(["git", "-C", ROOT, "status", "--porcelain", "science"], capture_output=True, text=True).stdout.strip()
import lightgbm, sklearn, xgboost
man = {"frozen_utc": datetime.now(timezone.utc).isoformat(timespec="seconds"), "n": len(fz), "games": int(fz.game_pk.nunique()), "flat_rate": flat,
       "sha256": {"pred_frozen.parquet": sha(FZ / "pred_frozen.parquet"), "cohort_keys.parquet": sha(FZ / "cohort_keys.parquet"), "open_lockbox.py": sha(opener),
                  "freeze_lockbox.py": sha(__file__), "plan": sha(a.plan)},
       "plan_path": a.plan, "git_commit": commit, "science_uncommitted": dirty.splitlines(), "python": platform.python_version(),
       "libs": {"pandas": pd.__version__, "numpy": np.__version__, "lightgbm": lightgbm.__version__, "xgboost": xgboost.__version__, "sklearn": sklearn.__version__}}
json.dump(man, open(FZ / "manifest.json", "w"), indent=1)
(FZ / "freeze_report.md").write_text("\n".join(out) + "\n", encoding="utf-8")
print("frozen:", FZ / "pred_frozen.parquet", "| manifest:", FZ / "manifest.json")
