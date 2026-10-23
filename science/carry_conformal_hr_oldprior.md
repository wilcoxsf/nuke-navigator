# Carry distribution and home-run prediction (22 Oct 2026), 40000 balls with a known source-park fence
split by game: train 20011, calibration 9948, test 10041

## 80% interval for log carry (test games)
conformal adjustment +0.0024 in log carry
  all test balls                                 n 10041  raw coverage 0.788  conformal 0.807  median width -34 ft
  100 to 110 mph, 20 to 35 degrees               n  1259  raw coverage 0.805  conformal 0.811  median width -36 ft
  105 mph and up                                 n  1243  raw coverage 0.787  conformal 0.818  median width -50 ft
  launch angle 20 to 26 degrees                  n  2066  raw coverage 0.787  conformal 0.793  median width -38 ft
  bearing beyond 35 degrees (near the lines)     n  1682  raw coverage 0.790  conformal 0.831  median width -34 ft
  simulated distance within 20 ft of the fence   n  1425  raw coverage 0.802  conformal 0.811  median width -34 ft
  right-handed batters                           n  5535  raw coverage 0.789  conformal 0.805  median width -34 ft
  left-handed batters                            n  4506  raw coverage 0.788  conformal 0.809  median width -34 ft

## Home-run probability for 2500 test fly balls within 60 ft of their own fence (home-run share 0.247)
  deterministic physics prior (carry 1, 0 or 1)        Brier 0.1172   log loss 1.0795
  carry distribution, 24 common draws (what-if inputs) Brier 0.0759   log loss 0.2784
  E3b draws: conformal-widened, tails to 0.1% and 99.9% Brier 0.0757   log loss 0.2779
  plain LightGBM classifier on the same inputs + fence Brier 0.0717   log loss 0.2317
  average of the draws and the classifier              Brier 0.0695
  average of the E3b draws and the classifier          Brier 0.0695
  reliability of the raw draws (predicted bin -> actual home-run share):
    0.0 to 0.1: n 1609  predicted 0.008  actual 0.029   (classifier 0.031)
    0.1 to 0.3: n  201  predicted 0.199  actual 0.274   (classifier 0.280)
    0.3 to 0.5: n  113  predicted 0.388  actual 0.416   (classifier 0.423)
    0.5 to 0.7: n  132  predicted 0.595  actual 0.621   (classifier 0.595)
    0.7 to 0.9: n  261  predicted 0.804  actual 0.835   (classifier 0.803)
    0.9 to 1.0: n  184  predicted 0.944  actual 0.924   (classifier 0.900)
  reliability of the E3b draws (predicted bin -> actual home-run share):
    0.0 to 0.1: n 1599  predicted 0.008  actual 0.028   (classifier 0.030)
    0.1 to 0.3: n  209  predicted 0.202  actual 0.268   (classifier 0.269)
    0.3 to 0.5: n  116  predicted 0.386  actual 0.422   (classifier 0.428)
    0.5 to 0.7: n  137  predicted 0.592  actual 0.628   (classifier 0.593)
    0.7 to 0.9: n  259  predicted 0.805  actual 0.834   (classifier 0.809)
    0.9 to 1.0: n  180  predicted 0.944  actual 0.928   (classifier 0.902)

reading: coverage near 80% in every cohort and a draws-based Brier within noise of the classifier on the same inputs would mean the carry-distribution interface is as good as a plain model while giving a physical band for every park.
