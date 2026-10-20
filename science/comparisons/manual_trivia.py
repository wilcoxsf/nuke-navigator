"""Zany trivia, records and San Francisco facts, each with its source.

`reviewed` = the source text itself was read (True) versus only a search-result snippet (False).
Theme: 'weird' for record-book and pop trivia, 'sf' for San Francisco and the Giants.
"""
from __future__ import annotations

from manual_items import FT, MPH, length, speed

OOM_SPEED = "https://en.wikipedia.org/wiki/Orders_of_magnitude_(speed)"
OOM_LEN = "https://en.wikipedia.org/wiki/Orders_of_magnitude_(length)"
GGB = "https://www.goldengate.org/bridge/history-research/statistics-data/design-construction-stats/"


def sp_ms(id_, name, ms, theme, src, url, evidence, reviewed, note=""):
    return dict(id=id_, name=name, kind="speed", value_si=ms, category=theme + "-trivia", theme=theme,
                source_label=src, source_url=url, evidence=evidence, reviewed=reviewed, note=note)


def len_m(id_, name, m, theme, src, url, evidence, reviewed, note=""):
    return dict(id=id_, name=name, kind="length", value_si=m, category=theme + "-trivia", theme=theme,
                source_label=src, source_url=url, evidence=evidence, reviewed=reviewed, note=note)


ITEMS: list[dict] = []

# ---- Wikipedia: Orders of magnitude (speed), page read, values in m/s as listed ----
S = "Wikipedia: Orders of magnitude (speed)"
for id_, name, ms, note in [
    ("oom-snail-record", "The world-record snail race pace", 0.00275, "listed as 'Fastest snail (Congham, UK)'"),
    ("oom-cassette", "A compact cassette tape moving past the head", 0.0476, "tape transport speed"),
    ("oom-sloth", "A sloth at top speed", 0.080, ""),
    ("oom-walk", "An average human walking", 1.25, "page lists 1 to 1.5 m/s"),
    ("oom-cd", "A CD being scanned", 1.2, "typical disc scan speed"),
    ("oom-marathon-pace", "The marathon world record pace", 5.78, "average pace"),
    ("oom-bolt-avg", "Usain Bolt's 2009 100 m world record (average)", 10.438, "Berlin record run"),
    ("oom-bolt-top", "Usain Bolt at his peak, 2009", 12.42, "peak speed in the same race"),
    ("oom-greyhound", "A racing greyhound or Thoroughbred", 17, "typical racing speed"),
    ("oom-nerve-slow", "A nerve signal in an unmyelinated sensory neuron", 25, "page lists 5 to 25 m/s"),
    ("oom-hpv", "The human-powered vehicle land speed record", 40.05, ""),
    ("oom-freefall", "A human in face-down free fall", 54, "maximum free-fall speed"),
    ("oom-formula-rossa", "Formula Rossa, a roller coaster", 67, "top speed"),
    ("oom-golf-ball", "The fastest golf ball ever recorded", 91, "page: fastest recorded ball in sports"),
    ("oom-motogp", "A MotoGP motorcycle at its record speed", 100.67, ""),
    ("oom-shkval", "The VA-111 Shkval supercavitating torpedo", 103, ""),
    ("oom-f1", "A Formula One car at its recorded top speed (2005)", 103.5, ""),
    ("oom-gust", "The fastest non-tornadic wind gust on record", 113, "record gust in a tropical cyclone"),
    ("oom-nerve-fast", "A nerve signal in a mammalian motor neuron", 120, ""),
    ("oom-agera", "A Koenigsegg Agera RS", 124.219, "former fastest production car"),
    ("oom-tornado", "The strongest tornado wind ever recorded", 143, "page lists 126 to 143 m/s"),
    ("oom-dragster", "A Top Fuel dragster at its top speed", 150.6, ""),
    ("oom-crossbow", "The fastest crossbow arrow", 154, ""),
    ("oom-shuttlecock", "The fastest badminton smash", 156.9, "fastest recorded shuttlecock"),
    ("oom-tgv-test", "The 2007 TGV test train", 159.7, "test run top speed"),
    ("oom-maglev", "The JR-Maglev (2003)", 161, "maglev top speed"),
    ("oom-airliner", "A jet airliner at cruising speed", 250, "typical cruise, e.g. an Airbus A380"),
    ("oom-me163", "The Me 163B rocket fighter", 314, "fastest WWII-era aircraft per the page"),
    ("oom-22lr", "A .22 LR rifle bullet", 320, "typical"),
    ("oom-sound", "The speed of sound in air", 340.3, "sea level, 15 C"),
    ("oom-baumgartner", "Felix Baumgartner in free fall", 373, "sources differ: another page says 380 m/s"),
    ("oom-x1", "The Bell X-1 rocket plane", 428, ""),
    ("oom-earth-spin", "Earth's rotation at the equator", 464, "surface speed"),
    ("oom-concorde", "The Concorde", 603, ""),
    ("oom-sr71", "The SR-71 Blackbird", 981, "fastest jet-engine aircraft"),
    ("oom-moon-orbit", "The Moon's mean orbital speed around Earth", 1022, ""),
    ("oom-x15", "The North American X-15", 2019, "rocket plane"),
    ("oom-rocket-sled", "The fastest rocket sled", 2885, ""),
    ("oom-iss", "The International Space Station", 7700, "typical low Earth orbit speed"),
    ("oom-apollo10", "Apollo 10 (crewed speed record)", 11107, ""),
    ("oom-escape-earth", "Earth's escape velocity", 11200, "speed needed to leave Earth's gravity"),
    ("oom-voyager1", "Voyager 1 relative to the Sun", 17000, ""),
    ("oom-earth-orbit", "Earth's orbital speed around the Sun", 29800, ""),
    ("oom-galileo", "The Galileo probe entering Jupiter's atmosphere", 47800, "fastest controlled atmospheric entry"),
    ("oom-helios2", "The Helios 2 solar probe", 70220, ""),
]:
    ITEMS.append(sp_ms(id_, name, ms, "weird", S, OOM_SPEED, "wikipedia-list", True, note))

