"""Heights (and bat side) for every batter in the Study 25 replay, for the stand-in pixel slugger (29 Oct, Andrew: get the height and handedness right).
Official MLB Stats API, people endpoint with up to 100 ids per call (3 calls for the replay's batters), identified User-Agent, 2 s apart, stops on any 401/403/429.
Output: apps/web/public/batter_bio.json {id: {h: inches, bats: 'R'|'L'|'S'}} (git-ignored with the other derived files). Usage: py science/pull_batter_bio.py"""
import json
import time
import urllib.error
import urllib.request

ROOT = "C:/Users/andrewwi/dev/nuke-navigator-new/"
UA = {"User-Agent": "nuke-navigator-research/0.1 (personal project)"}
rep = json.load(open(ROOT + "apps/web/public/replay.json", encoding="utf-8"))
ids = sorted({str(b["b"]) for b in rep["balls"]})
out = {}


def inches(s):
    # "6' 2\"" -> 74
    try:
        ft, inch = s.replace('"', "").split("'")
        return int(ft) * 12 + int(inch.strip() or 0)
    except Exception:
        return None


for k in range(0, len(ids), 100):
    chunk = ids[k:k + 100]
    url = "https://statsapi.mlb.com/api/v1/people?personIds=" + ",".join(chunk)
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30) as r:
            j = json.load(r)
    except urllib.error.HTTPError as e:
        print("stopped on HTTP", e.code)
        break
    for p in j.get("people", []):
        out[str(p["id"])] = {"h": inches(p.get("height", "")), "bats": (p.get("batSide") or {}).get("code")}
    print("call", k // 100 + 1, "people", len(j.get("people", [])), flush=True)
    time.sleep(2)
json.dump(out, open(ROOT + "apps/web/public/batter_bio.json", "w"), separators=(",", ":"))
hs = [v["h"] for v in out.values() if v["h"]]
print("batters", len(ids), "with height", len(hs), "range", min(hs), max(hs))
