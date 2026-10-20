"""Wave 2: fiction canon, space hardware, slow nature, weather, odd vehicles, odd objects, everyday objects.

`reviewed` = the source text itself was read (True) versus a search-result snippet (False).
`dim` says whether a length is a height or a length, for phrasing ("twice the height of ...").
`count_ok` marks tiny things that can be compared by the million ("1.8 million human hairs").
"""
from __future__ import annotations

from manual_items import FT, MPH

YR = 365.25 * 24 * 3600
OOM_LEN = "https://en.wikipedia.org/wiki/Orders_of_magnitude_(length)"
OL = "Wikipedia: Orders of magnitude (length)"


def L(id_, name, m, theme, src, url, evidence, reviewed, note="", dim="length", count_ok=False, article=None):
    r = dict(id=id_, name=name, kind="length", value_si=m, category=theme + "-trivia", theme=theme, source_label=src,
             source_url=url, evidence=evidence, reviewed=reviewed, note=note, dim=dim, count_ok=count_ok)
    if article is not None:
        r["article"] = article
    return r


def S(id_, name, ms, theme, src, url, evidence, reviewed, note="", count_ok=False, article=None):
    r = dict(id=id_, name=name, kind="speed", value_si=ms, category=theme + "-trivia", theme=theme, source_label=src,
             source_url=url, evidence=evidence, reviewed=reviewed, note=note, count_ok=count_ok)
    if article is not None:
        r["article"] = article
    return r


ITEMS: list[dict] = []