# ---- Wikipedia: Orders of magnitude (length), page partly read ----
L = "Wikipedia: Orders of magnitude (length)"
for id_, name, m, note in [
    ("oomlen-wadlow", "Robert Wadlow, the tallest known human", 2.72, ""),
    ("oomlen-routemaster", "A London Routemaster bus", 8.38, "length of the bus"),
    ("oomlen-blue-whale", "The longest known blue whale", 33, "longest known individual"),
    ("oomlen-niagara", "Niagara Falls (height)", 52, ""),
    ("oomlen-football", "A football (soccer) pitch", 105, "typical"),
    ("oomlen-pyramid", "The Great Pyramid of Giza (height today)", 137, "original height 147 m"),
    ("oomlen-eiffel", "The Eiffel Tower", 300, ""),
    ("oomlen-angel", "Angel Falls (free-falling drop)", 979, "highest free-falling waterfall"),
    ("oomlen-3gorges", "The Three Gorges Dam", 2300, "length"),
    ("oomlen-everest", "Mount Everest (height)", 8848, ""),
    ("oomlen-lhc", "The Large Hadron Collider (circumference)", 27000, ""),
    ("oomlen-marathon", "A marathon", 42195, ""),
    ("oomlen-suez", "The Suez Canal", 163000, ""),
]:
    ITEMS.append(len_m(id_, name, m, "weird", L, OOM_LEN, "wikipedia-list", True, note))

