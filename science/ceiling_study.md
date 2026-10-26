# Benchmark and headroom study (24 Oct 2026; XGBoost, half the train rows, one seed; compare rows with each other only)

Our legal estimates on test: bearing_hat error median 6.5 deg (mean 10.4), dist_hat error median 9.8 ft (mean 13.0).

| model | what it knows | test Brier all | near-wall (predicted margin within 15 ft) | Oracle Park | trees |
|---|---|---|---|---|---|
| EL | exit speed, launch angle, five fence distances | 0.01939 | 0.1729 | 0.01546 | 122 |
| ELW | plus temperature, pressure, wind | 0.01927 | 0.1724 | 0.01538 | 112 |
| SPRAY | plus TRUE spray angle (after landing) | 0.01398 | 0.1283 | 0.01077 | 249 |
| SPRAYW | SPRAY plus weather | 0.01398 | 0.1284 | 0.01105 | 422 |
| LEGAL | our legal features (71) | 0.01351 | 0.1256 | 0.01150 | 169 |
| LEGAL+bearing s=0 | legal + true bearing with 0 deg noise | 0.01107 | 0.1003 | 0.00949 | 248 |
| LEGAL+bearing s=4 | legal + true bearing with 4 deg noise | 0.01177 | 0.1072 | 0.01009 | 153 |
| LEGAL+bearing s=8 | legal + true bearing with 8 deg noise | 0.01247 | 0.1150 | 0.01076 | 166 |
| LEGAL+bearing s=12 | legal + true bearing with 12 deg noise | 0.01294 | 0.1189 | 0.01071 | 151 |
| LEGAL+dist s=0 | legal + observed distance with 0 ft noise | 0.00962 | 0.0889 | 0.00809 | 248 |
| LEGAL+dist s=8 | legal + observed distance with 8 ft noise | 0.01072 | 0.0995 | 0.00915 | 234 |
| LEGAL+dist s=16 | legal + observed distance with 16 ft noise | 0.01199 | 0.1113 | 0.00981 | 240 |
| LEGAL+dist s=32 | legal + observed distance with 32 ft noise | 0.01302 | 0.1204 | 0.01119 | 274 |
| LEGAL+both 0/0 | legal + true bearing (0 deg noise) and distance (0 ft noise) | 0.00352 | 0.0311 | 0.00298 | 396 |
| LEGAL+both 4/8 | legal + true bearing (4 deg noise) and distance (8 ft noise) | 0.00769 | 0.0704 | 0.00684 | 159 |
| LEGAL+both 8/16 | legal + true bearing (8 deg noise) and distance (16 ft noise) | 0.01065 | 0.0985 | 0.00902 | 206 |

constant-rate Brier on test: 0.04369
