"""Validate the Goner Grid engine against MLB's own per-player, per-park 'would be a home run' counts (Savant home-run leaderboard, 2025 batters, one page pulled
earlier into scratch/savant_xhr_2025_batters.csv).

Every 2025 regular-season ball in play (exit speed 80+, launch angle 12-55) is flown once with the page's physics (same drag/lift constants, wood-bat spin prior,
the game's real air density, no wind), recording the whole path. Each of the 30 parks then reads the height of the path where it crosses that park's fence distance
at the ball's bearing (parks30.json, 2026 fences) and compares it with the wall height: the same rule as the Goner Grid. Counts are summed per batter and compared
with the Savant columns. Runs at below-normal priority; about 25k balls, a minute or two.
"""
import ctypes
import json

import numpy as np
import pandas as pd

from flight_fit import FT, MPH, RPM, G, MASS, RAD, AREA

ctypes.windll.kernel32.SetPriorityClass(ctypes.windll.kernel32.GetCurrentProcess(), 0x4000)  # below normal

ROOT = "C:/Users/andrewwi/dev/nuke-navigator-new/"
PARAMS = [0.3728, 0.1492, 1.524, 2.5479]  # what apps/web/src/dojo.js uses (lift scaled 1.45x)
DT, TMAX = 0.02, 9.0
SAV = "laa bal bos cws cle kc oak tb tex tor ari chc col lad pit mil sea hou det sf cin sd phi stl nym wsh min nyy mia atl".split()


def fly_path(v0, theta, phi, w_back, w_side, rho, z0=1.0, kl=None, return_xy=False, kd=None):
    """RK4 like flight_fit.simulate, but keeps the path: returns horizontal range R[n, T] and height Z[n, T] in metres (frozen after landing).
    kl is an optional per-ball multiplier on the lift coefficient (used to match a ball's observed distance)."""
    c0, c1, a, b = PARAMS
    kl = np.ones(len(v0)) if kl is None else kl
    kd = np.ones(len(v0)) if kd is None else kd
    n = len(v0)
    q = 0.5 * rho * AREA / MASS
    h = np.stack([np.sin(phi), np.cos(phi), np.zeros(n)], 1)
    r = np.stack([np.cos(phi), -np.sin(phi), np.zeros(n)], 1)
    ez = np.array([0.0, 0.0, 1.0])
    omega = w_back[:, None] * r + w_side[:, None] * ez
    wmag = np.linalg.norm(omega, axis=1)
    vel = v0[:, None] * (np.cos(theta)[:, None] * h + np.sin(theta)[:, None] * ez)
    pos = np.stack([np.zeros(n), np.zeros(n), np.full(n, z0)], 1)
    alive = np.ones(n, bool)
    T = int(TMAX / DT)
    R = np.zeros((n, T), np.float32)
    Z = np.zeros((n, T), np.float32)

    def acc(vv):
        sp = np.linalg.norm(vv, axis=1) + 1e-9
        S = RAD * wmag / sp
        cd = kd * (c0 + c1 * S)
        cl = kl * a * S / (1 + b * S)
        drag = -q[:, None] * cd[:, None] * sp[:, None] * vv
        lift = q[:, None] * cl[:, None] * sp[:, None] * np.cross(omega, vv) / (wmag[:, None] + 1e-9)
        return drag + lift + np.array([0.0, 0.0, -G])

    for k in range(T):
        R[:, k] = np.hypot(pos[:, 0], pos[:, 1])
        Z[:, k] = pos[:, 2]
        a1 = acc(vel)
        v2 = vel + 0.5 * DT * a1
        a2 = acc(v2)
        v3 = vel + 0.5 * DT * a2
        a3 = acc(v3)
        v4 = vel + DT * a3
        a4 = acc(v4)
        new_pos = pos + DT / 6 * (vel + 2 * v2 + 2 * v3 + v4)
        new_vel = vel + DT / 6 * (a1 + 2 * a2 + 2 * a3 + a4)
        hit = alive & (new_pos[:, 2] < 0) & (k > 2)
        alive &= ~hit
        pos, vel = np.where(alive[:, None], new_pos, pos), np.where(alive[:, None], new_vel, vel)
        if not alive.any():
            R[:, k + 1:] = R[:, [k]]
            Z[:, k + 1:] = Z[:, [k]]
            break
    if return_xy:
        return R, Z, pos[:, 0].copy(), pos[:, 1].copy()  # where each ball came down (x toward right field, y toward center), metres
    return R, Z


def clears(R, Z, fence_m, wall_m):
    """True where the path is above the wall height at the first time its range reaches the fence distance."""
    n = len(R)
    reach = (R >= fence_m[:, None])
    ok = reach.any(axis=1)
    j = reach.argmax(axis=1)
    j0 = np.maximum(j - 1, 0)
    ar = np.arange(n)
    r0, r1, z0, z1 = R[ar, j0], R[ar, j], Z[ar, j0], Z[ar, j]
    f = np.where(r1 > r0, (fence_m - r0) / np.maximum(r1 - r0, 1e-6), 1.0)
    zf = z0 + f * (z1 - z0)
    return ok & (zf > wall_m)


