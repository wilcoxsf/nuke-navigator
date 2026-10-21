"""Foul-ball feature table, shaped like bakeoff_features_v3 so the density model can read both.

Fouls carry exit speed, launch angle, bat tracking, the contact-point intercept and Savant's projected distance, but no landing coordinates, so
bearing is missing. Everything else is built the way the in-play table is built:
  park, weather and pitch columns   ladder.load (same SQL; is_home_run is false and hawkeye is year >= 2020, as in build_dataset.py)
  contact point and quality         exp_data.add_engineered
  batter and pitcher history        as-of join to the last in-play ball in the rolling-window table (windows are over balls in play only)
  bearing_hat                       the same five direction models as the in-play table, refit on its training rows, averaged on fouls
  phys_dist, phys_hang, fence_hat   same college-fitted flight model and spin teacher as bakeoff_data.py (fence at bearing_hat)
Catcher-interference rows are dropped. Landing bearing is never used as a feature; `bearing` stays missing.

Usage: python foul_features.py --fouls ... --games ... --weather ... --exp ... --inplay ... --college ... --params ... --out ...
"""
from __future__ import annotations

import argparse
import json
import time
from pathlib import Path

import duckdb
import lightgbm as lgb
import numpy as np
import pandas as pd
from sklearn.model_selection import GroupKFold

from bakeoff_data import DIMS, TEST_START, VAL_START, college_teacher, fence_at
from experiments import HID
from exp_data import add_engineered
from flight_fit import FT, MPH, simulate
from flight_transfer import GROUP, GRP_DTYPE
from ladder import BASE0, BAT, CATS, HIST, PITCH, WX, load


