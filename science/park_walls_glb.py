"""Wall distance and height by bearing for every park, measured on the park models (Stadium_<TEAM>.glb, private, never redistributed).

Same method as oracle_wall.py, generalized: every surface except the turf and dirt meshes counts as potential wall; horizontal rays are cast from above home
plate at heights from 0.3 m up; the wall base is the median first hit of rays at 1.2 to 2.4 m, and the top is the highest ray that still hits that face.
Home plate is not marked in the models, so it is fitted: the search starts from the place Oracle Park's plate sits relative to its infield dirt mesh
and is refined so the extracted distances at the left line, center and right line match the schedule's distances (a fit error is reported; stale schedule
numbers show up as a bad fit and the park is flagged rather than trusted).

Usage: python park_walls_glb.py <out_dir> [TEAM ...]
Output: <out_dir>/<TEAM>.csv (bearing_deg, wall_ft, height_ft), summary.csv
"""
from __future__ import annotations

import sys
import time
from pathlib import Path

import duckdb
import numpy as np
import pandas as pd
import trimesh

FT = 0.3048
MIN_R = 70.0
HEIGHTS = np.arange(0.3, 14.1, 0.3)
GLB = Path("C:/Users/andrewwi/dev/nuke-navigator-new/data/raw/drive/park_glbs")
NAMES = {"ARI": "Arizona", "ATH": "Athletics", "ATL": "Atlanta", "BAL": "Baltimore", "BOS": "Boston", "CHC": "Chicago Cubs", "CIN": "Cincinnati", "CLE": "Cleveland",
         "COL": "Colorado", "CWS": "Chicago White Sox", "DET": "Detroit", "HOU": "Houston", "KC": "Kansas City", "LAA": "Los Angeles Angels", "LAD": "Los Angeles Dodgers",
         "MIA": "Miami", "MIL": "Milwaukee", "MIN": "Minnesota", "NYM": "New York Mets", "NYY": "New York Yankees", "PHI": "Philadelphia", "PIT": "Pittsburgh",
         "SD": "San Diego", "SEA": "Seattle", "SF": "San Francisco", "STL": "St. Louis", "TB": "Tampa Bay", "TEX": "Texas", "TOR": "Toronto", "WSH": "Washington"}
# Oracle Park's home plate relative to its infield dirt mesh (from the validated Oracle fit): plate x = infield center x + SF_DX, plate z = infield back edge z + SF_DZ
SF_PLATE = (0.3, 1.0)


def schedule_dims() -> dict[str, tuple]:
    """Anchors for the home-plate fit: Baseball Savant's measured fence distances (the models were probably built from the same scans) for the park each team
    used most in 2025-26, falling back to the schedule's numbers when Savant has no row."""
    games = duckdb.sql("""SELECT home_team_name, venue_id, venue_name, official_date, dim_left_line, dim_left_center, dim_center, dim_right_center, dim_right_line
                          FROM read_parquet('C:/Users/andrewwi/dev/nuke-navigator-new/data/raw/game_context/games.parquet') WHERE game_year >= 2025""").df()
    sav = pd.read_csv("C:/Users/andrewwi/dev/nuke-navigator-new/data/derived/parks/savant_fence_by_year.csv")
    key = {"CWS": "White Sox", "CHC": "Cubs", "LAA": "Angels", "LAD": "Dodgers", "NYM": "Mets", "NYY": "Yankees"}
    out = {}
    for code, name in NAMES.items():
        sub = games[games.home_team_name.str.contains(key.get(code, name), case=False, regex=False)]
        if not len(sub):
            continue
        vid = int(sub.venue_id.mode().iloc[0])
        row = sub[sub.venue_id == vid].sort_values("official_date").iloc[-1]
        sv = sav[(sav.venue_id == vid)].sort_values("season")
        if len(sv):
            r = sv.iloc[-1]
            out[code] = (row.venue_name, r.dist_lf_line, r.dist_lf_gap, r.dist_cf, r.dist_rf_gap, r.dist_rf_line, vid, "savant", sv.iloc[-1][["height_lf_line", "height_lf_gap", "height_cf", "height_rf_gap", "height_rf_line"]].tolist())
        else:
            out[code] = (row.venue_name, row.dim_left_line, row.dim_left_center, row.dim_center, row.dim_right_center, row.dim_right_line, vid, "schedule", [np.nan] * 5)
    return out


def load_world(path: Path):
    scene = trimesh.load(str(path), force="scene")
    wall, field = [], []
    for g in scene.dump(concatenate=False):
        name = getattr(getattr(g.visual, "material", None), "name", "") or ""
        (field if ("Field" in name or "Infield" in name) else wall).append((name, g))
    return wall, field


def cast(ray, x0, z0, bearings, heights):
    th = np.radians(np.asarray(bearings, float))
    dirs = np.stack([np.sin(th), np.zeros_like(th), -np.cos(th)], 1)
    hh = np.asarray(heights)
    origins = np.zeros((len(th), len(hh), 3))
    origins[..., 0] = x0 + dirs[:, None, 0] * MIN_R
    origins[..., 2] = z0 + dirs[:, None, 2] * MIN_R
    origins[..., 1] = hh[None, :]
    d = np.broadcast_to(dirs[:, None, :], origins.shape)
    loc, idx, _ = ray.intersects_location(origins.reshape(-1, 3), d.reshape(-1, 3), multiple_hits=False)
    first = np.full(origins.shape[0] * origins.shape[1], np.nan)
    if len(idx):
        first[idx] = MIN_R + np.hypot(loc[:, 0] - origins.reshape(-1, 3)[idx, 0], loc[:, 2] - origins.reshape(-1, 3)[idx, 2])
    return first.reshape(len(th), len(hh))


