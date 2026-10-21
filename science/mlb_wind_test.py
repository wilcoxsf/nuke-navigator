"""Does the park-reported wind (MLB StatsAPI schedule) explain the Oracle Park distance miss?

Same miss definition as asos_wind_test.py (Statcast projected distance minus calm-air physics), regressed on the reported along-field
and across-field wind components, next to the airport and grid sources for the same balls.

Usage: python mlb_wind_test.py <balls.parquet> <sf_game_wind.parquet> <out.md>
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd

from flight_fit import FT, MPH, RPM, simulate

SF = 2395


def main() -> None:
    balls, wind, out = sys.argv[1:4]
    b = pd.read_parquet(balls)
    b = b[b.venue_id == SF].copy()
    w = pd.read_parquet(wind)[["game_pk", "wind_text", "pw_speed_ms", "pw_along", "pw_cross"]]
    b = b.merge(w, on="game_pk", how="left")
    res = (b.hit_distance_sc - b.phys_calm)
    ok = b.pw_along.notna()

    n = 2
    base = dict(v0=np.full(n, 100 * MPH), theta=np.deg2rad(np.full(n, 28.0)), phi=np.zeros(n), w_back=np.full(n, 2600 * RPM),
                w_side=np.zeros(n), z0=np.full(n, 1.0))
    p = np.array(json.load(open("flight_fit_results_params.json"))["params"])
    d0, _, _ = simulate(p, **base)
    d1, _, _ = simulate(p, **base, wind=np.array([[0.0, 1.0], [0.0, 1.0]]))
    phys = float((d1[0] - d0[0]) / FT)

    L = ["# Park-reported wind versus the distance miss, Oracle Park", "",
         f"{len(b):,} fly balls from Oracle Park home games; {int(ok.sum()):,} in games with a parseable reported wind direction. "
         f"Physics: one m/s of tailwind adds {phys:.1f} ft.", "",
         "| Wind source | Balls | Corr (along) | Slope (ft per m/s) | Effective scale | Corr (cross) |", "|---|---|---|---|---|---|"]

    def row(name, along, cross, mask):
        a, c, r = along[mask], cross[mask], res[mask]
        s = np.polyfit(a, r, 1)[0]
        L.append(f"| {name} | {int(mask.sum()):,} | {np.corrcoef(a, r)[0, 1]:+.3f} | {s:+.2f} | {s / phys:.2f} | {np.corrcoef(c, r)[0, 1]:+.3f} |")

    row("Park-reported (StatsAPI)", b.pw_along, b.pw_cross, ok)
    row("Open-Meteo grid, same balls", b.wind_along, b.wind_cross, ok)
    L += ["", "Mean miss by reported wind direction (MLB minus calm physics, ft):", "", "| Reported wind | Balls | Mean speed (mph) | Mean miss |", "|---|---|---|---|"]
    b["where"] = b.wind_text.fillna("missing").str.replace(r"^\d+ mph, ", "", regex=True)
    b["mph"] = b.pw_speed_ms / MPH
    for k, g in b.assign(res=res).groupby("where"):
        if len(g) >= 40:
            L.append(f"| {k} | {len(g):,} | {g.mph.mean():.1f} | {g.res.mean():+.1f} |")
    out_lines = L
    # strength bands for the dominant direction
    cf = b[(b["where"] == "Out To CF")].assign(res=res)
    L += ["", "Out To CF games by reported speed:", ""]
    for lo, hi in [(0, 6), (6, 10), (10, 15), (15, 40)]:
        g = cf[(cf.mph >= lo) & (cf.mph < hi)]
        if len(g) > 40:
            L.append(f"- {lo}-{hi} mph ({len(g):,} balls): mean miss {g.res.mean():+.1f} ft")
    Path(out).write_text("\n".join(out_lines) + "\n", encoding="utf-8")
    print("\n".join(out_lines))


if __name__ == "__main__":
    main()
