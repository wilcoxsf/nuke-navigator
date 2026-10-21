"""Clean the ray-cast Oracle Park fence profile into the table the web page uses.

Distances: drop points that disagree with a 5-degree running median by more than 15 ft (stands behind the wall, bullpen openings), interpolate the
gaps, smooth with a 5-point median. Heights: the raw heights are contaminated where stands rise directly behind the wall, so they follow the
measured pattern in blocks: left field to left-center 9.4 ft, center 8.4 ft, right-center 8.0 ft (NOT measured cleanly, assumed), a short
taper, then the 26.1 ft right-field brick wall (the park's 25 ft wall plus its cap). The model era is ambiguous (center field extracts at
about 395 ft, between the current 391 and the pre-2020 399).

Usage: python wall_clean.py data/derived/oracle/oracle_wall_profile.csv data/derived/oracle/oracle_wall_clean.csv apps/web/public/oracle_wall.json
"""
import json
import sys

import numpy as np
import pandas as pd

d = pd.read_csv(sys.argv[1])
b = np.arange(-47, 48)
dist = d.set_index("bearing_deg").wall_ft.reindex(b)
med = dist.rolling(5, center=True, min_periods=2).median()
dist = dist.where((dist - med).abs() <= 15)
dist = dist.interpolate(limit_direction="both").rolling(5, center=True, min_periods=1).median()
# right-center: the extraction picks up the stands behind the wall; cap at the deepest published distance (415 now, 421 before 2020)
dist = pd.Series(np.where((b >= 4) & (b <= 21), np.minimum(dist, 421.0), dist), index=b)
h = np.where(b <= -10, 9.4, np.where(b <= 3, 8.4, np.where(b <= 21, 8.0, np.where(b <= 23, 21.0, 26.1))))
conf = np.where((b >= 4) & (b <= 21), "low (right-center height assumed)", np.where(np.abs(b) >= 46, "low (foul pole)", "ok"))
out = pd.DataFrame({"bearing_deg": b, "wall_ft": dist.round(1).to_numpy(), "height_ft": h, "confidence": conf})
out.to_csv(sys.argv[2], index=False)
json.dump({"bearing_deg": b.tolist(), "wall_ft": out.wall_ft.tolist(), "height_ft": out.height_ft.tolist(), "home": {"x": 0.3, "z": 1.0},
           "note": "Extracted from the park model by ray casting; right-center height assumed; model era ambiguous."}, open(sys.argv[3], "w"))
print(out[out.bearing_deg % 6 == 0].to_string(index=False))
