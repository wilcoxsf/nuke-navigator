"""Build the raw comparison library (lengths and speeds) from Wikidata's official query service.

Wikidata data is CC0. Each row keeps its Wikidata item id so the source is always one click away.
Bounded: one query at a time, spaced out, stops on any 429 or repeated failure.

Usage: python build_wikidata.py <out_dir> [query_name ...]
"""
from __future__ import annotations

import json
import sys
import time
from pathlib import Path

import requests

ENDPOINT = "https://query.wikidata.org/sparql"
UA = "nuke-navigator-research/0.1 (https://github.com/wilcoxsf/nuke-navigator)"
SLEEP = 8.0


def by_class(prop: str, classes: list[str], min_sl: int) -> str:
    vals = " ".join(f"wd:{c}" for c in classes)
    return f"""
SELECT ?item ?itemLabel ?v ?sl ?clsLabel WHERE {{
  VALUES ?cls {{ {vals} }}
  ?item wdt:P31/wdt:P279* ?cls .
  ?item p:{prop}/psn:{prop}/wikibase:quantityAmount ?v .
  ?item wikibase:sitelinks ?sl . FILTER(?sl >= {min_sl})
  SERVICE wikibase:label {{ bd:serviceParam wikibase:language "en". }}
}} LIMIT 3000"""


def anything(prop: str, min_sl: int) -> str:
    return f"""
SELECT ?item ?itemLabel ?v ?sl WHERE {{
  ?item p:{prop}/psn:{prop}/wikibase:quantityAmount ?v .
  ?item wikibase:sitelinks ?sl . FILTER(?sl >= {min_sl})
  SERVICE wikibase:label {{ bd:serviceParam wikibase:language "en". }}
}} LIMIT 4000"""


def san_francisco(prop: str) -> str:
    return f"""
SELECT ?item ?itemLabel ?v ?sl WHERE {{
  SERVICE wikibase:box {{ ?item wdt:P625 ?loc .
    bd:serviceParam wikibase:cornerSouthWest "Point(-122.60 37.60)"^^geo:wktLiteral .
    bd:serviceParam wikibase:cornerNorthEast "Point(-122.30 37.85)"^^geo:wktLiteral . }}
  ?item p:{prop}/psn:{prop}/wikibase:quantityAmount ?v .
  ?item wikibase:sitelinks ?sl . FILTER(?sl >= 3)
  SERVICE wikibase:label {{ bd:serviceParam wikibase:language "en". }}
}} LIMIT 2000"""


# name -> (kind, query). Lengths in metres, speeds in metres per second (Wikidata normalised values).
QUERIES: dict[str, tuple[str, str]] = {
    "towers_height": ("length", by_class("P2048", ["Q11303", "Q12518"], 12)),
    "statues_height": ("length", by_class("P2048", ["Q179700"], 12)),
    "mountains_elevation": ("length", by_class("P2044", ["Q8502"], 40)),
    "churches_height": ("length", by_class("P2048", ["Q16970"], 20)),
    "buildings_height": ("length", by_class("P2048", ["Q41176"], 40)),
    "bridges_length": ("length", by_class("P2043", ["Q12280"], 12)),
    "ships_length": ("length", by_class("P2043", ["Q11446"], 12)),
    "aircraft_length": ("length", by_class("P2043", ["Q11436"], 8)),
    "rivers_length": ("length", by_class("P2043", ["Q4022"], 25)),
    "roads_rail_length": ("length", by_class("P2043", ["Q34442", "Q728937", "Q12284", "Q44377"], 15)),
    "coasters_height": ("length", by_class("P2048", ["Q204832"], 6)),
    "coasters_length": ("length", by_class("P2043", ["Q204832"], 6)),
    "coasters_speed": ("speed", by_class("P2052", ["Q204832"], 6)),
    "sf_height": ("length", san_francisco("P2048")),
    "sf_length": ("length", san_francisco("P2043")),
    "speed_any": ("speed", anything("P2052", 8)),
    "speed_famous": ("speed", anything("P2052", 30)),
}


def run(name: str, kind: str, query: str, out: Path) -> int:
    for attempt, wait in enumerate([0, 30, 90]):
        time.sleep(wait)
        try:
            r = requests.get(ENDPOINT, params={"query": query, "format": "json"},
                             headers={"User-Agent": UA, "Accept": "application/sparql-results+json"}, timeout=75)
        except requests.RequestException as e:
            print(f"  {name}: network error {type(e).__name__}, attempt {attempt + 1}")
            continue
        if r.status_code == 429:
            raise SystemExit(f"429 from Wikidata on {name}: stopping, no workaround")
        if r.status_code != 200:
            print(f"  {name}: HTTP {r.status_code} (attempt {attempt + 1}) {r.text[:120].strip()!r}")
            continue
        rows = r.json()["results"]["bindings"]
        slim = [{
            "qid": b["item"]["value"].rsplit("/", 1)[-1],
            "label": b["itemLabel"]["value"],
            "value_si": float(b["v"]["value"]),
            "sitelinks": int(b["sl"]["value"]),
            "cls": b.get("clsLabel", {}).get("value", ""),
            "kind": kind,
            "query": name,
        } for b in rows]
        (out / f"{name}.json").write_text(json.dumps(slim, ensure_ascii=False), encoding="utf-8")
        return len(slim)
    return -1


def main() -> None:
    out = Path(sys.argv[1])
    out.mkdir(parents=True, exist_ok=True)
    wanted = sys.argv[2:] or list(QUERIES)
    for i, name in enumerate(wanted):
        kind, query = QUERIES[name]
        t = time.time()
        n = run(name, kind, query, out)
        print(f"{name}: {n} rows in {time.time() - t:.0f}s", flush=True)
        if i < len(wanted) - 1:
            time.sleep(SLEEP)


if __name__ == "__main__":
    main()