# ---- everyday and odd objects: Wikipedia "Orders of magnitude (length)" (page read; values as listed, metres) ----
# (id, name, metres, dim, note, count_ok, article)
for id_, name, m, dim, note, cnt, art in [
    ("ol-hair", "a human hair", 0.000181, "width", "maximum width of a strand", True, ""),
    ("ol-pinhead", "a pinhead", 0.001, "width", "diameter", True, "a"),
    ("ol-flea", "a flea", 0.0015, "length", "average length", True, "a"),
    ("ol-rice", "a grain of rice", 0.005, "width", "as listed on the page", True, ""),
    ("ol-ant", "a red ant", 0.005, "length", "average length", True, ""),
    ("ol-sunflower", "a sunflower seed", 0.0071, "length", "", True, ""),
    ("ol-fingernail", "a human fingernail", 0.01, "width", "", True, ""),
    ("ol-die", "a die", 0.012, "width", "diameter as listed", True, ""),
    ("ol-golf-ball", "a golf ball", 0.043, "width", "minimum diameter", True, ""),
    ("ol-egg", "a chicken egg", 0.05, "width", "usual diameter", True, ""),
    ("ol-rubik", "a Rubik's Cube", 0.055, "width", "edge length", True, ""),
    ("ol-baseball", "a baseball", 0.074, "width", "diameter, 73 to 75 mm", True, ""),
    ("ol-credit-card", "a credit card", 0.0856, "length", "", True, ""),
    ("ol-soda-can", "a soda can", 0.12, "height", "page lists 9 to 12 cm", True, ""),
    ("ol-cd", "a compact disc", 0.12, "width", "diameter", True, ""),
    ("ol-banana", "a banana", 0.19, "length", "", True, ""),
    ("ol-soccer-ball", "a soccer ball", 0.22, "width", "diameter", True, ""),
    ("ol-ruler", "a school ruler", 0.3, "length", "", True, ""),
    ("ol-cat", "a domestic cat", 0.46, "length", "", False, ""),
    ("ol-shopping-cart", "a shopping cart", 0.91, "length", "", False, ""),
    ("ol-pool-noodle", "a pool noodle", 1.4, "length", "", False, ""),
    ("ol-rail-gauge", "standard railway track", 1.435, "width", "track gauge", False, ""),
    ("ol-fridge", "a refrigerator", 1.8, "height", "average height", False, ""),
    ("ol-phone-booth", "a telephone booth", 2.8, "height", "", False, ""),
    ("ol-polar-bear", "a polar bear", 2.5, "length", "largest bear", False, ""),
    ("ol-peel-p50", "the Peel P50, the smallest production car", 1.4, "length", "", False, ""),
    ("ol-bumble-bee", "the Starr Bumble Bee II, the smallest plane", 2.7, "length", "", False, ""),
    ("ol-cross-island", "the Cross Island Chapel, the smallest church", 1.29, "length", "", False, ""),
    ("ol-hippo", "a hippopotamus", 4, "length", "", False, ""),
    ("ol-elephant", "an African bush elephant", 5, "length", "", False, ""),
    ("ol-giraffe", "a giraffe", 5.2, "height", "", False, ""),
    ("ol-anaconda", "a green anaconda", 5.21, "length", "largest snake by mass", False, ""),
    ("ol-saltie", "a saltwater crocodile", 6, "length", "average length of the largest reptile", False, ""),
    ("ol-python", "a reticulated python", 6.5, "length", "longest snake, as listed", False, ""),
    ("ol-maus", "the Panzer VIII Maus, the largest tank", 10.2, "length", "", False, ""),
    ("ol-t-rex", "a Tyrannosaurus", 13, "length", "", False, ""),
    ("ol-giant-squid", "a giant squid", 13, "length", "approximate", False, ""),
    ("ol-sperm-whale", "a sperm whale", 16, "length", "", False, ""),
    ("ol-megalodon", "a megalodon", 17, "length", "average-sized", False, ""),
    ("ol-spinosaurus", "a Spinosaurus", 18, "length", "maximum", False, ""),
    ("ol-obelisk", "the Luxor Obelisk", 23, "height", "", False, "the"),
    ("ol-christ", "Christ the Redeemer", 30, "height", "", False, ""),
    ("ol-argentinosaurus", "an Argentinosaurus", 35, "length", "", False, ""),
    ("ol-bootlace", "a bootlace worm, the longest known animal", 55, "length", "", False, ""),
    ("ol-pisa", "the Leaning Tower of Pisa", 55, "height", "", False, "the"),
    ("ol-shuttle", "the Space Shuttle", 56, "height", "", False, "the"),
    ("ol-taj", "the Taj Mahal", 73, "height", "", False, "the"),
    ("ol-an225", "an Antonov An-225 (wingspan)", 88.4, "wingspan", "", False, ""),
    ("ol-big-ben", "Big Ben", 96, "height", "", False, ""),
    ("ol-saturn-v", "a Saturn V rocket", 110, "height", "", False, ""),
    ("ol-cologne", "Cologne Cathedral", 157, "height", "", False, ""),
    ("ol-arch", "the Gateway Arch", 192, "height", "", False, "the"),
    ("ol-hoover", "the Hoover Dam", 220, "height", "", False, "the"),
    ("ol-hindenburg", "the Hindenburg", 245, "length", "", False, "the"),
    ("ol-carrier", "an aircraft carrier", 300, "length", "", False, ""),
    ("ol-empire", "the Empire State Building", 390, "height", "", False, "the"),
    ("ol-knock-nevis", "the Knock Nevis, the largest supertanker", 458, "length", "", False, "the"),
    ("ol-burj", "the Burj Khalifa", 828, "height", "", False, "the"),
    ("ol-hyperion", "Hyperion, the tallest known sequoia", 115.5, "height", "", False, ""),
    ("ol-general-sherman", "the General Sherman tree", 84, "height", "", False, "the"),
    ("ol-football-field", "an American football field", 91, "length", "goal line to goal line", False, "an"),
    ("ol-long-jump", "the long jump world record", 8.95, "length", "", False, "the"),
    ("ol-high-jump", "the high jump world record", 2.45, "height", "", False, "the"),
    ("ol-hoop", "a basketball hoop", 3.05, "height", "", False, "a"),
]:
    ITEMS.append(L(id_, name, m, "weird", OL, OOM_LEN, "wikipedia-list", True, note, dim=dim, count_ok=cnt, article=art))

