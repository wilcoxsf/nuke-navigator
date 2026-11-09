"""The wall each park had in each season (9 Nov 2026), for DEJA-VU's away-wall line: an away home run shows the wall of the park it was really hit in, as it
stood that season. From Savant's measured dimensions (data/derived/parks/savant_fence_by_year.csv: fence distance and height at five bearings per park-season),
keyed "TEAM:YEAR" with the team code the replay balls use. same_as_crest marks a season whose fence matches the current measured crest (public/parks/<TEAM>/
crest.json, 2026) within 3 ft and 2 ft at all five bearings, so the app can use the detailed crest; otherwise it uses these five points.
Written to apps/web/public/fences_by_year.json (MLB-derived: git-ignored, private site only). Usage: python science/build_fences_by_year.py"""
import json

import pandas as pd

ROOT = "C:/Users/andrewwi/dev/nuke-navigator-new/"
P30 = json.load(open(ROOT + "apps/web/public/parks30.json"))
by_id = {p["id"]: p for p in P30["parks"]}
d = pd.read_csv(ROOT + "data/derived/parks/savant_fence_by_year.csv")
d = d[d.season >= 2015]
DC = ["dist_lf_line", "dist_lf_gap", "dist_cf", "dist_rf_gap", "dist_rf_line"]
HC = ["height_lf_line", "height_lf_gap", "height_cf", "height_rf_gap", "height_rf_line"]
# a team that played the whole season somewhere else (the Rays at Steinbrenner Field in 2025, after the storm took Tropicana's roof); older one-off homes stay out
FORCE = {"TB:2025": "George M. Steinbrenner Field"}
OLD = {"George M. Steinbrenner Field": "TB", "Oakland Coliseum": "ATH", "O.co Coliseum": "ATH", "Ring Central Coliseum": "ATH", "RingCentral Coliseum": "ATH"}
out, miss = {}, set()
for _, r in d.iterrows():
    p = by_id.get(int(r.venue_id))
    abbr = p["abbr"] if p else OLD.get(r.venue_name) or next((v for k, v in OLD.items() if "Coliseum" in r.venue_name and "Oakland" in r.venue_name), None)
    if abbr is None:
        miss.add(r.venue_name); continue
    dist = [round(float(r[c]), 1) for c in DC]; hgt = [round(float(r[c]), 2) for c in HC]
    same = bool(p) and all(abs(a - b) <= 3 for a, b in zip(dist, p["dist"])) and all(abs(a - b) <= 2 for a, b in zip(hgt, p["height"]))
    key = f"{abbr}:{int(r.season)}"
    if key in FORCE and FORCE[key] != r.venue_name: continue
    if r.venue_name in FORCE.values() and FORCE.get(key) != r.venue_name: continue
    if key in out and out[key]["venue"] != r.venue_name and not p and key not in FORCE:
        continue  # (a current park wins over an old one under the same team code)
    out[key] = {"venue": r.venue_name, "dist": dist, "height": hgt, "same_as_crest": same}
json.dump({"bearings": P30["bearings"], "fences": out}, open(ROOT + "apps/web/public/fences_by_year.json", "w"), separators=(",", ":"))
diff = sorted(k for k, v in out.items() if not v["same_as_crest"] and int(k.split(":")[1]) >= 2023)
print("wrote", len(out), "park-seasons; 2023+ seasons that differ from the current crest:", diff, "; venues without a team:", sorted(miss))
