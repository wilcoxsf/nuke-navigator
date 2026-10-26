# Which edges are the wall? (23 Oct 2026) shipped model, 173042 edges; materials {np.str_('Ads_Padding'): 339, np.str_('SF_Field'): 11189, np.str_('SF_Greyscale'): 161389, np.str_('SF_Infield'): 125}

## Per 5 degree sector: edges within tolerance of the measured wall distance (-1.5 to +1.0 m) and under the wall top + 0.4 m, by material; and where the model's own long horizontal chains at wall height actually sit
  sector      measured wall (ft, height ft) | padding edges | structure edges on the wall: n, length m, top height m | long horizontal structure chains (3 m+, 0.5 m of wall height): median distance from the plate (ft)
  -45 to -40    348 ft,  9.4 ft |     5 |    45,     84 m, top 3.0 m | 4 chains, median 356 ft (measured 348)
  -40 to -35    353 ft,  9.4 ft |     4 |     0,      0 m, top nan m | none
  -35 to -30    356 ft,  9.4 ft |     5 |     3,     91 m, top 2.9 m | 11 chains, median 372 ft (measured 356)
  -30 to -25    363 ft,  9.4 ft |     3 |     0,      0 m, top nan m | 2 chains, median 397 ft (measured 363)
  -25 to -20    369 ft,  9.4 ft |     1 |     5,    173 m, top 2.9 m | 9 chains, median 390 ft (measured 369)
  -20 to -15    380 ft,  9.4 ft |     4 |     3,     30 m, top 2.9 m | 14 chains, median 405 ft (measured 380)
  -15 to -10    395 ft,  9.4 ft |     4 |   193,     85 m, top 2.9 m | 10 chains, median 420 ft (measured 395)
  -10 to  -5    412 ft,  8.4 ft |     0 |   421,    153 m, top 2.9 m | 70 chains, median 438 ft (measured 412)
   -5 to  +0    396 ft,  8.4 ft |     0 |     1,     14 m, top 0.1 m | 19 chains, median 422 ft (measured 396)
   +0 to  +5    395 ft,  8.4 ft |     0 |    12,    163 m, top 2.6 m | 20 chains, median 422 ft (measured 395)
   +5 to +10    421 ft,  8.0 ft |     0 |    77,    107 m, top 2.5 m | 68 chains, median 438 ft (measured 421)
  +10 to +15    421 ft,  8.0 ft |     0 |     4,     40 m, top 0.0 m | 5 chains, median 434 ft (measured 421)
  +15 to +20    421 ft,  8.0 ft |     2 |   177,    122 m, top 2.7 m | 5 chains, median 424 ft (measured 421)
  +20 to +25    392 ft, 21.0 ft |    13 |   993,    736 m, top 6.3 m | 19 chains, median 399 ft (measured 392)
  +25 to +30    367 ft, 26.1 ft |     4 |   728,    307 m, top 8.0 m | 39 chains, median 401 ft (measured 367)
  +30 to +35    359 ft, 26.1 ft |     0 |   781,    417 m, top 7.6 m | 28 chains, median 373 ft (measured 359)
  +35 to +40    334 ft, 26.1 ft |     0 |  1063,    605 m, top 8.0 m | 29 chains, median 336 ft (measured 334)
  +40 to +45    338 ft, 26.1 ft |     0 |   255,    370 m, top 8.3 m | 28 chains, median 338 ft (measured 338)

## Centre field (-3 to +3 degrees), structure and padding edges between 100 and 135 m from the plate, by height band and distance band (counts)
  height -0.5 to 0.3 m:  distance 100-112    0 | 112-118    1 | 118-121   46 | 121-124    0 | 124-130  401 | 130-135  240
  height  0.3 to 1.5 m:  distance 100-112    0 | 112-118    0 | 118-121   32 | 121-124    0 | 124-130  209 | 130-135 1125
  height  1.5 to 2.6 m:  distance 100-112    0 | 112-118    0 | 118-121    1 | 121-124    0 | 124-130   69 | 130-135    6
  height  2.6 to 4.0 m:  distance 100-112    0 | 112-118    0 | 118-121  162 | 121-124    0 | 124-130  392 | 130-135  587
  height  4.0 to 8.0 m:  distance 100-112    0 | 112-118    0 | 118-121    0 | 121-124    0 | 124-130    0 | 130-135    5
  (the measured distance at 0 degrees is 120.5 m; the wall height is 2.6 m)