def main():
    df = pd.read_parquet(ROOT + "data/derived/exp_features.parquet",
                         columns=["game_date", "game_year", "type", "batter", "launch_speed", "launch_angle", "bearing", "air_density", "stand_r", "y"])
    df = df[(df.game_year == 2025) & (df.game_date <= "2025-09-28") & (df.type == "X") & (df.launch_speed >= 80) & df.launch_angle.between(12, 55)
            & df.bearing.between(-45, 45) & df.air_density.notna()].reset_index(drop=True)
    print("2025 regular-season balls in play, EV 80+, LA 12-55:", len(df), "| actual HRs among them:", int(df.y.sum()), flush=True)

    parks = json.load(open(ROOT + "apps/web/public/parks30.json"))
    B = np.array(parks["bearings"])
    abbr = [p["abbr"] for p in parks["parks"]]
    print("parks30 abbreviations:", abbr, flush=True)
    alias = {"az": "ari", "ath": "oak", "cha": "cws", "chw": "cws", "was": "wsh", "tbr": "tb", "kcr": "kc", "sdp": "sd", "sfg": "sf", "ny m": "nym"}
    colof = {}
    for p in parks["parks"]:
        a = p["abbr"].lower()
        a = alias.get(a, a)
        if a in SAV:
            colof[p["abbr"]] = a
    print("unmatched parks30 abbreviations:", [p["abbr"] for p in parks["parks"] if p["abbr"] not in colof], "| Savant columns with no park:", [c for c in SAV if c not in colof.values()], flush=True)

    hand = np.where(df.stand_r == 1, 1.0, -1.0)
    la, br = df.launch_angle.to_numpy(), df.bearing.to_numpy()
    wb = np.maximum(0, -763 + 120 * la) * RPM
    ws = (-hand * 849 - 94 * br) * RPM
    out = {c: np.zeros(len(df), bool) for c in colof.values()}
    CH = 4000
    for s in range(0, len(df), CH):
        sl = slice(s, s + CH)
        R, Z = fly_path(df.launch_speed.to_numpy()[sl] * MPH, np.deg2rad(la[sl]), np.deg2rad(br[sl]), wb[sl], ws[sl], df.air_density.to_numpy()[sl])
        for p in parks["parks"]:
            if p["abbr"] not in colof:
                continue
            fence = np.interp(br[sl], B, p["dist"]) * FT
            wall = np.interp(br[sl], B, p["height"]) * FT
            out[colof[p["abbr"]]][sl] = clears(R, Z, fence, wall)
        print("  flown", min(s + CH, len(df)), "of", len(df), flush=True)

    g = pd.DataFrame({"batter": df.batter, "y": df.y.astype(int)})
    for c, v in out.items():
        g[c] = v.astype(int)
    ours = g.groupby("batter").sum()
    sv = pd.read_csv(ROOT + "scratch/savant_xhr_2025_batters.csv")
    sv["name"] = sv.player.astype(str).str.replace(r"<[^>]+>", "", regex=True)
    sv = sv.set_index("player_id")
    j = sv[["name", "hr_total"] + SAV].join(ours, how="inner", lsuffix="_sv", rsuffix="_ours")
    print("batters matched:", len(j), "of", len(sv), flush=True)

    print("\nActual HRs: Savant total %d vs ours %d (ours only counts balls in play with EV 80+, LA 12-55 and a bearing)" % (j.hr_total.sum(), j.y.sum()))
    rows = []
    for c in out:
        s_, o_ = j[c + "_sv"].astype(float), j[c + "_ours"].astype(float)
        rows.append(dict(park=c, savant_total=int(s_.sum()), ours_total=int(o_.sum()), ratio=round(o_.sum() / s_.sum(), 3),
                         player_corr=round(float(np.corrcoef(s_, o_)[0, 1]), 3), mean_abs_err=round(float((s_ - o_).abs().mean()), 2)))
    r = pd.DataFrame(rows).sort_values("ratio")
    print(r.to_string(index=False))
    # park ranking agreement: park total over the same batters
    from scipy.stats import spearmanr
    print("\nSpearman rank correlation of the 30 park totals (Savant vs ours): %.3f" % spearmanr(r.savant_total, r.ours_total)[0])
    # relative to each batter's own actual HR count: share of the actual HRs that count as HR in 'their' parks
    j["sf_diff"] = j["sf_ours"] - j["sf_sv"]
    print("SF (Oracle Park) per-batter difference ours - Savant: mean %.2f, MAE %.2f" % (j.sf_diff.mean(), j.sf_diff.abs().mean()))
    top = j.sort_values("hr_total", ascending=False).head(10)
    print("\nTop 10 HR hitters, SF column (Savant / ours):")
    print(top[["name", "hr_total", "y", "sf_sv", "sf_ours", "col_sv", "col_ours"]].to_string(index=False))
    r.to_csv(ROOT + "data/derived/savant_xhr_compare_parks.csv", index=False)
    j.to_csv(ROOT + "data/derived/savant_xhr_compare_players.csv")


if __name__ == "__main__":
    main()
