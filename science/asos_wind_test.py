"""Does airport station wind explain the Oracle Park distance miss better than Open-Meteo grid wind?

Uses the balls file written by flight_transfer.py (physics-with-calm-air distance versus Statcast projected distance) for Oracle Park
home games, adds each game's mean SFO and OAK wind over the first three hours, rotated into the field frame, and regresses the miss on
the along-field component. The expected slope from physics (feet per m/s of tailwind for a typical fly ball) turns the regression
slope into an effective wind scale: 1.0 means the station wind acts on the ball at full strength.

Usage: python asos_wind_test.py <balls.parquet> <games.parquet> <venues.parquet> <asos_dir> <out.md>
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import duckdb
import numpy as np
import pandas as pd

from flight_fit import FT, MPH, RPM, simulate

SF = 2395
KT = 0.514444


def station_wind(csv: Path) -> pd.DataFrame:
    d = pd.read_csv(csv, na_values=["M"])
    d["t"] = pd.to_datetime(d["valid"], utc=True)
    d = d.dropna(subset=["sknt", "drct"])
    d = d[d.sknt > 0]
    toward = np.deg2rad(d.drct + 180)
    d["e"], d["n"] = d.sknt * KT * np.sin(toward), d.sknt * KT * np.cos(toward)  # m/s toward east / north
    return d[["t", "e", "n"]].sort_values("t")


def window_mean(obs: pd.DataFrame, start: pd.Timestamp, hours: float = 3.0):
    w = obs[(obs.t >= start) & (obs.t < start + pd.Timedelta(hours=hours))]
    return (w.e.mean(), w.n.mean(), len(w)) if len(w) else (np.nan, np.nan, 0)


def slope_report(name, res, along, cross):
    ok = np.isfinite(along) & np.isfinite(res) & np.isfinite(cross)
    c = np.corrcoef(along[ok], res[ok])[0, 1]
    s = np.polyfit(along[ok], res[ok], 1)[0]
    ccross = np.corrcoef(cross[ok], res[ok])[0, 1]
    return f"| {name} | {ok.sum():,} | {c:+.3f} | {s:+.2f} | {ccross:+.3f} |", s


def main() -> None:
    balls, games, venues, asos, out = sys.argv[1:6]
    b = pd.read_parquet(balls)
    b = b[b.venue_id == SF].copy()
    g = duckdb.sql(f"SELECT DISTINCT ON (game_pk) game_pk, start_utc FROM read_parquet('{games.replace(chr(92), '/')}') ORDER BY game_pk, official_date DESC").df()
    az = float(duckdb.sql(f"SELECT azimuth_deg FROM read_parquet('{venues.replace(chr(92), '/')}') WHERE venue_id = {SF}").df().azimuth_deg[0])
    obs = {st: station_wind(Path(asos) / f"{st}_2015_2026.csv") for st in ("SFO", "OAK")}
    per_game = g[g.game_pk.isin(b.game_pk.unique())].copy()
    per_game["start"] = pd.to_datetime(per_game.start_utc, utc=True)
    rows = []
    for _, r in per_game.iterrows():
        rec = {"game_pk": r.game_pk}
        for st, o in obs.items():
            e, n, k = window_mean(o, r.start)
            rec[f"{st}_e"], rec[f"{st}_n"], rec[f"{st}_k"] = e, n, k
        rows.append(rec)
    b = b.merge(pd.DataFrame(rows), on="game_pk", how="left")
    az_r = np.deg2rad(az)
    # field frame: along = toward center field (compass azimuth), cross = toward right field (clockwise from it)
    for st in ("SFO", "OAK"):
        b[f"{st}_along"] = b[f"{st}_e"] * np.sin(az_r) + b[f"{st}_n"] * np.cos(az_r)
        b[f"{st}_cross"] = b[f"{st}_e"] * np.cos(az_r) - b[f"{st}_n"] * np.sin(az_r)
    b["both_along"] = (b.SFO_along + b.OAK_along) / 2
    b["both_cross"] = (b.SFO_cross + b.OAK_cross) / 2
    res = (b.hit_distance_sc - b.phys_calm).to_numpy()

    # what physics says one m/s of tailwind does to a typical fly ball (100 mph, 28 degrees, 2,600 rpm backspin)
    n = 2
    base = dict(v0=np.full(n, 100 * MPH), theta=np.deg2rad(np.full(n, 28.0)), phi=np.zeros(n), w_back=np.full(n, 2600 * RPM),
                w_side=np.zeros(n), z0=np.full(n, 1.0))
    p = np.array(json.load(open("flight_fit_results_params.json"))["params"])
    d0, _, _ = simulate(p, **base)
    d1, _, _ = simulate(p, **base, wind=np.array([[0.0, 1.0], [0.0, 1.0]]))
    phys_slope = float((d1[0] - d0[0]) / FT)

    tbl = ["| Wind source | Balls | Corr (along) | Slope (ft per m/s) | Corr (cross) |", "|---|---|---|---|---|"]
    slopes = {}
    for name, a, c in [("Open-Meteo grid, 10 m", b.wind_along.to_numpy(), b.wind_cross.to_numpy()),
                       ("SFO airport", b.SFO_along.to_numpy(), b.SFO_cross.to_numpy()),
                       ("OAK airport", b.OAK_along.to_numpy(), b.OAK_cross.to_numpy()),
                       ("SFO and OAK average", b.both_along.to_numpy(), b.both_cross.to_numpy())]:
        line, s = slope_report(name, res, a, c)
        tbl.append(line)
        slopes[name] = s
    L = ["# Airport wind versus grid wind, Oracle Park home games", "",
         f"{len(b):,} MLB fly balls at Oracle Park (balls file from flight_transfer.py). Miss = Statcast projected distance minus calm-air physics distance. "
         f"Field azimuth used: {az:.0f} degrees. Station wind is the mean over the first three hours after first pitch; games with no observations in the window drop out.", "",
         f"Physics: one m/s of tailwind adds {phys_slope:.1f} ft to a 100 mph, 28 degree fly ball.", ""] + tbl
    L += ["", "Effective wind scale (regression slope divided by the physics slope): " +
          "; ".join(f"{k} {v / phys_slope:.2f}" for k, v in slopes.items())]
    # frame check: regress the miss on east and north wind (SFO and OAK average). If the park azimuth is right, the best-fit
    # direction of "wind that adds distance" points along the field azimuth.
    e = (b.SFO_e + b.OAK_e) / 2
    nn = (b.SFO_n + b.OAK_n) / 2
    ok = e.notna() & nn.notna() & np.isfinite(res)
    A = np.column_stack([e[ok], nn[ok], np.ones(ok.sum())])
    coef = np.linalg.lstsq(A, res[ok], rcond=None)[0]
    ang = float(np.degrees(np.arctan2(coef[0], coef[1])) % 360)
    mag = float(np.hypot(coef[0], coef[1]))
    L += ["", f"Frame check: best-fit direction of distance-adding wind {ang:.0f} degrees (compass), {mag:.2f} ft per m/s; the park azimuth used is {az:.0f}.",
          "By wind strength (SFO and OAK average speed): "]
    spd = np.hypot(e, nn)
    for lo, hi in [(0, 3), (3, 6), (6, 9), (9, 99)]:
        m = ok & (spd >= lo) & (spd < hi)
        if m.sum() > 50:
            L.append(f"- {lo}-{hi} m/s ({int(m.sum()):,} balls): slope on along-field wind {np.polyfit(b.both_along[m], res[m], 1)[0]:+.2f} ft per m/s")
    Path(out).write_text("\n".join(L) + "\n", encoding="utf-8")
    print("\n".join(L))


if __name__ == "__main__":
    main()
