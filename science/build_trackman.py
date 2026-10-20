"""Load the public college TrackMan V3 per-game CSVs into one typed batted-ball table.

Research use only: the source repo carries no license, so this table stays in data/ (git-ignored) and is never redistributed.

Usage: python build_trackman.py <v3_dir> <out_parquet>
"""
from __future__ import annotations

import sys
from pathlib import Path

import duckdb

v3, out = Path(sys.argv[1]), Path(sys.argv[2])
con = duckdb.connect()
glob = (v3 / "*.csv").as_posix()
con.sql(f"""
CREATE TABLE raw AS
SELECT * FROM read_csv('{glob}', union_by_name=true, all_varchar=true, ignore_errors=true, filename=true, sample_size=-1)
""")
cols = {r[0] for r in con.sql("DESCRIBE raw").fetchall()}
print("files read:", con.sql("SELECT count(DISTINCT filename) FROM raw").fetchone()[0], "rows:", con.sql("SELECT count(*) FROM raw").fetchone()[0])


def c(name, typ="DOUBLE"):
    return f"TRY_CAST({name} AS {typ}) AS {name}" if name in cols else f"CAST(NULL AS {typ}) AS {name}"


sel = ", ".join([
    "regexp_extract(filename, '([^/\\\\]+)$', 1) AS file",
    c("Date", "VARCHAR"), c("League", "VARCHAR"), c("Level", "VARCHAR"), c("System", "VARCHAR"), c("Stadium", "VARCHAR"),
    c("BatterSide", "VARCHAR"), c("PitcherThrows", "VARCHAR"), c("TaggedPitchType", "VARCHAR"), c("PitchCall", "VARCHAR"),
    c("TaggedHitType", "VARCHAR"), c("PlayResult", "VARCHAR"),
    c("RelSpeed"), c("SpinRate"), c("SpinAxis"), c("PlateLocHeight"), c("PlateLocSide"), c("VertApprAngle"), c("HorzApprAngle"),
    c("ExitSpeed"), c("Angle"), c("Direction"), c("HitSpinRate"), c("HitSpinAxis"), c("Distance"), c("LastTrackedDistance"),
    c("Bearing"), c("HangTime"), c("ContactPositionX"), c("ContactPositionY"), c("ContactPositionZ"),
    c("PositionAt110X"), c("PositionAt110Y"), c("PositionAt110Z"),
])
con.sql(f"CREATE TABLE bbe AS SELECT {sel} FROM raw WHERE TRY_CAST(ExitSpeed AS DOUBLE) IS NOT NULL AND TRY_CAST(Angle AS DOUBLE) IS NOT NULL")
con.sql(f"COPY bbe TO '{out.as_posix()}' (FORMAT parquet)")
print(con.sql("""
SELECT count(*) AS batted_balls,
       sum(CASE WHEN HitSpinRate IS NOT NULL THEN 1 ELSE 0 END) AS with_spin,
       sum(CASE WHEN Direction IS NOT NULL THEN 1 ELSE 0 END) AS with_direction,
       sum(CASE WHEN Bearing IS NOT NULL THEN 1 ELSE 0 END) AS with_bearing,
       sum(CASE WHEN Distance IS NOT NULL THEN 1 ELSE 0 END) AS with_distance,
       sum(CASE WHEN HangTime IS NOT NULL THEN 1 ELSE 0 END) AS with_hang_time,
       sum(CASE WHEN ContactPositionX IS NOT NULL THEN 1 ELSE 0 END) AS with_contact_xyz,
       round(avg(ExitSpeed), 1) AS mean_ev, round(max(ExitSpeed), 1) AS max_ev
FROM bbe""").df().T.to_string(header=False))
print(con.sql("SELECT League, Level, System, count(*) AS n, round(avg(ExitSpeed),1) AS ev, round(avg(HitSpinRate),0) AS spin FROM bbe GROUP BY ALL ORDER BY n DESC LIMIT 12").df().to_string(index=False))
print(con.sql("SELECT min(Date) AS first_date, max(Date) AS last_date, count(DISTINCT file) AS game_files FROM bbe").df().to_string(index=False))
