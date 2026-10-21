"""One-request probe: does the MLB StatsAPI schedule carry per-game weather (condition, temp, wind relative to the field)?

Usage: python probe_schedule_weather.py <team_id> <start> <end>
"""
from __future__ import annotations

import sys

import requests

UA = "nuke-navigator-research/0.1 (personal project)"


def main() -> None:
    team, start, end = sys.argv[1:4]
    r = requests.get("https://statsapi.mlb.com/api/v1/schedule",
                     params={"sportId": 1, "teamId": team, "startDate": start, "endDate": end, "hydrate": "weather", "gameType": "R"},
                     headers={"User-Agent": UA}, timeout=90)
    if r.status_code != 200:
        raise SystemExit(f"HTTP {r.status_code}: stopping")
    games = [g for d in r.json().get("dates", []) for g in d["games"]]
    print(len(games), "games")
    have = [g for g in games if g.get("weather")]
    print(len(have), "with weather")
    for g in have[:12]:
        print(g["gamePk"], g["officialDate"], g["venue"]["name"], g["weather"])


if __name__ == "__main__":
    main()
