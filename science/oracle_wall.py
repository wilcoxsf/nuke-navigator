"""B1: Oracle Park fence profile (distance and height by bearing) by casting rays against the park model's triangles.

Input is a JSON dump of the stadium mesh (vertices in meters, y up, field toward -z, right field toward +x) made with
apps/web/tools/dump_prims.mjs from Stadium_SF.glb. The first pass that looked at vertices failed on flat wall panels, which have few vertices;
rays hit the triangles themselves.

For each bearing (0 = center, positive toward right field) horizontal rays are cast from above home plate at heights from 0.3 m up.
Hits closer than 80 m are ignored (backstop, dugouts, screens). The wall base is the first hit at a low ray; the wall top is the highest ray
that still hits the same face (within 2.5 m of the base hit). Home plate is not marked in the model: it is fitted so the extracted distances
match the schedule's current-era distances at the left line, center and right line, then checked at the other angles and against heights.

Usage: python oracle_wall.py <mesh.json> <out.csv> <out.md>
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import duckdb
import numpy as np
import trimesh

FT = 0.3048
MIN_R = 80.0
HEIGHTS = np.arange(0.3, 14.0, 0.3)


def load_mesh(paths):
    """Union of the wall-relevant surfaces: the main stadium mesh and the ad padding that forms the lower part of the outfield wall."""
    parts = []
    for path in str(paths).split(","):
        d = json.load(open(path))
        for key in ("SF_Greyscale", "Ads_Padding"):
            if key in d:
                v, t = np.array(d[key]["verts"]), np.array(d[key]["tris"], dtype=np.int64).reshape(-1, 3)
                parts.append(trimesh.Trimesh(vertices=v, faces=t, process=False))
    return trimesh.util.concatenate(parts)


def cast(mesh, x0, z0, bearings, heights):
    th = np.radians(bearings)
    origins, dirs, idx = [], [], []
    for i, b in enumerate(th):
        for h in heights:
            origins.append([x0, h, z0])
            dirs.append([np.sin(b), 0.0, -np.cos(b)])
            idx.append((i, h))
    origins, dirs = np.array(origins), np.array(dirs)
    loc, ray, _ = mesh.ray.intersects_location(origins, dirs, multiple_hits=True)
    first = np.full(len(origins), np.nan)
    if len(loc):
        dist = np.hypot(loc[:, 0] - origins[ray, 0], loc[:, 2] - origins[ray, 2])
        for r, d in sorted(zip(ray, dist), key=lambda z: (z[0], z[1])):
            if d >= MIN_R and np.isnan(first[r]):
                first[r] = d
    return first.reshape(len(bearings), len(heights))


def profile(mesh, x0, z0, bearings):
    grid = cast(mesh, x0, z0, bearings, HEIGHTS)
    rows = []
    for i, b in enumerate(bearings):
        mid = grid[i, (HEIGHTS >= 1.2) & (HEIGHTS <= 2.4)]  # rays from 1.2 to 2.4 m: above the padding gaps, below any wall top
        if np.isnan(mid).all():
            rows.append((b, np.nan, np.nan))
            continue
        base = np.nanmedian(mid)
        top = None
        for j, h in enumerate(HEIGHTS):
            ok = (not np.isnan(grid[i, j])) and abs(grid[i, j] - base) <= 2.5
            if ok:
                top = h
            elif h > 2.4:
                break
        rows.append((b, base / FT, np.nan if top is None else (top + 0.15) / FT))
    return rows


def main() -> None:
    mesh = load_mesh(sys.argv[1])
    print("mesh:", len(mesh.vertices), "vertices,", len(mesh.faces), "triangles", flush=True)
    dims = duckdb.sql("SELECT dim_left_line, dim_left_center, dim_center, dim_right_center, dim_right_line FROM read_parquet("
                      "'C:/Users/andrewwi/dev/nuke-navigator-new/data/raw/game_context/games.parquet') WHERE venue_id = 2395 ORDER BY official_date DESC LIMIT 1").fetchone()
    anchors = {-45.0: dims[0], 0.0: dims[2], 45.0: dims[4]}
    best = None
    for x0 in (-0.6, -0.3, 0.0, 0.3, 0.6):
        for z0 in (-1.0, -0.5, 0.0, 0.5, 1.0, 1.5, 2.0):
            rows = profile(mesh, x0, z0, list(anchors))
            err = np.nansum([abs(r[1] - anchors[r[0]]) for r in rows])
            if best is None or err < best[0]:
                best = (err, x0, z0, rows)
    err, x0, z0, rows = best
    print(f"home plate fit: x {x0}, z {z0}; total anchor error {err:.1f} ft: " + "; ".join(f"{r[0]:+.0f}: {r[1]:.1f} ft (schedule {anchors[r[0]]})" for r in rows), flush=True)
    bearings = list(np.arange(-47.0, 47.5, 1.0))
    prof = profile(mesh, x0, z0, bearings)
    out = Path(sys.argv[2])
    out.write_text("bearing_deg,wall_ft,height_ft\n" + "\n".join(f"{b:.1f},{d:.1f},{h:.1f}" for b, d, h in prof), encoding="utf-8")
    L = ["# Oracle Park fence profile from the park model", "", f"Home plate fitted at x = {x0}, z = {z0} m; anchors (schedule current-era distances) and extracted: " +
         "; ".join(f"{r[0]:+.0f} deg {r[1]:.1f} ft vs {anchors[r[0]]}" for r in rows) + f". Schedule list (LL, LC, C, RC, RL): {dims}.", "",
         "| Bearing | Wall distance (ft) | Wall height (ft) |", "|---|---|---|"]
    for b, d, h in prof:
        if int(b) % 3 == 0 or abs(b) >= 44:
            L.append(f"| {b:+.0f} | {d:.1f} | {h:.1f} |")
    Path(sys.argv[3]).write_text("\n".join(L) + "\n", encoding="utf-8")
    print("\n".join(L))


if __name__ == "__main__":
    main()
