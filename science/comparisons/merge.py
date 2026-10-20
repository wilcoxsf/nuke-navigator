"""Merge Wikidata raw results and the hand-curated overlay into one comparison library.

Usage: python merge.py <raw_dir> <out_json>
Every record keeps its source. Wikidata rows are community-sourced and unreviewed; curated rows say
whether the source text was actually read.
"""
from __future__ import annotations

import json
import re
import statistics
import sys
from collections import Counter, defaultdict
from pathlib import Path

import manual_items

FT, MI, MPH = 0.3048, 1609.344, 0.44704
CAT = {
    "towers_height": "tall-things", "buildings_height": "tall-things", "churches_height": "tall-things",
    "statues_height": "statues", "mountains_elevation": "mountains", "bridges_length": "bridges",
    "ships_length": "ships", "aircraft_length": "aircraft", "rivers_length": "rivers",
    "roads_rail_length": "roads-rail-tunnels", "coasters_height": "roller-coasters", "coasters_length": "roller-coasters",
    "coasters_speed": "roller-coasters", "sf_height": "san-francisco", "sf_length": "san-francisco", "speed_any": "speed-misc",
}


def sane(row: dict) -> bool:
    v, k, label = row["value_si"], row["kind"], row["label"]
    if v <= 0 or re.fullmatch(r"Q\d+", label) or not re.search(r"[A-Za-z]", label):
        return False
    return (0.05 <= v <= 2.0e7) if k == "length" else (0.001 <= v <= 1.0e5)


def load_wikidata(raw: Path) -> list[dict]:
    groups: dict[tuple, list[dict]] = defaultdict(list)
    for f in sorted(raw.glob("*.json")):
        for r in json.loads(f.read_text(encoding="utf-8")):
            if sane(r):
                groups[(r["qid"], r["kind"])].append(r)
    out = []
    for (qid, kind), rows in groups.items():
        vals = [r["value_si"] for r in rows]
        first = rows[0]
        note = ""
        if max(vals) > 1.1 * min(vals):
            note = f"Wikidata records {len(set(vals))} different values ({min(vals):.4g} to {max(vals):.4g}); median shown"
        out.append(dict(
            id=qid, name=first["label"], kind=kind, value_si=statistics.median(vals),
            category=CAT.get(first["query"], "misc"), source_label="Wikidata (community-sourced)",
            source_url=f"https://www.wikidata.org/wiki/{qid}", evidence="wikidata", reviewed=False,
            note=note, fame=max(r["sitelinks"] for r in rows),
        ))
    return out


def fmt_len(m: float) -> str:
    ft = m / FT
    return f"{ft:,.0f} ft" if ft < 5280 else f"{m / MI:,.1f} mi"


def finish(rec: dict) -> dict:
    rec["display"] = fmt_len(rec["value_si"]) if rec["kind"] == "length" else f"{rec['value_si'] / MPH:,.1f} mph"
    return rec


def pick(lib: list[dict], kind: str, amount_si: float, n: int = 5) -> list[tuple[str, str, float]]:
    """Choose comparisons whose ratio to the amount is a 'nice' multiple, favoring famous items."""
    nice = [0.25, 0.5, 1, 1.5, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30, 40, 50]
    scored = []
    for r in lib:
        if r["kind"] != kind:
            continue
        q = amount_si / r["value_si"]
        if not (0.2 <= q <= 55):
            continue
        err = min(abs(q - c) / c for c in nice)
        if err < 0.06:
            scored.append((err - 0.002 * min(r["fame"], 60), r["name"], q))
    scored.sort()
    return [(name, f"{q:.2f}x", round(e, 3)) for e, name, q in scored[:n]]


def main() -> None:
    raw, out = Path(sys.argv[1]), Path(sys.argv[2])
    lib = load_wikidata(raw)
    for m in manual_items.ITEMS:
        m = dict(m)
        m["fame"] = 999
        lib.append(m)
    lib = [finish(r) for r in lib]
    out.write_text(json.dumps(lib, ensure_ascii=False, indent=1), encoding="utf-8")

    print(f"records: {len(lib)}  (lengths {sum(r['kind'] == 'length' for r in lib)}, speeds {sum(r['kind'] == 'speed' for r in lib)})")
    print("by category:", dict(Counter((r["kind"], r["category"]) for r in lib).most_common()))
    print("evidence:", dict(Counter(r["evidence"] for r in lib)))
    print("reviewed (source text read):", sum(r["reviewed"] for r in lib))
    for kind, amount, label in [("length", 420 * FT, "420 ft home run"), ("speed", 108 * MPH, "108 mph exit velocity")]:
        print(f"\n{label}:")
        for name, q, e in pick(lib, kind, amount):
            print(f"  {q:>7}  {name}")


if __name__ == "__main__":
    main()
