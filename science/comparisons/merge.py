"""Merge Wikidata raw results and the hand-curated overlays into one comparison library.

Usage: python merge.py <raw_dir> <out_json>
Every record keeps its source. Wikidata rows are community-sourced and unreviewed; curated rows say
whether the source text was actually read. Items whose source disagrees with itself by more than 1.5x are dropped.
"""
from __future__ import annotations

import json
import re
import statistics
import sys
from collections import Counter, defaultdict
from pathlib import Path

import manual_items
import manual_trivia
import manual_trivia2
import manual_trivia3

FT, MI, MPH = 0.3048, 1609.344, 0.44704
CAT = {
    "towers_height": "tall-things", "buildings_height": "tall-things", "churches_height": "tall-things",
    "statues_height": "statues", "mountains_elevation": "mountains", "bridges_length": "bridges",
    "ships_length": "ships", "aircraft_length": "aircraft", "rivers_length": "rivers",
    "roads_rail_length": "roads-rail-tunnels", "coasters_height": "roller-coasters", "coasters_length": "roller-coasters",
    "coasters_speed": "roller-coasters", "sf_height": "san-francisco", "sf_length": "san-francisco",
    "speed_any": "vehicles-and-things", "speed_famous": "vehicles-and-things",
}
# physics concepts and non-objects that are not fun comparisons
BLOCK = {"light", "graviton", "tachyon", "gravitational wave", "escape velocity", "perseids", "aurora", "geminids",
         "leonids", "photon", "neutrino", "speed of light", "walking", "tiger i", "t-54/55"}
RENAME = {"Q2": "Earth orbiting the Sun", "Q319": "Jupiter orbiting the Sun", "Q332": "Neptune orbiting the Sun",
          "Q193": "Saturn orbiting the Sun"}
SF_RE = re.compile(r"(?i:\b(?:san francisco|golden gate|alcatraz|oracle park|coit tower|sutro|transamerica|bay bridge|"
                   r"salesforce tower|mccovey|lombard street|muni|cable car)\b)|\bBART\b")
RACE_RE = re.compile(r"^\d{4}\b|\d{4}$|\b(stage|race|grand prix|giro|tour of|tour de|vuelta|classic|trophy|cup|"
                     r"championship|koerse|gun|howitzer|cannon|paris.nice|wevelgem)\b", re.I)


def sane(row: dict) -> bool:
    v, k, label = row["value_si"], row["kind"], row["label"]
    if v <= 0 or re.fullmatch(r"Q\d+", label) or not re.search(r"[A-Za-z]", label) or label.lower() in BLOCK:
        return False
    return (0.05 <= v <= 2.0e7) if k == "length" else (0.001 <= v <= 1.0e5)


def load_wikidata(raw: Path) -> tuple[list[dict], int]:
    groups: dict[tuple, list[dict]] = defaultdict(list)
    for f in sorted(raw.glob("*.json")):
        for r in json.loads(f.read_text(encoding="utf-8")):
            if sane(r):
                groups[(r["qid"], r["kind"])].append(r)
    out, dropped = [], 0
    for (qid, kind), rows in groups.items():
        vals = [r["value_si"] for r in rows]
        if max(vals) > 1.5 * min(vals):
            dropped += 1
            continue
        first = rows[0]
        fame = max(r["sitelinks"] for r in rows)
        if kind == "speed" and first["query"] == "speed_any" and (fame < 20 or RACE_RE.search(first["label"])):
            continue
        name = RENAME.get(qid, first["label"])
        note = ""
        if max(vals) > 1.05 * min(vals):
            note = f"Wikidata records different values ({min(vals):.4g} to {max(vals):.4g}); median shown"
        theme = "sf" if first["query"].startswith("sf_") or SF_RE.search(name) else "general"
        out.append(dict(
            id=qid, name=name, kind=kind, value_si=statistics.median(vals), category=CAT.get(first["query"], "misc"),
            theme=theme, source_label="Wikidata (community-sourced)", source_url=f"https://www.wikidata.org/wiki/{qid}",
            evidence="wikidata", reviewed=False, note=note, fame=max(r["sitelinks"] for r in rows),
        ))
    return out, dropped


