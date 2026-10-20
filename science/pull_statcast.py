"""Pull terminal batted balls (full Baseball Savant schema), one game day at a time.

Polite, resumable and census-gated. Month windows silently truncate at 25,000
rows and Savant revises history, so every day is saved as an immutable raw CSV
with a SHA-256 and a row/game census before anything is combined.

Usage:
    py pull_statcast.py --years 2015 2016 --out ../data/raw/statcast --limit-days 1
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import io
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import duckdb
import requests

SAVANT = "https://baseballsavant.mlb.com/statcast_search/csv"
SCHEDULE = "https://statsapi.mlb.com/api/v1/schedule"
UA = "nuke-navigator-research/0.1 (personal project)"
ROW_CAP = 25000
CENSUS_FIELDS = [
    "date", "year", "expected_games", "observed_games", "missing_games", "extra_games",
    "rows", "bytes", "sha256", "non_x_rows", "bbe_per_game_min", "bbe_per_game_max",
    "flags", "fetched_utc",
]


def savant_params(day: str, year: int) -> dict:
    return {
        "all": "true", "hfPT": "", "hfAB": "", "hfGT": "R|",
        "hfPR": "hit\\.\\.into\\.\\.play|",
        "hfZ": "", "stadium": "", "hfBBL": "", "hfNewZones": "", "hfPull": "", "hfC": "",
        "hfSea": f"{year}|", "hfSit": "", "player_type": "batter", "hfOuts": "",
        "opponent": "", "pitcher_throws": "", "batter_stands": "", "hfSA": "",
        "game_date_gt": day, "game_date_lt": day, "hfInfield": "", "team": "",
        "position": "", "hfOutfield": "", "hfRO": "", "home_road": "", "hfFlag": "",
        "hfBBT": "", "metric_1": "", "hfInn": "", "min_pitches": "0", "min_results": "0",
        "group_by": "name", "sort_col": "pitches", "player_event_sort": "h_launch_speed",
        "sort_order": "desc", "min_abs": "0", "type": "details",
    }


def log(out: Path, msg: str) -> None:
    line = f"{datetime.now(timezone.utc).isoformat(timespec='seconds')} {msg}"
    print(line, flush=True)
    with (out / "pull.log").open("a", encoding="utf-8") as f:
        f.write(line + "\n")


def expected_games(session: requests.Session, year: int) -> dict[str, set[int]]:
    r = session.get(
        SCHEDULE,
        params={"sportId": 1, "season": year, "gameType": "R"},
        timeout=60,
    )
    r.raise_for_status()
    by_day: dict[str, set[int]] = {}
    for block in r.json().get("dates", []):
        for g in block.get("games", []):
            if g.get("status", {}).get("abstractGameState") == "Final":
                by_day.setdefault(g.get("officialDate", block["date"]), set()).add(g["gamePk"])
    return by_day


def done_dates(census: Path) -> set[str]:
    if not census.exists():
        return set()
    with census.open(newline="", encoding="utf-8") as f:
        return {row["date"] for row in csv.DictReader(f)}


def fetch_day(session: requests.Session, day: str, year: int) -> bytes:
    delays = [20, 60, 180]
    for attempt in range(len(delays) + 1):
        try:
            r = session.get(SAVANT, params=savant_params(day, year), timeout=120)
        except requests.RequestException as e:
            if attempt == len(delays):
                raise
            time.sleep(delays[attempt])
            continue
        if r.status_code in (403, 429):
            raise PermissionError(f"HTTP {r.status_code} from Savant on {day}: stopping, no workaround")
        if r.status_code >= 500 and attempt < len(delays):
            time.sleep(delays[attempt])
            continue
        r.raise_for_status()
        return r.content
    raise RuntimeError("unreachable")


def census_row(day: str, year: int, expected: set[int], body: bytes) -> dict:
    text = body.decode("utf-8-sig")
    rows = list(csv.DictReader(io.StringIO(text))) if text.strip() else []
    games: dict[str, int] = {}
    non_x = 0
    for row in rows:
        games[row.get("game_pk", "")] = games.get(row.get("game_pk", ""), 0) + 1
        if row.get("type") != "X":
            non_x += 1
    observed = {int(g) for g in games if g.isdigit()}
    flags = []
    if expected - observed:
        flags.append("MISSING_GAMES")
    if observed - expected:
        flags.append("EXTRA_GAMES")
    if len(rows) >= ROW_CAP:
        flags.append("ROW_CAP")
    if non_x:
        flags.append("NON_X_ROWS")
    counts = list(games.values())
    if counts and (min(counts) < 20 or max(counts) > 110):
        flags.append("BBE_PER_GAME_ODD")
    return {
        "date": day, "year": year, "expected_games": len(expected),
        "observed_games": len(observed), "missing_games": len(expected - observed),
        "extra_games": len(observed - expected), "rows": len(rows), "bytes": len(body),
        "sha256": hashlib.sha256(body).hexdigest(), "non_x_rows": non_x,
        "bbe_per_game_min": min(counts) if counts else 0,
        "bbe_per_game_max": max(counts) if counts else 0,
        "flags": "|".join(flags),
        "fetched_utc": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    }


def combine_year(raw_dir: Path, year: int, out: Path) -> None:
    files = sorted(raw_dir.glob(f"{year}-*.csv"))
    if not files:
        return
    dest = out / f"statcast_bbe_{year}_raw.parquet"
    glob = (raw_dir / f"{year}-*.csv").as_posix()
    duckdb.sql(
        f"COPY (SELECT * FROM read_csv('{glob}', header=true, all_varchar=true, union_by_name=true)) "
        f"TO '{dest.as_posix()}' (FORMAT parquet)"
    )
    n = duckdb.sql(f"SELECT count(*) FROM read_parquet('{dest.as_posix()}')").fetchone()[0]
    log(out, f"combined {year}: {len(files)} day files -> {n} rows -> {dest.name}")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--years", type=int, nargs="+", required=True)
    ap.add_argument("--out", type=Path, required=True)
    ap.add_argument("--sleep", type=float, default=3.0)
    ap.add_argument("--limit-days", type=int, default=0, help="stop after N new days (test runs)")
    args = ap.parse_args()

    out: Path = args.out
    raw = out / "raw"
    raw.mkdir(parents=True, exist_ok=True)
    census_path = out / "census.csv"
    session = requests.Session()
    session.headers["User-Agent"] = UA
    requests_made = 0
    new_days = 0

    try:
        for year in args.years:
            schedule = expected_games(session, year)
            requests_made += 1
            log(out, f"{year}: {len(schedule)} game days in the MLB schedule")
            finished = done_dates(census_path)
            for day in sorted(schedule):
                if day in finished:
                    continue
                if args.limit_days and new_days >= args.limit_days:
                    log(out, f"limit of {args.limit_days} new days reached; requests so far: {requests_made}")
                    return 0
                body = fetch_day(session, day, year)
                requests_made += 1
                (raw / f"{day}.csv").write_bytes(body)
                row = census_row(day, year, schedule[day], body)
                new = not census_path.exists()
                with census_path.open("a", newline="", encoding="utf-8") as f:
                    w = csv.DictWriter(f, fieldnames=CENSUS_FIELDS)
                    if new:
                        w.writeheader()
                    w.writerow(row)
                new_days += 1
                if row["flags"]:
                    log(out, f"{day} rows={row['rows']} flags={row['flags']}")
                elif new_days % 20 == 0:
                    log(out, f"{day} ok, {new_days} new days, {requests_made} requests")
                time.sleep(args.sleep)
            if not args.limit_days:
                combine_year(raw, year, out)
    except PermissionError as e:
        log(out, f"STOPPED: {e}")
        (out / "STOPPED.txt").write_text(str(e), encoding="utf-8")
        return 2
    log(out, f"finished; requests made: {requests_made}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
