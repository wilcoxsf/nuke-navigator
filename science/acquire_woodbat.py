"""Acquire public wood-bat TrackMan files for spin validation (research only, never redistributed, never committed).

Cape Cod League: follows GPT's frozen H180 procedure exactly. The manifest `data/csv_exclusions.txt` of pitchingcoachu/OklahomaState at
commit f20abb04 is parsed for basenames containing "CCBL" and ending in .csv; each is fetched from the public raw object at the pre-prune
commit 41f2f8a8 under `data/v3/v3_2026_02_04_<basename>`; the nine files GPT froze in H176 are fetched at commit f20abb04. Nothing else
from that repo is touched (it exposes credential files that must never be opened or downloaded).

Frontier League: every CSV under data/ in coreygoldstick/washingtonwildthings at the default branch (95 files).

Polite: honest user agent, 1 s between requests, stops on any 403 or 429, resumable (existing files skipped). Output:
data/raw/woodbat/<source>/*.csv and data/derived/woodbat_<source>.parquet (columns the spin tests use).

Usage: python acquire_woodbat.py <repo_root>
"""
from __future__ import annotations

import subprocess
import sys
import time
from pathlib import Path

import pandas as pd
import requests

UA = "nuke-navigator-research/0.1 (personal project)"
OKST = "pitchingcoachu/OklahomaState"
MANIFEST_COMMIT = "f20abb04c7f6cc62ee7d7c67d728fa887269c289"
PREPRUNE_COMMIT = "41f2f8a80532712349ab6d2a72519b19d5d0bf5b"
H176_PATHS = ["20250615-CCBLOrleans-1", "20250703-CCBLBourne-1", "20250717-CCBLCotuit-1", "20250704-CCBLWareham-1", "20250709-CCBLOrleans-1",
              "20250703-CCBLHyannis-1", "20250713-CCBLHarwich-2", "20250628-CCBLWareham-1", "20250614-CCBLBrewster-1"]
KEEP = ["GameID", "PitchUID", "PitchNo", "Date", "League", "Level", "System", "Stadium", "BatterSide", "PitcherThrows", "TaggedPitchType", "PitchCall",
        "PlayResult", "RelSpeed", "SpinRate", "SpinAxis", "PlateLocHeight", "PlateLocSide", "VertApprAngle", "HorzApprAngle", "ExitSpeed", "Angle", "Direction", "HitSpinRate",
        "HitSpinAxis", "Bearing", "Distance", "HangTime", "ContactPositionX", "ContactPositionY", "ContactPositionZ"]
session = requests.Session()
session.headers["User-Agent"] = UA


def get(url: str) -> bytes | None:
    time.sleep(1.0)
    r = session.get(url, timeout=120)
    if r.status_code in (403, 429):
        raise SystemExit(f"{r.status_code} from {url}: stopping, no workaround")
    return r.content if r.status_code == 200 else None


def raw(repo: str, ref: str, path: str) -> str:
    return f"https://raw.githubusercontent.com/{repo}/{ref}/{path}"


def combine(folder: Path, out: Path, require_league: str | None) -> None:
    frames, rejected = [], []
    for f in sorted(folder.glob("*.csv")):
        d = pd.read_csv(f, low_memory=False)
        if require_league and "League" in d and d["League"].notna().any() and require_league not in set(d["League"].dropna().astype(str)):
            rejected.append(f.name)
            continue
        d["source_file"] = f.name
        frames.append(d[[c for c in KEEP if c in d.columns] + ["source_file"]])
    allf = pd.concat(frames, ignore_index=True)
    allf.to_parquet(out)
    spin = allf.HitSpinRate.notna() & allf.HitSpinAxis.notna()
    print(f"{out.name}: {len(frames)} files kept, {len(rejected)} rejected, {len(allf):,} rows, {int(allf.ExitSpeed.notna().sum()):,} batted balls, "
          f"{int(spin.sum()):,} with spin rate and axis", flush=True)


def main() -> None:
    root = Path(sys.argv[1])
    cape, wwt = root / "data/raw/woodbat/cape", root / "data/raw/woodbat/frontier_wwt"
    cape.mkdir(parents=True, exist_ok=True)
    wwt.mkdir(parents=True, exist_ok=True)

    man = get(raw(OKST, MANIFEST_COMMIT, "data/csv_exclusions.txt"))
    names = set()
    for line in man.decode("utf-8", "replace").splitlines():
        t = line.split("#", 1)[0].strip()
        if t and not line.strip().startswith("#") and "CCBL" in t and t.lower().endswith(".csv"):
            names.add(t.split("/")[-1])
    names = sorted(names)
    print(f"manifest: {len(names)} CCBL candidate files", flush=True)
    ok = miss = 0
    for n in names:
        dest = cape / f"v3_2026_02_04_{n}"
        if dest.exists():
            ok += 1
            continue
        b = get(raw(OKST, PREPRUNE_COMMIT, f"data/v3/v3_2026_02_04_{n}"))
        if b is None:
            miss += 1
            continue
        dest.write_bytes(b)
        ok += 1
    print(f"pre-prune recovery: {ok} fetched or present, {miss} not recoverable", flush=True)
    for stem in H176_PATHS:
        dest = cape / f"v3_2026_02_04_{stem}.csv"
        if not dest.exists():
            b = get(raw(OKST, MANIFEST_COMMIT, f"data/v3/v3_2026_02_04_{stem}.csv"))
            if b is not None:
                dest.write_bytes(b)
    print(f"cape folder: {len(list(cape.glob('*.csv')))} files", flush=True)

    tree = subprocess.run(["gh", "api", "repos/coreygoldstick/washingtonwildthings/git/trees/HEAD?recursive=1", "--jq",
                           '.tree[] | select(.type=="blob") | .path'], capture_output=True, text=True, check=True).stdout.split()
    csvs = [p for p in tree if p.lower().endswith(".csv") and p.startswith("data/")]
    print(f"washingtonwildthings: {len(csvs)} CSVs", flush=True)
    for p in csvs:
        dest = wwt / p.split("/")[-1]
        if dest.exists():
            continue
        b = get(raw("coreygoldstick/washingtonwildthings", "HEAD", p))
        if b is not None:
            dest.write_bytes(b)
    (root / "data/derived").mkdir(parents=True, exist_ok=True)
    combine(cape, root / "data/derived/woodbat_cape.parquet", "CCBL")
    combine(wwt, root / "data/derived/woodbat_frontier_wwt.parquet", None)


if __name__ == "__main__":
    main()
