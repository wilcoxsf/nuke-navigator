# Label audit: hit coordinates against projected distance

Rows with both labels in the air (fly balls and line drives): 677,426. Pixel to feet scale from 109,390 fly-ball outs between 250 and 380 ft since 2020: 2.489 ft per pixel (home plate at 125.42, 198.27).

`res` = projected distance minus the distance implied by the hit coordinates. Positive means the projected distance is longer than the marked spot.

## By event class, 2020 and later (Hawk-Eye era)

| cls | n | median | mad | p10 | p90 |
|---|---|---|---|---|---|
| double_triple | 46382 | -10.2 | 16.7 | -91.0 | 2.1 |
| home_run | 35721 | -2.1 | 1.1 | -8.9 | -0.4 |
| other | 717 | 0.5 | 2.7 | -17.0 | 15.8 |
| out_in_air | 221046 | 0.6 | 1.9 | -2.6 | 7.2 |
| single | 88389 | -44.8 | 26.8 | -94.8 | 2.8 |

## By event class and year, fly balls only

| cls | game_year | n | median | mad | p10 | p90 |
|---|---|---|---|---|---|---|
| double_triple | 2015 | 1217 | -4.5 | 13.9 | -34.7 | 24.2 |
| double_triple | 2016 | 1309 | -1.9 | 13.6 | -29.9 | 27.8 |
| double_triple | 2017 | 1427 | -19.5 | 2.5 | -22.5 | 7.1 |
| double_triple | 2018 | 1456 | -19.6 | 2.3 | -22.5 | 2.9 |
| double_triple | 2019 | 1605 | -19.8 | 1.9 | -22.4 | -6.6 |
| double_triple | 2020 | 471 | -19.8 | 2.7 | -24.4 | 12.3 |
| double_triple | 2021 | 1798 | -2.2 | 1.3 | -19.5 | 5.6 |
| double_triple | 2022 | 1924 | -2.2 | 1.3 | -16.6 | 20.1 |
| double_triple | 2023 | 1834 | -2.1 | 1.8 | -23.4 | 26.3 |
| double_triple | 2024 | 1750 | -2.1 | 1.6 | -20.7 | 28.2 |
| double_triple | 2025 | 1794 | -2.0 | 1.7 | -18.8 | 21.8 |
| double_triple | 2026 | 1807 | -2.0 | 1.7 | -18.2 | 24.0 |
| home_run | 2015 | 2519 | -14.8 | 13.7 | -40.6 | 14.4 |
| home_run | 2016 | 3531 | -16.0 | 13.3 | -41.1 | 11.0 |
| home_run | 2017 | 4607 | -21.4 | 1.7 | -25.9 | -14.8 |
| home_run | 2018 | 4389 | -21.5 | 1.6 | -25.4 | -17.9 |
| home_run | 2019 | 5715 | -21.4 | 1.4 | -24.8 | -18.4 |
| home_run | 2020 | 1917 | -21.5 | 1.6 | -25.1 | -18.1 |
| home_run | 2021 | 5297 | -2.1 | 1.0 | -5.6 | -0.5 |
| home_run | 2022 | 4766 | -1.9 | 0.9 | -4.4 | -0.4 |
| home_run | 2023 | 5295 | -1.9 | 1.0 | -4.4 | -0.2 |
| home_run | 2024 | 4948 | -1.9 | 1.0 | -4.6 | -0.3 |
| home_run | 2025 | 5141 | -1.9 | 1.0 | -4.5 | -0.2 |
| home_run | 2026 | 5071 | -2.0 | 1.0 | -4.6 | -0.4 |
| out_in_air | 2015 | 19321 | 9.3 | 15.7 | -19.4 | 40.5 |
| out_in_air | 2016 | 19819 | 6.0 | 14.5 | -19.9 | 34.9 |
| out_in_air | 2017 | 18832 | -12.2 | 5.3 | -19.8 | 17.2 |
| out_in_air | 2018 | 19612 | -13.3 | 4.5 | -19.9 | 12.0 |
| out_in_air | 2019 | 20182 | -14.5 | 3.6 | -19.9 | -5.9 |
| out_in_air | 2020 | 7780 | -14.5 | 3.5 | -19.9 | -6.9 |
| out_in_air | 2021 | 22522 | 0.3 | 1.7 | -2.4 | 4.2 |
| out_in_air | 2022 | 23524 | 0.5 | 1.7 | -2.2 | 5.0 |
| out_in_air | 2023 | 23760 | 0.4 | 1.7 | -2.2 | 4.7 |
| out_in_air | 2024 | 24505 | 0.4 | 1.7 | -2.2 | 4.7 |
| out_in_air | 2025 | 24736 | 0.5 | 1.7 | -2.2 | 4.9 |
| out_in_air | 2026 | 24793 | 0.5 | 1.7 | -2.2 | 4.7 |

