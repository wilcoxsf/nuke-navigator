"""Paired comparison of home-run Brier between two prediction files on the test period, with a game-grouped bootstrap.

Usage: python paired.py --data data/derived/bakeoff_features_v5r.parquet --a <pred_a.parquet> --b <pred_b.parquet> [--label-a base --label-b new]
Reports Brier for each, the difference (b minus a; negative means b is better) with a 95% interval over games, near-wall and Oracle-Park differences.
"""
from __future__ import annotations

import argparse

import numpy as np
import pandas as pd


def main() -> None:
    ap = argparse.ArgumentParser()
    for k in ("data", "a", "b"):
        ap.add_argument(f"--{k}", required=True)
    ap.add_argument("--label-a", default="A")
    ap.add_argument("--label-b", default="B")
    ap.add_argument("--boot", type=int, default=1000)
    a = ap.parse_args()
    df = pd.read_parquet(a.data, columns=["rid", "split", "y", "hit_distance_sc", "home_team", "game_pk"])
    te = df[df.split == "test"].set_index("rid")
    pa = pd.read_parquet(a.a).set_index("rid").p_hr.reindex(te.index).to_numpy()
    pb = pd.read_parquet(a.b).set_index("rid").p_hr.reindex(te.index).to_numpy()
    y = te.y.to_numpy()
    sa, sb = (pa - y) ** 2, (pb - y) ** 2
    near = te.hit_distance_sc.between(330, 430).to_numpy()
    sf = (te.home_team.astype(str) == "SF").to_numpy()
    games, gi = np.unique(te.game_pk.to_numpy(), return_inverse=True)
    boots = np.random.default_rng(0).multinomial(len(games), np.ones(len(games)) / len(games), size=a.boot).astype(float)
    n = np.bincount(gi, minlength=len(games)).astype(float)

    def diff(mask=None):
        d = (sb - sa) if mask is None else np.where(mask, sb - sa, 0.0)
        nn = n if mask is None else np.bincount(gi, weights=mask.astype(float), minlength=len(games))
        s = np.bincount(gi, weights=d, minlength=len(games))
        bd = (boots @ s) / np.maximum(boots @ nn, 1)
        return d.sum() / max(nn.sum(), 1), np.percentile(bd, 2.5), np.percentile(bd, 97.5)
    print(f"{a.label_a}: Brier {sa.mean():.5f}   {a.label_b}: Brier {sb.mean():.5f}   ({len(te):,} test balls, {len(games):,} games)")
    for name, m in (("all balls", None), ("near the wall (330-430 ft)", near), ("Oracle Park", sf)):
        d, lo, hi = diff(m)
        print(f"  {name}: {a.label_b} minus {a.label_a} = {d:+.5f}  (95% CI {lo:+.5f}, {hi:+.5f})")


if __name__ == "__main__":
    main()