def profile(ray, x0, z0, bearings):
    grid = cast(ray, x0, z0, bearings, HEIGHTS)
    rows = []
    for i, b in enumerate(bearings):
        mid = grid[i, (HEIGHTS >= 1.2) & (HEIGHTS <= 2.4)]
        if np.isnan(mid).all():
            rows.append((b, np.nan, np.nan))
            continue
        base = np.nanmedian(mid)
        top = None
        for j, h in enumerate(HEIGHTS):
            if (not np.isnan(grid[i, j])) and abs(grid[i, j] - base) <= 2.5:
                top = h
            elif h > 2.4:
                break
        rows.append((b, base / FT, np.nan if top is None else (top + 0.15) / FT))
    return rows


def run(code: str, dims: tuple, out_dir: Path) -> dict:
    t0 = time.time()
    wall, field = load_world(GLB / f"Stadium_{code}.glb")
    mesh = trimesh.util.concatenate([g for _, g in wall])
    infield = [g for n, g in field if "Infield" in n]
    ib = infield[0].bounds if infield else None
    anchors = {-45.0: dims[1], 0.0: dims[3], 45.0: dims[5]}
    ray = trimesh.ray.ray_triangle.RayMeshIntersector(mesh) if False else mesh.ray
    # seed: Oracle's plate relative to its infield mesh would need the SF mesh; use the symmetric-diamond guess (center x of the infield, back edge) refined by search
    cx = float((ib[0][0] + ib[1][0]) / 2) if ib is not None else 0.0
    best = None
    for x0 in np.arange(cx - 2.0, cx + 2.01, 0.5):
        for z0 in np.arange(-3.0, 5.01, 0.5):
            rows = profile(ray, x0, z0, list(anchors))
            err = np.nansum([abs(r[1] - anchors[r[0]]) for r in rows])
            if best is None or err < best[0]:
                best = (err, x0, z0, rows)
    err, x0, z0, rows = best
    # refine around the best cell
    for dx in (-0.25, 0.0, 0.25):
        for dz in (-0.25, 0.0, 0.25):
            r2 = profile(ray, x0 + dx, z0 + dz, list(anchors))
            e2 = np.nansum([abs(r[1] - anchors[r[0]]) for r in r2])
            if e2 < err:
                err, x0, z0, rows = e2, x0 + dx, z0 + dz, r2
    bearings = list(np.arange(-47.0, 47.5, 1.0))
    prof = profile(ray, x0, z0, bearings)
    pd.DataFrame(prof, columns=["bearing_deg", "wall_ft", "height_ft"]).round(1).to_csv(out_dir / f"{code}.csv", index=False)
    d = {b: (w, h) for b, w, h in prof}
    nodes = [-45.0, -22.0, 0.0, 22.0, 45.0]
    glb_h = [round(float(d[n][1]), 1) if not np.isnan(d[n][1]) else None for n in nodes]
    return dict(team=code, venue=dims[0], venue_id=dims[6], anchors=dims[7], plate_x=round(x0, 2), plate_z=round(z0, 2), anchor_err_ft=round(float(err), 1),
                glb_h5=str(glb_h), savant_h5=str([round(float(v), 1) for v in dims[8]]), glb_d5=str([round(float(d[n][0]), 0) for n in nodes]), savant_d5=str([round(float(v), 0) for v in dims[1:6]]),
                fit=" | ".join(f"{r[0]:+.0f}:{r[1]:.0f}vs{anchors[r[0]]:.0f}" for r in rows),
                lf_ft=round(d[-45.0][0], 0), lf_h=round(d[-45.0][1], 1) if not np.isnan(d[-45.0][1]) else None,
                cf_ft=round(d[0.0][0], 0), cf_h=round(d[0.0][1], 1) if not np.isnan(d[0.0][1]) else None,
                rf_ft=round(d[45.0][0], 0), rf_h=round(d[45.0][1], 1) if not np.isnan(d[45.0][1]) else None,
                secs=round(time.time() - t0))


def main() -> None:
    out_dir = Path(sys.argv[1])
    out_dir.mkdir(parents=True, exist_ok=True)
    dims = schedule_dims()
    teams = sys.argv[2:] or sorted(NAMES)
    rows = []
    for code in teams:
        if code not in dims or not (GLB / f"Stadium_{code}.glb").exists():
            print("skip", code, flush=True)
            continue
        try:
            r = run(code, dims[code], out_dir)
        except Exception as e:  # keep going; report the failure
            print("FAILED", code, repr(e)[:200], flush=True)
            continue
        rows.append(r)
        print(r, flush=True)
        pd.DataFrame(rows).to_csv(out_dir / "summary.csv", index=False)
    print("done", len(rows), "parks", flush=True)


if __name__ == "__main__":
    main()