## By launch angle band, fly balls and line drives, 2020 and later

| la_band | n | median | mad | p10 | p90 |
|---|---|---|---|---|---|
| (-90, 10] | 31008 | -59.2 | 58.3 | -122.7 | 27.3 |
| (10, 20] | 109791 | -28.1 | 28.9 | -80.2 | 4.3 |
| (20, 30] | 105702 | -1.3 | 1.8 | -21.8 | 3.3 |
| (30, 40] | 76855 | -0.7 | 1.7 | -6.2 | 3.7 |
| (40, 50] | 44674 | 1.0 | 1.7 | -3.5 | 4.3 |
| (50, 90] | 24225 | 2.6 | 1.7 | -6.1 | 5.4 |

## Missingness of each label by year (all balls in the modeling table)

| game_year | n | no_hc | no_dist | no_bearing |
|---|---|---|---|---|
| 2015 | 125998 | 0.036 | 0.101 | 0.036 |
| 2016 | 125283 | 0.031 | 0.097 | 0.031 |
| 2017 | 125472 | 0.045 | 0.095 | 0.045 |
| 2018 | 124425 | 0.063 | 0.076 | 0.063 |
| 2019 | 123857 | 0.003 | 0.076 | 0.003 |
| 2020 | 43665 | 0.001 | 0.0 | 0.001 |
| 2021 | 121319 | 0.001 | 0.0 | 0.001 |
| 2022 | 123723 | 0.0 | 0.0 | 0.0 |
| 2023 | 123874 | 0.0 | 0.0 | 0.0 |
| 2024 | 123826 | 0.0 | 0.001 | 0.0 |
| 2025 | 124439 | 0.0 | 0.0 | 0.0 |
| 2026 | 124098 | 0.001 | 0.001 | 0.001 |

## Missingness by event class, fly balls, 2020 and later

| cls | n | no_dist | no_hc |
|---|---|---|---|
| double_triple | 11397 | 0.001 | 0.0 |
| home_run | 32689 | 0.001 | 0.007 |
| other | 429 | 0.007 | 0.0 |
| out_in_air | 151831 | 0.001 | 0.0 |
| single | 9012 | 0.0 | 0.0 |

## What the direction teacher trains on (train split, rows with a bearing)

| cls | n | share |
|---|---|---|
| double_triple | 81435 | 0.071 |
| home_run | 51886 | 0.046 |
| other | 20630 | 0.018 |
| out_in_air | 746129 | 0.655 |
| single | 238879 | 0.21 |

## Findings (22 Oct 2026)

1. For balls in the air since 2021 the two labels agree closely: median gap 0.4 to 0.5 ft for outs in the air and about -2 ft for home runs, spread (MAD) 1 to 2 ft.
2. The hit-coordinate scale is era-dependent. For centre-field fly balls the ratio of projected distance to pixel radius is 2.495 to 2.500 in 2015 and 2016, 2.368 to 2.370 in 2017 to 2020, and 2.483 to 2.484 from 2021 on. Any distance read off the coordinates needs the era's own scale (the 2.489 used above is a 2020-and-later blend, which is why 2017 to 2020 show a steady -14 to -21 ft gap). Bearings are not affected by a uniform scale change: home-run bearing extremes sit at about -47 and +47 in every year, so the origin did not shift.
3. 2015 and 2016 coordinates are noisy: spread of the gap is 13 to 16 ft, against 1 to 2 ft from 2021 on.
4. For singles and doubles the coordinates mark where the ball was fielded, not where it would have landed (median gap -45 and -10 ft). They are 28% of the direction teacher's training rows (singles 21%, doubles and triples 7%). Direction of travel is still roughly right, but the position is not a landing spot.
5. Missingness: projected distance is missing for 7.6% to 10.1% of balls in 2015 to 2019 and essentially never since 2020; hit coordinates for 3% to 6% in 2015 to 2018.
6. What it means for the model: no leak, no origin bias, and the era scale shift does not touch `bearing` or `hit_distance_sc` as we use them. The two real issues are noisy 2015-2016 labels (the learning-curve work already showed those years add nothing) and the tail of single and double labels. Neither looks like a source of a large gain; a direction teacher fitted on air balls from 2021 on is the clean variant to try if direction work resumes.
