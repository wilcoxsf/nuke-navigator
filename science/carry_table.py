"""Product idea 1: a learned carry correction table for the what-if sandbox. The sandbox flies a ball with the spin prior and calm air; real balls carry a bit differently by exit speed and launch angle
(carry = the air-density multiplier that reproduces Statcast's projected distance). A smoothed table of the mean log carry by exit speed and launch angle, plus the spread of log carry in each cell, gives the
sandbox an unbiased default and an honest band.
Validation: fit on balls before 2025-03-18 (carry_dataset.parquet), test on later balls. Distance error of the sandbox physics against the observed projected distance with (a) carry 1, (b) the table's mean carry,
and coverage of the table's 80% band (mean +- 1.2816 sd, cell sd smoothed). Then refit on all balls and write apps/web/public/carry_table.json (git-ignored derived data).
E14 (weather_response.py) found the physics over-credits heat and thin air a little, so the table also carries two linear weather corrections (per degree F and per 1000 ft of elevation), fitted
on the training balls with contact controls and removed from log carry before the table is smoothed.
Output: science/carry_table.md. Takes a minute."""
import json

import numpy as np
import pandas as pd

from flight_fit import FT, MPH, RPM
from savant_xhr_compare import ROOT, fly_path

out = []


def say(s=""):
    print(s, flush=True)
    out.append(s)


df = pd.read_parquet(ROOT + "data/derived/carry_dataset.parquet")
df["game_date"] = df.game_date.astype(str)
TREF = 75.0  # heat correction applies above this temperature
EV0, EV1, DE = 70.0, 120.0, 2.5
LA0, LA1, DL = 8.0, 55.0, 2.5
ne, nl = int(round((EV1 - EV0) / DE)) + 1, int(round((LA1 - LA0) / DL)) + 1
ev_nodes, la_nodes = EV0 + DE * np.arange(ne), LA0 + DL * np.arange(nl)


def weather_slopes(d):
    """OLS of log carry on contact controls plus temperature (per F) and elevation (per 1000 ft); returns (temp slope, elevation slope, reference temperature)."""
    d = d[d.om_temp_f.notna() & d.elevation_ft.notna() & d.attack_angle.notna()]
    la, ev = d.launch_angle.to_numpy(float), d.launch_speed.to_numpy(float)
    X = np.column_stack([np.ones(len(d)), ev, la, ev ** 2, la ** 2, ev * la, np.where(d.stand_r == 1, 1.0, -1.0), d.bearing.to_numpy(float) ** 2, (d.launch_angle - d.attack_angle).to_numpy(float),
                         np.maximum(d.om_temp_f.to_numpy(float) - TREF, 0), d.elevation_ft.to_numpy(float) / 1000])  # heat only: a linear term over-corrected cold games
    ok = np.isfinite(X).all(axis=1) & np.isfinite(d.logm.to_numpy(float))
    coef, *_ = np.linalg.lstsq(X[ok], d.logm.to_numpy(float)[ok], rcond=None)
    return float(coef[-2]), float(coef[-1]), TREF


def adjust(d, bt, be, tref):
    """log carry at the reference weather (temperature tref, sea level)."""
    return d.logm - bt * np.maximum(d.om_temp_f.fillna(tref) - tref, 0) - be * d.elevation_ft.fillna(0) / 1000