def theme_of(rec: dict) -> str:
    if rec.get("theme"):
        return rec["theme"]
    cat = rec["category"]
    if cat.startswith("sf") or SF_RE.search(rec["name"]):
        return "sf"
    if cat.startswith("weird") or cat in ("computed", "terminal-velocity"):
        return "weird"
    return "general"


def fmt_len(m: float) -> str:
    ft = m / FT
    return f"{ft:,.0f} ft" if ft < 5280 else f"{m / MI:,.1f} mi"


HEIGHT_CATS = {"tall-things", "statues", "mountains", "churches"}
HEIGHT_RE = re.compile(r"\b(tower|height|tall|pyramid|building|statue|obelisk|cathedral|church|mountain|sequoia|tree|"
                       r"hoop|giraffe|chimney|skyscraper|lighthouse|arch)\b", re.I)


def finish(rec: dict) -> dict:
    if rec["kind"] == "length":
        rec["display"] = fmt_len(rec["value_si"])
        if not rec.get("dim"):
            rec["dim"] = "height" if rec["category"] in HEIGHT_CATS or HEIGHT_RE.search(rec["name"]) else "length"
    else:
        v = rec["value_si"] / MPH
        rec["display"] = f"{v:,.1f} mph" if v >= 0.05 else f"{rec['value_si'] * 100:.3g} cm/s"
    rec["theme"] = theme_of(rec)
    return rec


def slim(rec: dict) -> dict:
    """Compact record for the app."""
    out = {"n": rec["name"], "k": rec["kind"][0], "v": rec["value_si"], "t": rec["theme"][0], "c": rec["category"],
           "f": min(rec["fame"], 100), "r": int(rec["reviewed"]), "u": rec["source_url"]}
    if rec.get("dim"):
        out["d"] = rec["dim"]
    if rec.get("note"):
        out["x"] = rec["note"]
    if rec.get("count_ok"):
        out["o"] = 1
    return out


def main() -> None:
    """Usage: merge.py <raw_dir> <full_out.json> [<slim_app_out.json>]. The picker lives in the app (comparisons.js)."""
    raw, out = Path(sys.argv[1]), Path(sys.argv[2])
    lib, dropped = load_wikidata(raw)
    curated = [dict(m, fame=999) for m in manual_items.ITEMS + manual_trivia.ITEMS + manual_trivia2.ITEMS + manual_trivia3.ITEMS]
    curated_names = " | ".join(c["name"].lower() for c in curated)
    before = len(lib)
    lib = [r for r in lib if r["name"].lower() not in curated_names]
    dup = before - len(lib)
    lib = [finish(r) for r in lib + curated]
    out.write_text(json.dumps(lib, ensure_ascii=False, indent=1), encoding="utf-8")

    print(f"records: {len(lib)}  (lengths {sum(r['kind'] == 'length' for r in lib)}, speeds {sum(r['kind'] == 'speed' for r in lib)})")
    print(f"dropped: {dropped} Wikidata items whose values disagreed by >1.5x, {dup} duplicates of curated items")
    print("by theme:", dict(Counter(r["theme"] for r in lib)))
    print("by kind and category:", dict(Counter((r["kind"], r["category"]) for r in lib).most_common(30)))
    print("evidence:", dict(Counter(r["evidence"] for r in lib)))
    print("source text read:", sum(r["reviewed"] for r in lib), "| unreviewed:", sum(not r["reviewed"] for r in lib))
    if len(sys.argv) > 3:
        Path(sys.argv[3]).write_text(json.dumps([slim(r) for r in lib], ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        print("slim app file:", Path(sys.argv[3]), f"{Path(sys.argv[3]).stat().st_size / 1e6:.2f} MB")


if __name__ == "__main__":
    main()
