"""Giants home games at Oracle Park for WALLOP WITNESS (1 Nov 2026, Andrew: wins, losses, the margin, THE JINX, extra innings, walk-offs, hours at Oracle).
Official MLB Stats API schedule, one call per regular season (2023 to 2026: at most 4 calls), identified User-Agent, 2 s apart, stops on any 401/403/429.
Regular season only (gameType R): the 2026 postseason stays untouched. Game length needs one call per game (about 320); that is off unless --durations is given,
and Andrew has not OK'd it yet, so duration stays null.
Output: apps/web/public/giants_games.json (git-ignored with the other derived files): {"meta": {...}, "games": [...]} one row per completed home game:
  d (local date YYYY-MM-DD), pk (gamePk), opp (abbreviation), sf / opp_r (runs), win, margin (Giants minus opponent), inn (innings), extra, walkoff,
  start (first pitch, UTC ISO), dh (doubleheader game number, 0 when not a doubleheader), mins (game length in minutes, null without --durations)
Usage: py science/pull_giants_games.py [--durations]"""
import json
import sys
import time
import urllib.error
import urllib.request

ROOT = "C:/Users/andrewwi/dev/nuke-navigator-new/"
UA = {"User-Agent": "nuke-navigator-research/0.1 (personal project)"}
SF, ORACLE = 137, 2395
SEASONS = [2023, 2024, 2025, 2026]
calls = 0


def get(url):
    global calls
    if calls:
        time.sleep(2)
    calls += 1
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        if e.code in (401, 403, 429):
            print("stopped on HTTP", e.code, flush=True)
            sys.exit(1)
        raise


def walkoff(ls, win):
    """The Giants won in the bottom of the last inning: they were not ahead going into it, and they batted in it."""
    inns = ls.get("innings") or []
    if not win or not inns:
        return False
    last = inns[-1]
    if (last.get("home") or {}).get("runs") is None:
        return False  # the bottom of the last inning was never played: they were already ahead
    home_before = sum((i.get("home") or {}).get("runs") or 0 for i in inns[:-1])
    away_all = sum((i.get("away") or {}).get("runs") or 0 for i in inns)
    return home_before <= away_all


def minutes(pk):
    """Game length from the boxscore's info lines ('T: 2:41'), one call per game (only with --durations)."""
    j = get(f"https://statsapi.mlb.com/api/v1/game/{pk}/boxscore")
    for row in j.get("info") or []:
        if row.get("label") == "T":
            v = row.get("value", "").split(" ")[0].rstrip(".")
            try:
                h, m = v.split(":")
                return int(h) * 60 + int(m)
            except ValueError:
                return None
    return None


def main():
    durations = "--durations" in sys.argv
    games = []
    for season in SEASONS:
        url = (f"https://statsapi.mlb.com/api/v1/schedule?sportId=1&teamId={SF}&season={season}&gameType=R"
               "&hydrate=linescore,decisions,team")
        j = get(url)
        n = 0
        for day in j.get("dates", []):
            for g in day.get("games", []):
                home, away = g["teams"]["home"], g["teams"]["away"]
                if home["team"]["id"] != SF or (g.get("venue") or {}).get("id") != ORACLE:
                    continue
                if (g.get("status") or {}).get("codedGameState") != "F" or g.get("gameType") != "R":
                    continue  # final regular-season games only
                ls = g.get("linescore") or {}
                sf, opp = home.get("score"), away.get("score")
                if sf is None or opp is None:
                    continue
                win = sf > opp
                inn = len(ls.get("innings") or []) or ls.get("currentInning") or 9
                games.append({
                    "d": g.get("officialDate") or day["date"], "pk": g["gamePk"],
                    "opp": away["team"].get("abbreviation") or away["team"].get("name"),
                    "sf": sf, "opp_r": opp, "win": win, "margin": sf - opp, "inn": inn, "extra": inn > 9,
                    "walkoff": walkoff(ls, win), "start": g.get("gameDate"),
                    "dh": g.get("gameNumber", 1) if g.get("doubleHeader") in ("Y", "S") else 0, "mins": None,
                })
                n += 1
        print(season, "home games at Oracle:", n, flush=True)
    if durations:
        for g in games:
            g["mins"] = minutes(g["pk"])
    games.sort(key=lambda g: (g["d"], g["dh"]))
    out = {"meta": {"built": time.strftime("%Y-%m-%d"), "source": "MLB Stats API schedule (statsapi.mlb.com), regular season, Giants home games at Oracle Park",
                    "seasons": SEASONS, "calls": calls, "durations": durations}, "games": games}
    json.dump(out, open(ROOT + "apps/web/public/giants_games.json", "w", encoding="utf-8"), separators=(",", ":"))
    w = sum(g["win"] for g in games)
    print("games", len(games), "wins", w, "extra", sum(g["extra"] for g in games), "walk-offs", sum(g["walkoff"] for g in games), "calls", calls)


if __name__ == "__main__":
    main()