def main() -> None:
    ap = argparse.ArgumentParser()
    for k in ("fouls", "games", "weather", "exp", "inplay", "college", "params", "out", "scratch"):
        ap.add_argument(f"--{k}", required=True)
    a = ap.parse_args()
    t0 = time.time()
    g = lambda p: p.replace("\\", "/")
    scratch = Path(g(a.scratch))
    scratch.mkdir(parents=True, exist_ok=True)

    tmp = f"{scratch}/fouls_ladder_in.parquet"
    # hc_x and hc_y are empty for fouls, so the parquet types them as text; the ladder SQL does arithmetic on them
    duckdb.sql(f"COPY (SELECT * REPLACE (CAST(hc_x AS DOUBLE) AS hc_x, CAST(hc_y AS DOUBLE) AS hc_y), year(game_date) AS game_year, (year(game_date) >= 2020) AS hawkeye, false AS is_home_run "
               f"FROM read_parquet('{g(a.fouls)}') WHERE events IS NULL) TO '{tmp}' (FORMAT parquet)")
    df = load(tmp, g(a.games), g(a.weather))
    dims = duckdb.sql(f"SELECT DISTINCT ON (game_pk) game_pk, {', '.join(DIMS)} FROM read_parquet('{g(a.games)}') ORDER BY game_pk, official_date DESC").df()
    df = df.merge(dims, on="game_pk", how="left").sort_values(["game_date", "game_pk", "at_bat_number", "pitch_number"], kind="stable").reset_index(drop=True)
    add_engineered(df)
    df["game_date"] = pd.to_datetime(df.game_date)
    print("fouls loaded", len(df), f"{time.time() - t0:.0f}s", flush=True)

    # history: as-of join to the last in-play ball of the same batter (and pitcher) in the rolling-window table
    key = "(epoch(game_date::TIMESTAMP) / 86400)::BIGINT * 1000000000000 + game_pk::BIGINT * 1000 + at_bat_number::BIGINT"
    ex = f"read_parquet('{g(a.exp)}')"
    con = duckdb.connect()
    con.register("f", df[["batter", "pitcher", "game_date", "game_pk", "at_bat_number", "pitch_number"]].assign(fid=np.arange(len(df))))
    con.sql(f"CREATE VIEW fk AS SELECT fid, batter, pitcher, {key} AS k FROM f")
    con.sql(f"CREATE VIEW ib AS SELECT batter, pitcher, {key} AS k, b_ev, b_la, b_hr, b_hard, b_pull, b_n, b_bat_speed, p_ev, p_hr FROM {ex}")
    hb = con.sql("SELECT fk.fid, ib.b_ev, ib.b_la, ib.b_hr, ib.b_hard, ib.b_pull, ib.b_n, ib.b_bat_speed FROM fk ASOF LEFT JOIN "
                 "(SELECT batter, k, b_ev, b_la, b_hr, b_hard, b_pull, b_n, b_bat_speed FROM ib) ib ON fk.batter = ib.batter AND fk.k >= ib.k").df()
    hp = con.sql("SELECT fk.fid, ib.p_ev, ib.p_hr FROM fk ASOF LEFT JOIN "
                 "(SELECT pitcher, k, p_ev, p_hr FROM ib) ib ON fk.pitcher = ib.pitcher AND fk.k >= ib.k").df()
    for t in (hb, hp):
        t = t.set_index("fid").loc[np.arange(len(df))]
        for c in t.columns:
            df[c] = t[c].to_numpy()
    print("history joined; missing b_ev", float(df.b_ev.isna().mean()), f"{time.time() - t0:.0f}s", flush=True)

    # direction estimate: same five folds as the in-play table, fitted on its training rows
    v2 = HID["H1"]["cols"] + HID["H4"]["cols"]
    bh_feats = BASE0 + PITCH + HIST + WX + BAT + v2
    ip = pd.read_parquet(g(a.inplay), columns=sorted(set(bh_feats) | {"bearing", "split", "game_pk"}))
    ip = ip[(ip.split == "train") & ip.bearing.notna()].reset_index(drop=True)
    for c in CATS:  # fouls must share the in-play category sets so codes and trees line up
        df[c] = pd.Categorical(df[c].astype(str), categories=ip[c].cat.categories)
    models = []
    for k, (tr_i, _) in enumerate(GroupKFold(5).split(ip, groups=ip["game_pk"])):
        m = lgb.LGBMRegressor(n_estimators=400, learning_rate=0.08, num_leaves=63, min_child_samples=200, subsample=0.8,
                              subsample_freq=1, colsample_bytree=0.8, n_jobs=8, random_state=k, verbose=-1)
        m.fit(ip.iloc[tr_i][bh_feats], ip.iloc[tr_i]["bearing"])
        models.append(m)
        print(f"direction model {k + 1}/5 {time.time() - t0:.0f}s", flush=True)
    df["bearing_hat"] = np.mean([m.predict(df[bh_feats]) for m in models], axis=0)
    del ip

    # physics distance, as in bakeoff_data.py
    cfg = json.load(open(g(a.params)))
    p, sign = np.array(cfg["params"]), cfg["sign"]
    teach = college_teacher(g(a.college), sign)
    can = ((df.launch_speed >= 70) & df.launch_angle.between(8, 55) & df.release_speed.notna()).to_numpy()
    idx = np.flatnonzero(can)
    df["phys_dist"], df["phys_hang"] = np.nan, np.nan
    rho_fill = float(df.air_density.median())
    for s in range(0, len(idx), 100_000):
        ii = idx[s:s + 100_000]
        sub = df.iloc[ii]
        mx = pd.DataFrame({"ExitSpeed": sub.launch_speed.to_numpy(), "Angle": sub.launch_angle.to_numpy(), "RelSpeed": sub.release_speed.to_numpy(),
                           "side_r": sub.stand_r.to_numpy(),
                           "grp": pd.Categorical(sub.pitch_type.astype(str).map(GROUP).fillna("other").astype(str), dtype=GRP_DTYPE)})
        spin = {k: teach[k].predict(mx) for k in teach}
        d, h, _ = simulate(p, v0=mx.ExitSpeed.to_numpy() * MPH, theta=np.deg2rad(mx.Angle.to_numpy()), phi=np.zeros(len(ii)),
                           w_back=spin["w_back"], w_side=spin["w_side"], z0=np.full(len(ii), 1.0), dt=0.02, rho=sub.air_density.fillna(rho_fill).to_numpy())
        df.iloc[ii, df.columns.get_loc("phys_dist")] = d / FT
        df.iloc[ii, df.columns.get_loc("phys_hang")] = h
        print(f"physics {s + len(ii):,}/{len(idx):,} {time.time() - t0:.0f}s", flush=True)
    df["park_lf"], df["park_cf"], df["park_rf"] = df.dim_left_line, df.dim_center, df.dim_right_line
    df["fence_hat"] = fence_at(df, df.bearing_hat.to_numpy())
    df["margin_hat"] = df.phys_dist - df.fence_hat
    df["bearing"] = np.nan
    df["y"] = np.nan
    df["split"] = np.where(df.game_date < VAL_START, "train", np.where(df.game_date < TEST_START, "val", "test"))
    keep = (set(BASE0 + WX + PITCH + HIST + BAT + v2) | {"phys_dist", "phys_hang", "fence_hat", "margin_hat", "park_lf", "park_cf", "park_rf"}
            | {"split", "game_pk", "game_date", "y", "hit_distance_sc", "bearing", "bearing_hat", "game_year", "venue_id", "vaa", "haa"} | set(DIMS))
    out = df[[c for c in df.columns if c in keep]].copy()
    for c in out.select_dtypes("float64").columns:
        out[c] = out[c].astype("float32")
    out.to_parquet(g(a.out))
    print("wrote", a.out, len(out), "rows", len(out.columns), "columns", out.split.value_counts().to_dict(), f"{time.time() - t0:.0f}s", flush=True)
    print("projected distance present", float(out.hit_distance_sc.notna().mean()), "| bearing_hat mean", float(out.bearing_hat.mean()),
          "| phys_dist present", float(out.phys_dist.notna().mean()), flush=True)


if __name__ == "__main__":
    main()