def fit_table(d):
    """Gaussian-kernel smoother over (ev, la) grid nodes: mean and sd of log carry, with a minimum effective count."""
    ev, la, y = d.launch_speed.to_numpy(float), d.launch_angle.to_numpy(float), d.logm.to_numpy(float)
    mean = np.full((ne, nl), np.nan)
    sd = np.full((ne, nl), np.nan)
    for i, e in enumerate(ev_nodes):
        for j, l in enumerate(la_nodes):
            w = np.exp(-0.5 * (((ev - e) / 3.5) ** 2 + ((la - l) / 3.5) ** 2))
            sw = w.sum()
            if sw < 8:
                continue
            m = (w * y).sum() / sw
            mean[i, j] = m
            sd[i, j] = np.sqrt((w * (y - m) ** 2).sum() / sw)
    # fill empty cells from the nearest filled one so the lookup never returns nan
    from scipy.ndimage import distance_transform_edt
    for arr in (mean, sd):
        bad = np.isnan(arr)
        if bad.any():
            idx = distance_transform_edt(bad, return_distances=False, return_indices=True)
            arr[bad] = arr[tuple(i[bad] for i in idx)]
    return mean, sd


def lookup(table, ev, la):
    from scipy.interpolate import RegularGridInterpolator
    f = RegularGridInterpolator((ev_nodes, la_nodes), table, bounds_error=False, fill_value=None)
    pts = np.column_stack([np.clip(ev, EV0, EV1), np.clip(la, LA0, LA1)])
    return f(pts)


def flown(d, mult):
    hand = np.where(d.stand_r == 1, 1.0, -1.0)
    la, br = d.launch_angle.to_numpy(float), d.bearing.to_numpy(float)
    base = dict(v0=d.launch_speed.to_numpy(float) * MPH, theta=np.deg2rad(la), phi=np.deg2rad(br), w_back=np.maximum(0, -763 + 120 * la) * RPM, w_side=(-hand * 864 - 75 * br) * RPM)
    rho = d.air_density.to_numpy(float)
    res = np.zeros(len(d))
    for s in range(0, len(d), 4000):
        sl = slice(s, s + 4000)
        R, _ = fly_path(rho=rho[sl] * mult[sl], **{k: v[sl] for k, v in base.items()})
        res[sl] = R[:, -1] / FT
    return res


tr, te = df[df.game_date < "2025-03-18"].copy(), df[df.game_date >= "2025-03-18"].reset_index(drop=True)
bt, be, tref = weather_slopes(tr)
tr["logm"] = adjust(tr, bt, be, tref)
mean, sd = fit_table(tr)
say("# Learned carry correction table (22 Oct 2026): fit on %d balls before 2025-03-18, tested on %d later balls" % (len(tr), len(te)))
target = te.hit_distance_sc.to_numpy(float)
mu = lookup(mean, te.launch_speed.to_numpy(float), te.launch_angle.to_numpy(float))
sg = lookup(sd, te.launch_speed.to_numpy(float), te.launch_angle.to_numpy(float))
d1 = flown(te, np.ones(len(te)))
wadj = bt * np.maximum(te.om_temp_f.fillna(tref) - tref, 0).to_numpy() + be * te.elevation_ft.fillna(0).to_numpy() / 1000
d2 = flown(te, np.exp(mu))
d3 = flown(te, np.exp(mu + wadj))
say("weather corrections fitted before 2025-03-18: temperature %+.5f log carry per F (reference %.0f F), elevation %+.4f per 1000 ft" % (bt, tref, be))
say("\n## Distance error of the sandbox physics against Statcast projected distance (test balls)")
for lab, d in (("carry 1 (before 22 Oct)", d1), ("table mean carry", d2), ("table + weather terms", d3)):
    e = d - target
    say("  %-20s mean error %+6.1f ft   MAE %5.1f ft   RMSE %5.1f ft" % (lab, e.mean(), np.abs(e).mean(), np.sqrt((e ** 2).mean())))
