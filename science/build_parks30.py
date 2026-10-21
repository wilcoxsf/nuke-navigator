"""Builds apps/web/public/parks30.json for the Goner Grid: the 30 current parks with Savant measured fence distance and height at five bearings
(left-field line, left gap, center, right gap, right-field line = -45, -22.5, 0, 22.5, 45 degrees), latest season, plus approximate field elevation in feet
(public figures, rounded; used only for air pressure). The output is git-ignored with the other Savant-derived files and served behind the token gate."""
import csv
import json
import math

SRC = "C:/Users/andrewwi/dev/nuke-navigator-new/data/derived/parks/savant_fence_by_year.csv"
OUT = "C:/Users/andrewwi/dev/nuke-navigator-new/apps/web/public/parks30.json"
# venue_id: (abbreviation, approximate elevation in feet)
PARKS = {
    32: ("MIL", 635), 1: ("LAA", 160), 2889: ("STL", 465), 15: ("ARI", 1090), 3289: ("NYM", 10), 2681: ("PHI", 20), 2394: ("DET", 600), 19: ("COL", 5190),
    2392: ("HOU", 40), 22: ("LAD", 515), 3: ("BOS", 20), 5325: ("TEX", 551), 2602: ("CIN", 490), 7: ("KC", 910), 3309: ("WSH", 10), 2395: ("SF", 10),
    2: ("BAL", 20), 31: ("PIT", 730), 2680: ("SD", 15), 5: ("CLE", 650), 4: ("CWS", 595), 14: ("TOR", 250), 2529: ("ATH", 15), 680: ("SEA", 10),
    3312: ("MIN", 815), 12: ("TB", 40), 4705: ("ATL", 1050), 17: ("CHC", 600), 3313: ("NYY", 55), 4169: ("MIA", 10),
}
PARKS[17] = ("CHC", 600)
latest = {}
for r in csv.DictReader(open(SRC, encoding="utf-8")):
    k = int(r["venue_id"])
    if k in PARKS and (k not in latest or int(r["season"]) > int(latest[k]["season"])):
        latest[k] = r
# Wrigley Field is venue 17 in MLB's id space; the file lists it under its own name, so look it up by name if the id is missing
if 17 not in latest:
    for r in csv.DictReader(open(SRC, encoding="utf-8")):
        if r["venue_name"] == "Wrigley Field" and (17 not in latest or int(r["season"]) > int(latest[17]["season"])):
            latest[17] = r
out = []
for k, (abbr, elev) in PARKS.items():
    r = latest[k]
    hpa = 1013.25 * (1 - 2.25577e-5 * elev * 0.3048) ** 5.25588
    out.append({
        "id": k, "abbr": abbr, "name": r["venue_name"], "season": int(r["season"]), "elev_ft": elev, "hpa": round(hpa, 1),
        "dist": [float(r[c]) for c in ("dist_lf_line", "dist_lf_gap", "dist_cf", "dist_rf_gap", "dist_rf_line")],
        "height": [float(r[c]) for c in ("height_lf_line", "height_lf_gap", "height_cf", "height_rf_gap", "height_rf_line")],
    })
json.dump({"bearings": [-45, -22.5, 0, 22.5, 45], "parks": out}, open(OUT, "w"), separators=(",", ":"))
print(len(out), "parks;", [p["abbr"] for p in out if p["season"] < 2026])
