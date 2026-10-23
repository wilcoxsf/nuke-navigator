# Foul-ball distance supervision (22 Oct 2026)
train fair balls 106214, train foul balls 85055 (airborne, 70+ mph, distance known), test fair balls 74430 (from 2025-06-01)
foul distance labels: mean 241 ft; fair: mean 316 ft (fouls are shorter and more varied; a domain flag lets the model tell them apart)

## Distance error on held-out fair airborne balls
  A fair only                                  MAE 11.66 ft   bias -0.35   MAE near the wall 12.21 ft
  B fair + foul, with is_foul flag             MAE 11.78 ft   bias -0.22   MAE near the wall 12.24 ft
  C fair + foul, no flag                       MAE 12.60 ft   bias -2.95   MAE near the wall 12.78 ft
  D fair + foul (foul weight 0.5), with flag   MAE 11.73 ft   bias -0.27   MAE near the wall 12.22 ft

  gain of B over A: -0.12 ft   (kill rule: under 0.3 ft and no better tails)
  A2 fair only, no bat tracking                MAE 13.46 ft   bias -0.58   MAE near the wall 13.73 ft
  B2 fair + foul with flag, no bat tracking    MAE 13.50 ft   bias -0.53   MAE near the wall 13.68 ft
  gain without bat tracking: -0.03 ft

## 80% interval from q10 and q90 models (fair test balls)
  A fair only                  coverage 0.770 (near the wall 0.785), mean width 35.9 ft, below 0.111 above 0.119
  B fair + foul with flag      coverage 0.783 (near the wall 0.801), mean width 37.3 ft, below 0.105 above 0.112

reading: B over A is the benefit of the foul balls' distance labels for a fair-ball distance model; C shows what the model does if it cannot tell fouls from fair balls.