hr = te.y.to_numpy() == 1
say("  home runs only (%d): carry 1 mean error %+.1f ft, table %+.1f ft, table + weather %+.1f ft" % (hr.sum(), (d1 - target)[hr].mean(), (d2 - target)[hr].mean(), (d3 - target)[hr].mean()))
for lab, m in (("Colorado (home park COL)", te.home_team == "COL"), ("hot games (85 F and up)", te.om_temp_f >= 85), ("cold games (below 55 F)", te.om_temp_f < 55)):
    m = m.to_numpy()
    say("  %-28s n %5d  mean error carry 1 %+.1f, table %+.1f, table + weather %+.1f ft;  MAE %.1f -> %.1f -> %.1f" % (lab, m.sum(), (d1 - target)[m].mean(), (d2 - target)[m].mean(), (d3 - target)[m].mean(), np.abs(d1 - target)[m].mean(), np.abs(d2 - target)[m].mean(), np.abs(d3 - target)[m].mean()))
y = te.logm.to_numpy(float) - wadj  # log carry at the reference weather
for q, z in ((0.8, 1.2816), (0.5, 0.6745)):
    cov = np.mean(np.abs(y - mu) <= z * sg)
    say("  band mean +- %.3f sd (nominal %d%%): covers %.1f%% of real balls" % (z, int(q * 100), 100 * cov))
for lab, m in (("exit speed 100 to 110 mph, 20 to 35 degrees", te.launch_speed.between(100, 110) & te.launch_angle.between(20, 35)), ("105 mph and up", te.launch_speed >= 105), ("below 90 mph", te.launch_speed < 90)):
    m = m.to_numpy()
    say("  %-46s n %5d  MAE carry 1 %.1f -> table %.1f ft; 80%% band covers %.1f%%" % (lab, m.sum(), np.abs(d1 - target)[m].mean(), np.abs(d2 - target)[m].mean(), 100 * np.mean(np.abs(y - mu)[m] <= 1.2816 * sg[m])))
# empirical quantiles of the standardized residual on the held-out balls: the band draws use these, not a normal curve
zres = (y - mu) / sg
ZQ = np.linspace(0.02, 0.98, 25)
zq = np.quantile(zres, ZQ)
say('  standardized residual quantiles (2%, 10%, 25%, 50%, 75%, 90%, 98%): ' + ', '.join('%.2f' % np.quantile(zres, q) for q in (0.02, 0.1, 0.25, 0.5, 0.75, 0.9, 0.98)))
say('  empirical 80%% band (10th to 90th percentile of the standardized residual) covers %.1f%% of held-out balls (by construction about 80%%)' % (100 * np.mean((zres >= np.quantile(zres, 0.1)) & (zres <= np.quantile(zres, 0.9)))))
# final table on all balls
bt_a, be_a, tref_a = weather_slopes(df)
df = df.copy()
df["logm"] = adjust(df, bt_a, be_a, tref_a)
mean_a, sd_a = fit_table(df)
json.dump({"ev0": EV0, "ev1": EV1, "de": DE, "la0": LA0, "la1": LA1, "dl": DL, "mean": np.round(mean_a, 4).tolist(), "sd": np.round(sd_a, 4).tolist(),
           "temp_slope": round(bt_a, 6), "temp_ref": round(tref_a, 2), "elev_slope": round(be_a, 5), "z": np.round(zq, 4).tolist(), "zp": np.round(ZQ, 3).tolist(), "note": "z = empirical quantiles of the standardized residual (y - mean) / sd on held-out 2025-26 balls at probabilities zp; mean and sd of log carry (air-density multiplier that reproduces Statcast projected distance) by exit speed (rows) and launch angle (columns); fit on 40,000 balls 2023-07 to 2026-09 with the 22 Oct sidespin prior"},
          open(ROOT + "apps/web/public/carry_table.json", "w"))
say("final weather terms (all balls): temperature %+.5f per F around %.0f F, elevation %+.4f per 1000 ft" % (bt_a, tref_a, be_a))
say("\nwrote apps/web/public/carry_table.json (%d x %d cells, mean log carry range %.3f to %.3f, sd range %.3f to %.3f)" % (ne, nl, mean_a.min(), mean_a.max(), sd_a.min(), sd_a.max()))
open(ROOT + "science/carry_table.md", "w", encoding="utf-8").write("\n".join(out) + "\n")
