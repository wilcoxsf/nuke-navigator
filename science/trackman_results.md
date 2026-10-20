# College TrackMan teacher analysis

Batted balls loaded: 320,063.

With measured spin, true direction, landing bearing and distance: 128,211. Leagues: {'Team': 28663, 'SEC': 25870, 'ACC': 21503, 'SBELT': 18192, 'BIG12': 17561, 'BIG10': 15532}.

Mean exit speed 86.2 mph; mean spin 2901 rpm; median distance 222 ft.

## Spin by launch angle

| Launch angle | n | mean spin (rpm) | mean distance (ft) |
|---|---|---|---|
| (-90, -10] | 26 | 3646 | 14 |
| (-10, 0] | 5,313 | 2449 | 36 |
| (0, 10] | 25,229 | 2148 | 103 |
| (10, 20] | 31,178 | 2195 | 225 |
| (20, 30] | 28,512 | 2844 | 297 |
| (30, 40] | 19,368 | 3767 | 286 |
| (40, 50] | 11,187 | 4309 | 245 |
| (50, 90] | 7,398 | 4585 | 187 |

## Spin-axis convention check (fly balls over 150 ft)

Correlation between each spin component and the curve (landing bearing minus launch direction):

- rate*sin(axis): -0.387
- rate*cos(axis): -0.080
- Backspin-like component (rate * -cos(axis)) mean 1070 rpm, sidespin-like (rate * sin(axis)) mean -212 rpm

## Predicting spin from contact and pitch details (5-fold by game file)

| Target | R2 | MAE (rpm) | MAE of a constant |
|---|---|---|---|
| HitSpinRate | 0.685 | 501 | 1057 |
| backspin | 0.867 | 562 | 1909 |
| sidespin | 0.788 | 562 | 1549 |

## Landing bearing versus true launch direction

Median |bearing - direction| 4.73 degrees, 95th percentile 15.24, over 128,211 balls (89,291 beyond 150 ft).
A model that corrects the bearing using angle, speed, distance and handedness cuts the median error to 1.41 degrees (95th percentile 6.50).
