# Where the density comes from (23 Oct 2026): hard edges over 78 degrees of the shipped Oracle model, 154606 segments; heavy set (below 12 m, within 150 m of the plate) 74650

## Heavy set by height above the ground (m)
  -5.0 to  0.6 m:  12689 segments (17%), total length  13475 m, median length 0.18 m
   0.6 to  2.0 m:  12709 segments (17%), total length  13139 m, median length 0.14 m
   2.0 to  3.5 m:   8775 segments (12%), total length  14456 m, median length 0.33 m
   3.5 to  6.0 m:  10071 segments (13%), total length  17574 m, median length 0.17 m
   6.0 to  9.0 m:  16967 segments (23%), total length  20701 m, median length 0.12 m
   9.0 to 12.0 m:  13439 segments (18%), total length  20129 m, median length 0.12 m

## Heavy set by segment length
    0.0 to    0.3 m:  43018 segments (58%), total length   3363 m
    0.3 to    1.0 m:  14184 segments (19%), total length   9101 m
    1.0 to    3.0 m:  10185 segments (14%), total length  17153 m
    3.0 to   10.0 m:   5318 segments (7%), total length  28181 m
   10.0 to 1000.0 m:   1945 segments (3%), total length  41675 m

## Stacked rows: in each 10 degree by 5 m cell of the heavy set, how many distinct 0.15 m height levels carry an edge
  cells 534; cells with 8 or more distinct levels (closely stacked rows): 280 (52% of cells)
  heavy segments inside those stacked cells: 71768 (96% of the heavy set), at heights -0.0 to 11.4 m (median 4.2)

## What each treatment would remove (segment counts, heavy set)
  heavy only below 3.5 m (field level, wall, dugouts): keeps 34173, moves 40477 to the faint set
  heavy only below 2 m: keeps 25398
  drop heavy edges shorter than 1 m: removes 57202 (77%)
  every other seat row (keep a stacked-cell edge only when its 0.3 m height level is even): removes about 35884