# ---- fiction canon sizes (search snippets; versions differ, so each version is its own item) ----
ITEMS += [
    L("fic-godzilla-1954", "Godzilla (1954 original)", 50, "weird", "WikiZilla / Fandom via search", "https://wikizilla.org/wiki/Godzilla_misconceptions",
      "fandom-via-search", False, "scaled to about 50 m", dim="height"),
    L("fic-godzilla-heisei", "Godzilla (Heisei era)", 100, "weird", "WikiZilla / Fandom via search", "https://wikizilla.org/wiki/Godzilla_misconceptions",
      "fandom-via-search", False, "100 m after Godzilla vs. King Ghidorah", dim="height"),
    L("fic-godzilla-2014", "Godzilla (2014 Legendary)", 108.2, "weird", "WikiZilla / Fandom via search", "https://wikizilla.org/wiki/Godzilla_misconceptions",
      "fandom-via-search", False, "355 ft", dim="height"),
    L("fic-godzilla-shin", "Shin Godzilla (2016)", 118.5, "weird", "WikiZilla / Fandom via search", "https://wikizilla.org/wiki/Godzilla_misconceptions",
      "fandom-via-search", False, "Toho's tallest Godzilla at the time", dim="height"),
    L("fic-godzilla-gvk", "Godzilla (Godzilla vs. Kong)", 119.8, "weird", "WikiZilla / Fandom via search", "https://wikizilla.org/wiki/Godzilla_misconceptions",
      "fandom-via-search", False, "393 ft; another source rounds to 120 m", dim="height"),
    L("fic-kong-2017", "Kong (Kong: Skull Island)", 31.7, "weird", "Nerdist / WikiZilla via search",
      "https://nerdist.com/article/how-godzilla-and-kong-have-changed-in-appearance-height-over-the-years-original-versus-monsterverse/",
      "news-via-search", False, "104 ft", dim="height"),
    L("fic-kong-gvk", "Kong (Godzilla vs. Kong)", 102.7, "weird", "Nerdist / Tapatalk via search",
      "https://nerdist.com/article/how-godzilla-and-kong-have-changed-in-appearance-height-over-the-years-original-versus-monsterverse/",
      "news-via-search", False, "337 ft per one source; another says around 300 ft", dim="height"),
    L("fic-kong-1976", "the life-size King Kong animatronic from the 1976 film", 40 * FT, "weird", "IMDb FAQ via search",
      "https://m.imdb.com/it/title/tt0024216/faq", "web-via-search", False, "exactly 40 ft per IMDb", dim="height", article="the"),
    L("fic-star-destroyer", "an Imperial-class Star Destroyer", 1600, "weird", "Wikipedia: Star Destroyer (via search)",
      "https://en.wikipedia.org/wiki/Star_Destroyer", "wikipedia-snippet", False, "1,600 m (5,200 ft)"),
    L("fic-falcon", "the Millennium Falcon", 34.75, "weird", "Wikipedia: Millennium Falcon (via search)",
      "https://en.wikipedia.org/wiki/Millennium_Falcon", "wikipedia-snippet", False, "34.75 m (114 ft)", article="the"),
    L("fic-death-star", "the first Death Star (diameter)", 160000, "weird", "Wikipedia: Death Star (via search)",
      "https://en.wikipedia.org/wiki/Death_Star", "wikipedia-snippet", False, "160 km in current canon; older Legends material says 120 km", dim="width", article="the"),
]

# ---- space and machines ----
ITEMS += [
    S("space-parker", "the Parker Solar Probe at closest approach", 191000, "weird", "Wikipedia: Parker Solar Probe (page read)",
      "https://en.wikipedia.org/wiki/Parker_Solar_Probe", "wikipedia-article", True,
      "page: 690,000 km/h (430,000 mph), 191 km/s, December 2024; fastest human-made object", article="the"),
    S("space-curiosity", "the Curiosity rover at top speed", 0.1 * MPH, "weird", "Search results (several articles)",
      "https://www.mobilityengineeringtech.com/component/content/article/42079-sae-ma-01276", "news-via-search", False,
      "about 0.1 mph (0.16 km/h); other reports say 0.085 to 0.09 mph", article="the"),
    S("space-lrv", "the Apollo lunar rover at its rated top speed", 8 * MPH, "weird", "NASA APOD via search",
      "https://science.nasa.gov/image-article/apod-2004-june-5-apollo-17s-lunar-rover/", "nasa-via-search", False,
      "NASA says about 8 mph", article="the"),
    S("space-lrv-record", "the lunar land speed record (Apollo 17, downhill)", 11.2 * MPH, "weird", "Fox News via search",
      "https://www.foxnews.com/auto/general-motors-building-lunar-terrain-vehicle-for-return-to-the-moon", "news-via-search", False,
      "Eugene Cernan reached 11.2 mph", article="the"),
]