# ---- record-book and pop trivia (search-result snippets unless noted) ----
G = "Guinness World Records (via search result)"
ITEMS += [
    len_m("rec-hot-dog", "The world's longest hot dog", 203.80, "weird", G,
          "https://www.guinnessworldrecords.com/world-records/longest-hot-dog", "guinness-via-search", False,
          "Novex S.A., Paraguay, 15 July 2011, cut into 2,000 portions; a disputed 717 ft German claim is not listed by Guinness"),
    len_m("rec-hot-dog-line", "The world's longest line of hot dogs", 950 * FT, "weird", "Nathan's Famous 2016 record (news via search)",
          "https://ny1.com/nyc/all-boroughs/news/2016/09/2/nathans-famous-sets-record-for-world-s-longest-line-of-hot-dogs",
          "news-via-search", False, "more than 1,916 franks, more than 950 ft"),
    len_m("rec-baguette", "The world's longest baguette", 140.53, "weird", "News via search: French bakers, Suresnes, May 2024",
          "https://www.mvariety.com/?p=26072", "news-via-search", False, "beat Italy's 132.62 m baguette from 2019"),
    len_m("rec-pizza", "The world's longest pizza", 1595.4, "weird", "PMQ Pizza Magazine via search",
          "https://www.pmq.com/guinness-record-the-longest-pizza/", "news-via-search", False, "Milan Expo 2015, 1.5954 km"),
    len_m("rec-punkin", "The farthest a pumpkin has ever been launched", 5545.42 * FT, "weird", "Power & Motion via search",
          "https://www.powermotiontech.com/news/pneumatic-cannon-flies-pumpkins-record-distances", "news-via-search", False,
          "Big Ten Inch air cannon, Moab, Utah, 9 Sept 2010; sources give 5,545.2 to 5,545.43 ft"),
    len_m("rec-paper-plane", "The longest paper airplane flight", 88.318, "weird", "AIAA via search (Guinness record)",
          "https://aiaa.org/2023/04/17/boeing-engineers-break-world-record-for-longest-paper-airplane-flight/", "news-via-search", False,
          "Boeing engineers, 2023; beat 77.134 m from South Korea in 2022"),
    sp_ms("rec-snail", "The fastest land snail ever timed", 0.00233, "weird", G,
          "https://www.guinnessworldrecords.com/world-records/76273-fastest-snail-land-snail", "guinness-via-search", False,
          "Verne, Michigan: 31 cm in 2 min 13 s, 0.233 cm/s"),
    speed("rec-sneeze-droplets", "The fastest droplets in a sneeze", 103.6, "weird-trivia", G,
          "https://bodyn14.imascientist.org.uk/question/how-fast-is-a-sneeze/index.html", "guinness-via-search", False,
          "fastest individual particles; the air burst itself is closer to 10 mph in a 2013 study, so this is contested"),
    speed("rec-sofa", "The world's fastest sofa", 92, "weird-trivia", "Gigazine via search (Guinness-certified 2007)",
          "https://gigazine.net/gsc_news/en/20070516_148km_sofa", "news-via-search", False,
          "92 mph (148 km/h); a later Jalopnik story reports 101 mph, so sources differ"),
    speed("rec-office", "The world's fastest office (a roadworthy desk)", 87, "weird-trivia", G,
          "https://guinnessworldrecords.com/world-records/fastest-office", "guinness-via-search", False,
          "87 mph (140 km/h), driven by Edd China in London, 2006"),
    speed("rec-wheelchair", "The fastest wheelchair-style electric mobility vehicle", 66.826, "weird-trivia", G,
          "https://wheelchairtravel.org/new-world-records-fastest-electric-wheelchair-fastest-garbage-bin/", "news-via-search", False,
          "Jason Liversidge, Elvington Airfield, 27 Sept 2020; a custom prototype, listed as fastest electric mobility vehicle"),
    speed("rec-wheelie-bin", "The fastest motorised wheelie bin", 43, "weird-trivia", "News via search",
          "https://www.breakingnews.ie/discover/motorised-wheelie-bin-and-fastest-wheelchair-set-new-world-records-1019334.html",
          "news-via-search", False, "about 43 mph, set the same day as the wheelchair record"),
    speed("rec-pitch", "The fastest pitch ever recorded in a major league game", 105.1, "weird-trivia", "NBC Sports via search",
          "https://www.nbcsports.com/mlb/news/aroldis-chapman-throws-fastest-pitch-ever-recorded", "news-via-search", False,
          "Aroldis Chapman, 24 Sept 2010; some sources give other figures"),
    speed("rec-land-speed", "The land speed record (ThrustSSC)", 763.035, "weird-trivia", "Land speed record pages via search",
          "https://www.topendsports.com/sport/list/land-speed-records.htm", "web-via-search", False,
          "763.035 mph over a one-mile course, October 1997, average of two passes"),
    # ---- San Francisco and the Giants ----
    length("sf-lombard", "The crooked block of Lombard Street", 600, "sf-trivia", "Wikipedia: Lombard Street (via search)",
           "https://en.wikipedia.org/wiki/Lombard_Street_(San_Francisco)", "wikipedia-snippet", False,
           "about 600 ft with eight sharp turns; straight-line distance 412.5 ft"),
    length("sf-ggb-span", "The Golden Gate Bridge's main span", 4200, "sf-trivia", "Golden Gate Bridge district (via search)", GGB,
           "official-via-search", False, "between the two towers"),
    length("sf-ggb-tower", "A Golden Gate Bridge tower", 746, "sf-trivia", "Golden Gate Bridge district (via search)", GGB,
           "official-via-search", False, "height above the water"),
    length("sf-ggb-cable", "One Golden Gate Bridge main cable", 7650, "sf-trivia", "Golden Gate Bridge district (via search)", GGB,
           "official-via-search", False, "each of the two main cables"),
    length("sf-ggb-wire", "All the wire in the Golden Gate Bridge's main cables", 80000 * 5280, "sf-trivia",
           "Golden Gate Bridge district (via search)", "https://goldengate.org/exhibits/cross-section-of-a-main-cable",
           "official-via-search", False, "80,000 miles of galvanized steel wire in total"),
    length("sf-oracle-rf-line", "Oracle Park's right-field foul pole", 309, "sf-trivia", "Wikipedia: Oracle Park (via search)",
           "https://en.wikipedia.org/wiki/Oracle_Park", "wikipedia-snippet", False, "309 ft down the line"),
    length("sf-oracle-rcf", "Oracle Park's right-center field (Triples Alley)", 415, "sf-trivia", "Wikipedia: Oracle Park (via search)",
           "https://en.wikipedia.org/wiki/Oracle_Park", "wikipedia-snippet", False,
           "415 ft since the 2020 renovation; older sources still say 421 ft"),
]
