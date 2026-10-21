# Airport wind versus grid wind, Oracle Park home games

4,059 MLB fly balls at Oracle Park (balls file from flight_transfer.py). Miss = Statcast projected distance minus calm-air physics distance. Field azimuth used: 85 degrees. Station wind is the mean over the first three hours after first pitch; games with no observations in the window drop out.

Physics: one m/s of tailwind adds 7.9 ft to a 100 mph, 28 degree fly ball.

| Wind source | Balls | Corr (along) | Slope (ft per m/s) | Corr (cross) |
|---|---|---|---|---|
| Open-Meteo grid, 10 m | 4,059 | +0.007 | +0.07 | -0.038 |
| SFO airport | 4,059 | +0.020 | +0.16 | +0.029 |
| OAK airport | 4,027 | +0.013 | +0.14 | +0.020 |
| SFO and OAK average | 4,027 | +0.019 | +0.20 | +0.028 |

Effective wind scale (regression slope divided by the physics slope): Open-Meteo grid, 10 m 0.01; SFO airport 0.02; OAK airport 0.02; SFO and OAK average 0.03

Frame check: best-fit direction of distance-adding wind 149 degrees (compass), 0.32 ft per m/s; the park azimuth used is 85.
By wind strength (SFO and OAK average speed): 
- 0-3 m/s (167 balls): slope on along-field wind +6.58 ft per m/s
- 3-6 m/s (1,678 balls): slope on along-field wind +0.60 ft per m/s
- 6-9 m/s (1,965 balls): slope on along-field wind -0.09 ft per m/s
- 9-99 m/s (217 balls): slope on along-field wind +0.26 ft per m/s