# ---- slow nature, weather, falling things ----
ITEMS += [
    S("nat-atlantic", "the Atlantic Ocean widening", 0.057 / YR, "weird", "Search results (AMS glossary, Popular Science)",
      "https://www.popsci.com/pangea-broke-apart-as-fast-as-fingernails-grow", "web-via-search", False,
      "South America and Africa drifting apart at about 5.7 cm a year, close to fingernail growth", count_ok=True),
    S("nat-pacific-spread", "the fastest seafloor spreading on Earth (East Pacific Rise)", 0.172 / YR, "weird",
      "Search results (continental drift pages)", "https://hypertextbook.com/facts/1997/ZhenHuang.shtml", "web-via-search", False,
      "about 17.2 cm a year", count_ok=True, article="the"),
    S("nat-drizzle", "a drizzle drop falling", 4.5 * MPH, "weird", "Union University via search", "https://www.uu.edu/blog/2001/what-is-the-speed-of-falling-raindrops/",
      "web-via-search", False, "0.5 mm drop"),
    S("nat-raindrop", "a big raindrop falling", 20 * MPH, "weird", "Search results (UW-Madison, Hypertextbook)",
      "https://wxguys.ssec.wisc.edu/2018/07/16/raindrop-speed", "web-via-search", False, "about 5 mm across"),
    S("nat-snowflake", "a snowflake falling", 4 * MPH, "weird", "Search results citing the UK Met Office",
      "https://foxweather.com/learn/7-facts-about-snow", "web-via-search", False, "most flakes fall at 1 to 4 mph, the biggest nearer 9"),
    S("nat-hail-big", "a 2 to 4 inch hailstone falling", 72 * MPH, "weird", "NOAA NSSL via search", "https://nssl.noaa.gov/education/svrwx101/hail",
      "noaa-via-search", False, "NSSL expects 44 to 72 mph; stones over 4 inches may exceed 100 mph", article="a"),
    S("nat-avalanche-slab", "a slab avalanche", 80 * MPH, "weird", "Search results", "https://en.wikipedia.org/wiki/Avalanche", "web-via-search", False,
      "typical 40 to 80 mph"),
    S("nat-avalanche-record", "the fastest avalanche on record (Mount St. Helens, 1980)", 250 * MPH, "weird", "Guinness via search",
      "https://www.guinnessworldrecords.com/world-records/fastest-avalanche", "guinness-via-search", False, "250 mph", article="the"),
    S("nat-gust", "the strongest wind gust ever measured (Barrow Island, 1996)", 253 * MPH, "weird", "Guinness / WMO via search",
      "https://www.guinnessworldrecords.com/world-records/93573-fastest-wind-speed-recorded-by-an-anemometer", "guinness-via-search", False,
      "408 km/h during Cyclone Olivia, not tornado-related", article="the"),
]

