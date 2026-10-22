"""Second pass of the Savant check, after savant_xhr_diag.py showed that real home runs carry about 13 ft farther than the spin-prior physics predicts (the balls that get
wind, spin or warmth help). Each 2025 ball is first matched to its observed Statcast projected distance with one per-ball lift multiplier (bisection), then flown through
each park's fence with that park's air (the ball's own temperature and humidity at the park's pressure; six pressure classes), as Savant's per-park counts presumably do.
Balls without a projected distance keep the prior (multiplier 1). Runs at below-normal priority.
"""
import json

import numpy as np
import pandas as pd
from scipy.stats import spearmanr

from flight_fit import FT, MPH, RPM
from savant_xhr_compare import ROOT, SAV, clears, fly_path


def main():
    df = pd.read_parquet(ROOT + "data/derived/exp_features.parquet",
                         columns=["game_date", "game_year", "type", "batter", "launch_speed", "launch_angle", "bearing", "air_density", "om_pressure_hpa", "stand_r", "y", "hit_distance_sc"])
    df = df[(df.game_year == 2025) & (df.game_date <= "2025-09-28") & (df.type == "X") & (df.launch_speed >= 80) & df.launch_angle.between(12, 55)
            & df.bearing.between(-45, 45) & df.air_density.notna()].reset_index(drop=True)
    df["p_ball"] = df.om_pressure_hpa.fillna(1005.0)
    print("balls in play:", len(df), "| with projected distance:", int(df.hit_distance_sc.notna().sum()), flush=True)
    cand = df.hit_distance_sc.ge(290) | (df.hit_distance_sc.isna() & (df.launch_speed >= 90))
    d = df[cand].reset_index(drop=True)
    print("candidate balls that could clear any fence:", len(d), "| actual HRs among them:", int(d.y.sum()), "of", int(df.y.sum()), flush=True)

    hand = np.where(d.stand_r == 1, 1.0, -1.0)
    la, br = d.launch_angle.to_numpy(), d.bearing.to_numpy()
    base = dict(v0=d.launch_speed.to_numpy() * MPH, theta=np.deg2rad(la), phi=np.deg2rad(br),
                w_back=np.maximum(0, -763 + 120 * la) * RPM, w_side=(-hand * 849 - 94 * br) * RPM)
    rho0 = d.air_density.to_numpy()
    target = d.hit_distance_sc.to_numpy()
    has = ~np.isnan(target)
    CH = 4000
    # 1. per-ball effective air-density multiplier m (less drag and lift for extra carry: wind, warmth, spin the prior cannot see) so the simulated distance equals
    #    the observed one; monotone in m, bisection
    lo, hi = np.full(len(d), 0.2), np.full(len(d), 1.8)
    for it in range(10):
        mid = 0.5 * (lo + hi)
        dist = np.zeros(len(d))
        for s in range(0, len(d), CH):
            sl = slice(s, s + CH)
            R, _ = fly_path(rho=rho0[sl] * mid[sl], **{k: v[sl] for k, v in base.items()})
            dist[sl] = R[:, -1] / FT
        too_far = dist > np.nan_to_num(target, nan=1e9)  # flew farther than observed: needs thicker air
        lo = np.where(too_far, mid, lo)
        hi = np.where(too_far, hi, mid)
        print("  calibration pass", it + 1, flush=True)
    m = np.where(has, 0.5 * (lo + hi), 1.0)
    chk = np.zeros(len(d))
    for s in range(0, len(d), CH):
        sl = slice(s, s + CH)
        R, _ = fly_path(rho=rho0[sl] * m[sl], **{k: v[sl] for k, v in base.items()})
        chk[sl] = R[:, -1] / FT
    ok = has & (np.abs(chk - target) < 3)
    print("matched to within 3 ft:", round(float(ok[has].mean()), 3), "| density multiplier median %.2f, 5-95%%: %.2f to %.2f" % (np.median(m[has]), *np.percentile(m[has], [5, 95])), flush=True)
    m = np.where(ok | ~has, m, 1.0)  # balls that did not converge keep the prior

    # 2. every park, grouped into six pressure classes
    parks = json.load(open(ROOT + "apps/web/public/parks30.json"))
    B = np.array(parks["bearings"])
    alias = {"az": "ari", "ath": "oak", "cha": "cws", "was": "wsh"}
    pk = [(p, alias.get(p["abbr"].lower(), p["abbr"].lower())) for p in parks["parks"]]
    pk = [(p, c) for p, c in pk if c in SAV]
    hp = np.array([p["hpa"] for p, _ in pk])
    cls = np.digitize(hp, [900, 982, 994, 1002, 1009])
    out = {c: np.zeros(len(d), bool) for _, c in pk}
    pball = d.p_ball.to_numpy()
    for ci in np.unique(cls):
        members = [pk[i] for i in range(len(pk)) if cls[i] == ci]
        hcls = float(np.mean([p["hpa"] for p, _ in members]))
        for s in range(0, len(d), CH):
            sl = slice(s, s + CH)
            R, Z = fly_path(rho=rho0[sl] * m[sl] * hcls / pball[sl], **{k: v[sl] for k, v in base.items()})
            for p, c in members:
                out[c][sl] = clears(R, Z, np.interp(br[sl], B, p["dist"]) * FT, np.interp(br[sl], B, p["height"]) * FT)
        print("  pressure class", ci, "hPa %.0f" % hcls, "parks:", [c for _, c in members], flush=True)

    g = pd.DataFrame({"batter": d.batter, "y": d.y.astype(int)})
    for c, v in out.items():
        g[c] = v.astype(int)
    ours = g.groupby("batter").sum()
    sv = pd.read_csv(ROOT + "scratch/savant_xhr_2025_batters.csv")
    sv["name"] = sv.player.astype(str).str.replace(r"<[^>]+>", "", regex=True)
    sv = sv.set_index("player_id")
    j = sv[["name", "hr_total"] + SAV].join(ours, how="inner", lsuffix="_sv", rsuffix="_ours")
    print("\nbatters matched:", len(j), "| actual HRs: Savant %d, ours (candidates) %d" % (j.hr_total.sum(), j.y.sum()))
    rows = []
    for c in out:
        s_, o_ = j[c + "_sv"].astype(float), j[c + "_ours"].astype(float)
        rows.append(dict(park=c, savant_total=int(s_.sum()), ours_total=int(o_.sum()), ratio=round(o_.sum() / s_.sum(), 3), bias_per_batter=round(float((o_ - s_).mean()), 2),
                         player_corr=round(float(np.corrcoef(s_, o_)[0, 1]), 3), mean_abs_err=round(float((s_ - o_).abs().mean()), 2)))
    r = pd.DataFrame(rows).sort_values("ratio")
    print(r.to_string(index=False))
    print("\nSpearman rank correlation of the 30 park totals (Savant vs ours): %.3f" % spearmanr(r.savant_total, r.ours_total)[0])
    print("overall: Savant %d vs ours %d would-be HRs summed over all parks (ratio %.3f)" % (r.savant_total.sum(), r.ours_total.sum(), r.ours_total.sum() / r.savant_total.sum()))
    # each batter's park profile relative to his own mean across parks: does the SHAPE agree?
    cols_sv = [c + "_sv" for c in out]
    cols_us = [c + "_ours" for c in out]
    big = j[j.hr_total >= 25]
    sh_sv = big[cols_sv].sub(big[cols_sv].mean(axis=1), axis=0).to_numpy()
    sh_us = big[cols_us].sub(big[cols_us].mean(axis=1), axis=0).to_numpy()
    print("batters with 25+ HR: %d | correlation of park-to-park shape (each batter centered on own mean): %.3f" % (len(big), np.corrcoef(sh_sv.ravel(), sh_us.ravel())[0, 1]))
    top = j.sort_values("hr_total", ascending=False).head(8)
    print("\nTop HR hitters, columns SF and COL (Savant / ours):")
    print(top[["name", "hr_total", "y", "sf_sv", "sf_ours", "col_sv", "col_ours", "bos_sv", "bos_ours"]].to_string(index=False))
    r.to_csv(ROOT + "data/derived/savant_xhr_compare2_parks.csv", index=False)
    j.to_csv(ROOT + "data/derived/savant_xhr_compare2_players.csv")


if __name__ == "__main__":
    main()
