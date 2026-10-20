"""Wave 4: baseball extremes, animal mechanics that break physics, farthest human feats, cosmic speeds, moon golf.

All from search-result snippets unless noted; `reviewed` is False for those. Each keeps its source URL.
"""
from __future__ import annotations

from manual_items import FT, MPH
from manual_trivia2 import L, S

G = "Guinness World Records (via search result)"
ITEMS: list[dict] = [
    # ---- baseball and sport extremes ----
    S("x-hardest-hit", "the hardest-hit ball in the Statcast era (Oneil Cruz's 122.9 mph home run, 2025)", 122.9 * MPH, "weird", G,
      "https://www.guinnessworldrecords.com/world-records/733053-hardest-hit-ball-in-mlb-history", "guinness-via-search", False,
      "May 25, 2025; projected 432 ft. Stanton's 121.7 mph homer in 2018 was the hardest before it"),
    S("x-tennis-serve", "the fastest recorded tennis serve (Sam Groth, 163.7 mph)", 163.7 * MPH, "weird", "Wikipedia: Fastest recorded tennis serves (via search)",
      "https://en.wikipedia.org/wiki/Fastest_recorded_tennis_serves", "wikipedia-snippet", False,
      "Challenger event, not an official ATP record because the radar was not calibrated"),
    L("x-baseball-throw", "the longest baseball throw ever recorded (Glen Gorbous, 1957)", 135.88, "weird", G,
      "https://www.guinnessworldrecords.com/world-records/64701-longest-baseball-throw-male", "guinness-via-search", False,
      "445 ft 10 in; Don Grate claims 445 ft 1 in from 1956"),
    L("x-disc-throw", "the farthest disc throw ever (David Wiggins Jr., 2016)", 338, "weird", "Ultiworld / WFDF via search",
      "https://ultiworld.com/2016/03/30/feeling-distance-record-no-need/", "web-via-search", False,
      "1,108.9 ft, thrown with a 20 to 40 mph tailwind"),
    L("x-moon-golf-measured", "Alan Shepard's second golf shot on the Moon (measured from photos in 2021)", 40 * 0.9144, "weird",
      "USGA / Astronomy.com via search", "https://www.usga.org/content/usga/home-page/articles/2021/02/shepard-moon-club-50th-anniversary-usga-museum.html",
      "web-via-search", False, "40 yards; the first ball went 24 yards"),
    L("x-moon-golf-claimed", "how far Alan Shepard said his moon golf shot went", 200 * 0.9144, "weird",
      "USGA via search", "https://www.usga.org/content/usga/home-page/articles/2021/02/shepard-moon-club-50th-anniversary-usga-museum.html",
      "web-via-search", False, "200 yards, later called a light-hearted exaggeration ('miles and miles and miles')"),
    # ---- animal mechanics ----
    S("x-dracula-ant", "a Dracula ant's jaw snap", 90, "weird", "Royal Society Open Science 2018 / Guinness via search",
      "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6304126/", "paper-via-search", False,
      "peak mandible speed about 90 m/s in roughly 23 microseconds; fastest self-powered animal strike"),
    S("x-trap-jaw-ant", "a trap-jaw ant's jaw snap", 64, "weird", "Search results on the 2006 study",
      "https://www.nationalgeographic.com/animals/article/dracula-ant-fastest-animal-quickest-strike-on-record", "web-via-search", False,
      "35 to 64 m/s; the record holder before the Dracula ant"),
    L("x-cobra-spit", "how far a spitting cobra can spit venom", 6.5 * FT, "weird", "Nautilus via search", "https://nautil.us/the-animals-that-turn-bodily-fluids-into-weapons-564464/",
      "web-via-search", False, "up to 6.5 ft"),
    # ---- machines and party tricks ----
    S("x-railgun", "the Navy railgun's projectile", 7 * 340.3, "weird", "Discover / CBS News via search",
      "https://www.discovermagazine.com/navys-new-railgun-shoots-at-mach-7-can-hit-targets-100-miles-away-13609", "news-via-search", False,
      "reported as Mach 7, a 23 lb aluminum projectile; one outlet says Mach 7.5"),
    S("x-champagne", "a champagne cork leaving the bottle", 24.8 * MPH, "weird", "Decanter via search",
      "https://www.decanter.com/wine-news/german-scientist-logs-champagne-cork-speed-75173", "web-via-search", False,
      "40 km/h measured at 2.5 bar; a theoretical 100 km/h at 3 bar"),
    # ---- cosmic ----
    S("x-chelyabinsk", "the Chelyabinsk meteor hitting the atmosphere", 19200, "weird", "Wikipedia: Chelyabinsk meteor (via search)",
      "https://en.wikipedia.org/wiki/Chelyabinsk_meteor", "wikipedia-snippet", False, "about 19.2 km/s; early reports of 30 km/s were overestimates"),
    L("x-nanosecond", "the distance light travels in one nanosecond (Grace Hopper's wire)", 0.299792458, "weird", "Smithsonian via search",
      "https://si.edu/es/object/nanoseconds-associated-grace-hopper:nmah_692464", "web-via-search", False,
      "11.8 inches, the length of the wires Hopper handed out", count_ok=True),
]
