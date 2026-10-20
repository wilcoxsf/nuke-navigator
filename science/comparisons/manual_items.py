"""Hand-curated comparison items with explicit sources.

`reviewed` means the source text (not just a search snippet) was read for that number.
Speeds: mph in, metres per second out. Lengths: feet in, metres out.
"""
from __future__ import annotations

import math

MPH = 0.44704
FT = 0.3048
FAST = "https://en.wikipedia.org/wiki/Fastest_animals"


def speed(id_, name, mph, cat, src, url, evidence, reviewed, note=""):
    return dict(id=id_, name=name, kind="speed", value_si=round(mph * MPH, 4), category=cat,
                source_label=src, source_url=url, evidence=evidence, reviewed=reviewed, note=note)


def length(id_, name, ft, cat, src, url, evidence, reviewed, note=""):
    return dict(id=id_, name=name, kind="length", value_si=round(ft * FT, 4), category=cat,
                source_label=src, source_url=url, evidence=evidence, reviewed=reviewed, note=note)


def terminal_velocity(mass_kg, cd_a_m2, rho=1.225, g=9.81):
    return math.sqrt(2 * mass_kg * g / (rho * cd_a_m2))


ITEMS: list[dict] = []

# ---- animals: Wikipedia "Fastest animals" (page read; each number is as listed there, high end of any range) ----
# (name, mph, medium, note)
ANIMALS = [
    ("Peregrine falcon (diving)", 242, "air", "in dive"),
    ("Golden eagle (diving)", 200, "air", "in dive; page lists 150-200 mph"),
    ("Gyrfalcon (diving)", 130, "air", "in dive"),
    ("White-throated needletail swift", 105, "air", "flapping flight"),
    ("Eurasian hobby", 100, "air", ""),
    ("Mexican free-tailed bat", 99, "air", ""),
    ("Frigatebird", 95, "air", ""),
    ("Pigeon (rock dove)", 92.5, "air", ""),
    ("Spur-winged goose", 88, "air", ""),
    ("Black marlin", 80, "water", "disputed; line-stripping reel record"),
    ("Grey-headed albatross", 79, "air", "sustained on tailwinds"),
    ("Cheetah", 75, "land", "page lists 68-75 mph; highest reliable figure 65 mph"),
    ("Sailfish", 67.85, "water", "includes leaps out of water; disputed"),
    ("Anna's hummingbird", 61.06, "air", ""),
    ("Swordfish", 60, "water", "disputed"),
    ("Ostrich", 60, "land", "page lists 38-60 mph; highest reliably measured 38 mph"),
    ("Pronghorn", 60, "land", "short bursts"),
    ("Springbok", 55, "land", ""),
    ("Quarter Horse", 55, "land", "sprint"),
    ("Thomson's gazelle", 55.92, "land", ""),
    ("Blue wildebeest", 50, "land", "estimated from a vehicle odometer"),
    ("Yellowfin tuna", 47, "water", "disputed"),
    ("Shortfin mako shark", 45, "water", "reliably clocked at 31 mph"),
    ("Blackbuck", 50, "land", "sustained over 1.5 km"),
    ("Hare", 50, "land", "about 20 m"),
    ("Impala", 50, "land", "odometer estimate"),
    ("Lion", 37, "land", "GPS data shows up to 46 mph in a few hunts"),
    ("Jackrabbit", 45, "land", ""),
    ("African wild dog", 44, "land", ""),
    ("Kangaroo", 44, "land", "sustained 25 mph for nearly 2 km"),
    ("Greyhound", 43, "land", "fastest dog breed"),
    ("Zebra", 43, "land", ""),
    ("Coyote", 43, "land", "short distances"),
    ("Thoroughbred racehorse", 54.99, "land", "record"),
    ("Big brown bat", 40, "air", ""),
    ("Tiger", 40, "land", "short bursts"),
    ("Hyena", 37, "land", ""),
    ("Giraffe", 37, "land", "odometer estimate"),
    ("Orca (killer whale)", 35, "water", "fastest marine mammal on the page's list"),
    ("Grizzly / black bear", 35, "land", "30 mph reliably recorded for grizzlies"),
    ("Black rhinoceros", 34, "land", ""),
    ("Sei whale", 34, "water", "short distances"),
    ("Warthog", 34, "land", "odometer estimate"),
    ("Fin whale", 31, "water", "bursts; maximum measured 25 mph"),
    ("Blue whale", 30, "water", "page lists 17-30 mph; racing mode about 17 mph"),
    ("Human sprinter (peak of a 100 m sprint)", 27.56, "land", "instantaneous peak in a 100 m sprint"),
    ("Pilot whale", 25, "water", ""),
    ("Pantropical spotted dolphin", 25, "water", ""),
    ("Great white shark", 14.99, "water", "sprint"),
    ("Leatherback sea turtle", 21.92, "water", ""),
    ("Common dolphin", 23, "water", ""),
    ("Bottlenose dolphin", 22, "water", "bursts only"),
    ("Sperm whale", 22, "water", ""),
    ("Humpback whale", 17, "water", "when threatened"),
    ("Asian elephant", 16, "land", ""),
    ("African elephant", 13, "land", "one elephant being chased"),
    ("Komodo dragon", 12, "land", "brief bursts"),
    ("Black mamba", 14, "land", ""),
    ("Green iguana", 22, "land", ""),
    ("Roadrunner", 27, "land", "page lists 20-27 mph"),
    ("Emu", 31, "land", "page lists 29-31 mph"),
    ("Cassowary", 31, "land", "page lists 29-31 mph"),
    ("Raccoon", 14.9, "land", "short distances"),
    ("Hippopotamus", 19, "land", "unconfirmed"),
    ("Tiger beetle", 4.2, "land", "171 body lengths per second"),
    ("Dragonfly (Austrophlebia costalis)", 61.3, "air", "fastest verified insect flight"),
    ("Squid (leaping)", 22, "water", "brief gliding out of water"),
    ("Bowhead whale", 14.1, "water", "satellite or GPS measured"),
    ("Right whale", 5.8, "water", ""),
]
for n, mph, med, note in ANIMALS:
    ITEMS.append(speed("animal-" + "".join(c if c.isalnum() else "-" for c in n.lower()).strip("-"), n, mph, "animal-" + med,
                       "Wikipedia: Fastest animals", FAST, "wikipedia-list", True,
                       (note + "; " if note else "") + "medium assigned by Claude where the page did not state one"))

