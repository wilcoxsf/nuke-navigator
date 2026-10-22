"""Why do Boston and Oakland/Sacramento disagree with Savant's per-park would-be-HR counts? Print the fence data parks30.json holds for those parks and the 2025 players' park totals
with the Boston wall height forced to the Green Monster profile (37.2 ft from the left-field line to about 30 degrees of bearing, then 17 ft to center) as a test of the
'five bearings smooth away short tall walls' guess. Reuses savant_xhr_compare2 pieces but only re-flies the candidates once, for Boston with the override."""
import json

import numpy as np
import pandas as pd

from flight_fit import FT, MPH, RPM
from savant_xhr_compare import ROOT, SAV, clears, fly_path

parks = json.load(open(ROOT + "apps/web/public/parks30.json"))
B = np.array(parks["bearings"])
for p in parks["parks"]:
    if p["abbr"] in ("BOS", "ATH", "OAK", "SF", "TEX", "KC"):
        print(p["abbr"], p["name"], "season", p["season"], "dist", p["dist"], "height", [round(h, 1) for h in p["height"]], "hpa", p["hpa"])

fe = pd.read_csv(ROOT + "data/derived/parks/savant_fence_by_year.csv")
print(fe.columns.tolist())
print(fe[fe.iloc[:, 0:3].astype(str).apply(lambda r: any(k in " ".join(r) for k in ("Fenway", "Sutter", "Coliseum", "Oakland")), axis=1)].tail(12).to_string()[:2500])
