# Park-reported wind versus the distance miss, Oracle Park

4,073 fly balls from Oracle Park home games; 4,032 in games with a parseable reported wind direction. Physics: one m/s of tailwind adds 7.9 ft.

| Wind source | Balls | Corr (along) | Slope (ft per m/s) | Effective scale | Corr (cross) |
|---|---|---|---|---|---|
| Park-reported (StatsAPI) | 4,032 | +0.020 | +0.17 | 0.02 | -0.007 |
| Open-Meteo grid, same balls | 4,032 | +0.006 | +0.06 | 0.01 | -0.038 |

Mean miss by reported wind direction (MLB minus calm physics, ft):

| Reported wind | Balls | Mean speed (mph) | Mean miss |
|---|---|---|---|
| In From RF | 42 | 17.0 | -4.5 |
| L To R | 84 | 9.9 | -4.9 |
| Out To CF | 3,275 | 13.8 | -3.9 |
| Out To LF | 106 | 12.2 | -6.8 |
| Out To RF | 292 | 14.2 | -5.6 |
| R To L | 211 | 11.9 | -3.0 |
| Varies | 41 | 7.3 | -7.0 |

Out To CF games by reported speed:

- 6-10 mph (338 balls): mean miss -5.4 ft
- 10-15 mph (1,545 balls): mean miss -4.0 ft
- 15-40 mph (1,356 balls): mean miss -3.3 ft