ITEMS += [
    speed("animal-california-sea-lion", "a California sea lion swimming", 6.7, "animal-water", "Wikipedia: California sea lion (Locomotion)",
          "https://en.wikipedia.org/wiki/California_sea_lion", "wikipedia-article", True,
          "page: 'may travel at speeds of around 10.8 km/h (6.7 mph)'; not labeled cruising or maximum"),
    length("animal-harbor-seal-length", "an adult harbor seal", 6.1, "animal-size", "Wikipedia: Harbor seal",
           "https://en.wikipedia.org/wiki/Harbor_seal", "wikipedia-article", True, "page: up to 1.85 m (6.1 ft)"),
    length("animal-sea-lion-male-length", "a big male California sea lion", 8.9, "animal-size", "Wikipedia: California sea lion",
           "https://en.wikipedia.org/wiki/California_sea_lion", "wikipedia-article", True, "page: males up to 2.5-2.7 m (8.2-8.9 ft)"),
    # terminal velocity examples, Wikipedia: Terminal velocity (page read)
    speed("fall-skydiver-belly", "a skydiver falling belly-down", 55 / MPH, "terminal-velocity", "Wikipedia: Terminal velocity",
          "https://en.wikipedia.org/wiki/Terminal_velocity", "wikipedia-article", True, "page: about 55 m/s (180 ft/s) in free fall"),
    speed("fall-srb-parachute", "a Space Shuttle booster when its parachutes open", 220, "terminal-velocity",
          "Wikipedia: Terminal velocity", "https://en.wikipedia.org/wiki/Terminal_velocity", "wikipedia-article", True,
          "page: 220 mph when parachutes deploy"),
    # San Francisco transit
    speed("sf-cable-car", "a San Francisco cable car", 9.5, "sf-transit", "AP 2019 quoting SFMTA; Frommer's explains the constant cable speed",
          "https://www.frommers.com/destinations/san-francisco/attractions/cable-cars", "news-via-search", False,
          "no SFMTA page found stating the speed; confirm before shipping"),
    speed("sf-bart-max", "a BART train at its official maximum", 80, "sf-transit", "BART fact sheet",
          "https://www.bart.gov/sites/default/files/docs/2015%20Fact%20Sheet.pdf", "official-factsheet-via-search", False,
          "fact sheet lists 80 mph maximum; normal service tops out around 70 mph per a railfan guide"),
    length("sf-muni-bus-40", "a Muni 40-foot bus", 40, "sf-transit", "Wikipedia: San Francisco Municipal Railway fleet",
           "https://en.wikipedia.org/wiki/San_Francisco_Municipal_Railway_fleet", "wikipedia-snippet", False,
           "fleet tables list 40-foot (12 m) buses; fetch the page to confirm"),
    length("sf-muni-bus-60", "a Muni 60-foot articulated bus", 60, "sf-transit", "Wikipedia: San Francisco Municipal Railway fleet",
           "https://en.wikipedia.org/wiki/San_Francisco_Municipal_Railway_fleet", "wikipedia-snippet", False,
           "fleet tables list 60-foot (18 m) articulated buses; fetch the page to confirm"),
]

# ---- computed estimates (clearly labeled; assumptions in the note) ----
for key, name, mass, cda, note in [
    ("harbor-seal", "a harbor seal in free fall", 100, 0.35, "assumes 100 kg, drag area 0.35 m2"),
    ("sea-lion", "a big California sea lion in free fall", 350, 0.60, "assumes 350 kg male, drag area 0.60 m2"),
]:
    v = terminal_velocity(mass, cda)
    ITEMS.append(dict(id=f"computed-fall-{key}", name=name, kind="speed", value_si=round(v, 3), category="computed",
                      source_label="v = sqrt(2 m g / (rho Cd A)), rho 1.225 kg/m3", source_url="", evidence="computed-estimate",
                      reviewed=True, note=note + "; roughly +/-30%, for fun, not a measurement"))
