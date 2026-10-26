# Distance label semantics by event type (23 Oct 2026), 40000 balls with a carry label; J median -116 ft per unit log carry

## All balls: mean carry residual at matched exit speed and launch angle (positive = ball went SHORTER than the table's typical ball)
  field out            n  22351  residual mean -0.0001  sd 0.196   =  -0.0 ft of distance   home-run share 0.000
  single               n   8874  residual mean +0.0611  sd 0.471   =  +7.1 ft of distance   home-run share 0.000
  home_run             n   3842  residual mean -0.0410  sd 0.090   =  -4.8 ft of distance   home-run share 1.000
  double               n   3521  residual mean -0.0095  sd 0.358   =  -1.1 ft of distance   home-run share 0.000
  sac fly              n    884  residual mean -0.0042  sd 0.148   =  -0.5 ft of distance   home-run share 0.000
  triple               n    332  residual mean -0.0909  sd 0.370   = -10.6 ft of distance   home-run share 0.000

## Hard-hit fly balls only (20 to 40 degrees, 95 mph and up): n 10456
  double               n   1359  residual mean +0.0178  sd 0.147   =  +2.1 ft   home-run share 0.000
  field out            n   4901  residual mean +0.0253  sd 0.107   =  +2.9 ft   home-run share 0.000
  home_run             n   3665  residual mean -0.0363  sd 0.084   =  -4.2 ft   home-run share 1.000
  sac fly              n    219  residual mean +0.0294  sd 0.113   =  +3.4 ft   home-run share 0.000
  single               n    107  residual mean +0.1060  sd 0.210   = +12.3 ft   home-run share 0.000
  triple               n    174  residual mean -0.0151  sd 0.114   =  -1.8 ft   home-run share 0.000

## Does the outcome add to a carry model? (out-of-fold R2 of log carry, grouped by game, 40000 balls with bat tracking)
  contact, weather, pitch, swing:                      0.4012
  + home-run indicator (the label itself, diagnostic):   0.4021  (gain +0.0009)
  + out indicator (caught or fielded, diagnostic):       0.4109  (gain +0.0096)

reading: if the home-run or out indicator adds a lot, the distance label carries the outcome's semantics (projected for home runs, endpoint for outs) and the 'carry' feature is partly an outcome-shaped target; the E10 feature chain is still leak-free (game-out-of-fold, legal inputs only), but its physical story would be weaker.
