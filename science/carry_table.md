# Learned carry correction table (22 Oct 2026): fit on 16433 balls before 2025-03-18, tested on 23567 later balls
weather corrections fitted before 2025-03-18: temperature +0.00123 log carry per F (reference 75 F), elevation +0.0119 per 1000 ft

## Distance error of the sandbox physics against Statcast projected distance (test balls)
  carry 1 (before 22 Oct) mean error   +2.6 ft   MAE  14.6 ft   RMSE  20.4 ft
  table mean carry     mean error   +4.4 ft   MAE  13.7 ft   RMSE  19.2 ft
  table + weather terms mean error   +3.2 ft   MAE  13.6 ft   RMSE  19.1 ft
  home runs only (2216): carry 1 mean error -9.0 ft, table -3.4 ft, table + weather -5.3 ft
  Colorado (home park COL)     n   876  mean error carry 1 +7.3, table +8.8, table + weather +2.0 ft;  MAE 14.7 -> 14.6 -> 13.8
  hot games (85 F and up)      n  3800  mean error carry 1 +3.5, table +5.3, table + weather +2.4 ft;  MAE 14.3 -> 13.6 -> 13.3
  cold games (below 55 F)      n  1796  mean error carry 1 +2.1, table +3.9, table + weather +3.1 ft;  MAE 15.5 -> 14.4 -> 14.3
  band mean +- 1.282 sd (nominal 80%): covers 85.9% of real balls
  band mean +- 0.674 sd (nominal 50%): covers 53.8% of real balls
  exit speed 100 to 110 mph, 20 to 35 degrees    n  3055  MAE carry 1 12.2 -> table 12.1 ft; 80% band covers 89.5%
  105 mph and up                                 n  2907  MAE carry 1 22.3 -> table 21.0 ft; 80% band covers 88.8%
  below 90 mph                                   n  7545  MAE carry 1 10.8 -> table 9.7 ft; 80% band covers 84.5%
  standardized residual quantiles (2%, 10%, 25%, 50%, 75%, 90%, 98%): -2.18, -1.11, -0.52, 0.08, 0.72, 1.11, 1.85
  empirical 80% band (10th to 90th percentile of the standardized residual) covers 80.0% of held-out balls (by construction about 80%)
final weather terms (all balls): temperature +0.00091 per F around 75 F, elevation +0.0117 per 1000 ft

wrote apps/web/public/carry_table.json (21 x 20 cells, mean log carry range -0.161 to 0.206, sd range 0.066 to 0.694)