# ---- odd vehicles (Guinness via search) and odd objects ----
G = "Guinness World Records (via search result)"
ITEMS += [
    S("veh-bed", "the world's fastest bed", 83.8 * MPH, "weird", G,
      "https://www.guinnessworldrecords.com/news/2017/1/hotels-com-and-british-racing-pro-tom-onslow-cole-drive-worlds-fastest-bed-into-456789",
      "guinness-via-search", False, "83.8 mph (135 km/h), Tom Onslow-Cole, 2017", article="the"),
    S("veh-bathtub", "the world's fastest bathtub", 116.08 * MPH, "weird", G, "https://guinnessworldrecords.com/world-records/381071-fastest-bathtub",
      "guinness-via-search", False, "186.82 km/h, Hannes Roth, verified 6 May 2016", article="the"),
    S("veh-bathroom", "the fastest motorised bathroom (Bog Standard)", 42.25 * MPH, "weird", G,
      "https://www.guinnessworldrecords.com/world-records/625359-fastest-motorized-bathroom/", "guinness-via-search", False,
      "68 km/h, built by Edd China", article="the"),
    S("veh-toilet", "the fastest toilet (Guinness-listed)", 53.25 * MPH, "weird", G,
      "https://halifaxcourier.co.uk/news/people/brighouse-designer-flushed-with-pride-after-breaking-guinness-record-for-worlds-fastest-toilet-2643688",
      "guinness-via-search", False, "53.25 mph, Colin Furze; later claims of 70+ mph were not confirmed", article="the"),
    L("rec-bicycle", "the world's longest rideable bicycle", 47.5, "weird", G, "https://www.guinnessworldrecords.com/records/showcase/most-popular.html",
      "guinness-via-search", False, "47.5 m (155 ft 8 in), Bernie Ryan, 2020", article="the"),
    L("rec-nails", "the longest fingernails ever, all ten added together", 18 * FT + 10.9 * 0.0254, "weird", G,
      "https://www.myjoyonline.com/guinness-world-records-2018-long-fingernails-long-eyelashes-and-big-big-hair/", "guinness-via-search", False,
      "18 ft 10.9 in, Ayanna Williams, 2018 (the record has since changed)", article="the"),
    L("rec-sandcastle", "the tallest sandcastle", 21.16, "weird", G, "https://www.smithsonianmag.com/smart-news/worlds-tallest-sandcastle-180962149/",
      "guinness-via-search", False, "Blokhus, Denmark, 2021; it beat Binz, Germany, at 17.65 m in 2019", dim="height", article="the"),
    L("rec-underwater-bullet", "how far a 9mm bullet flew underwater in a Mythbusters-style test", 18 * FT, "weird",
      "Forum recap of a TV episode (secondhand)", "https://www.therpf.com/forums/threads/mythbuster-question.82839/post-1616582",
      "forum-via-search", False, "secondhand; treat as rough"),
]

# ---- wave 3 additions (search snippets; fan and news sources are flagged) ----
ITEMS += [
    L("fic-enterprise-d", "the starship Enterprise-D", 642.5, "weird", "Fan-compiled ship tables via search",
      "https://foreman.hms.harvard.edu/star-trek-1701-d", "fan-via-search", False,
      "642.5 m is consistent across sources; the original NCC-1701 is disputed (288 or 305 m)"),
    L("fic-enterprise-e", "the starship Enterprise-E", 685.7, "weird", "Fan-compiled ship tables via search",
      "https://grandavehousing.calpoly.edu/news/uss-enterprise-size-how-big", "fan-via-search", False, "685 to 686 m"),
    L("rec-tallest-dog", "the world's tallest living dog (Zeus, a Great Dane)", 1.046, "weird", "Guinness via news search",
      "https://www.fox13news.com/news/worlds-tallest-dog-zeus-great-dane", "news-via-search", False,
      "3 ft 5.18 in at the shoulder", dim="height"),
    L("rec-snowman", "Olympia, the 2008 world's tallest snowperson", 122 * FT + 1 * 0.0254, "weird", "Fox News via search",
      "https://www.foxnews.com/world/worlds-tallest-snowman", "news-via-search", False,
      "122 ft 1 in, Bethel, Maine; Austria's Riesi at nearly 125 ft took the title in 2020", dim="height"),
    S("fic-flash", "the Flash (TV show version)", 2532 * MPH, "weird", "Fan-written sources via search",
      "https://www.fandom.com/articles/sonic-vs-speedsters", "fan-via-search", False,
      "Mach 3.3 (2,532 mph) per the show; comics claim far more", article="the"),
    S("fic-sonic", "Sonic the Hedgehog on a sustained run (fan estimate)", 767 * MPH, "weird", "Fan-written sources via search",
      "https://www.fandom.com/articles/sonic-vs-speedsters", "fan-via-search", False, "fans estimate the speed of sound; not an official figure"),
]
