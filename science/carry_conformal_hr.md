# Carry distribution and home-run prediction (22 Oct 2026), 40000 balls with a known source-park fence
split by game: train 20011, calibration 9948, test 10041

## 80% interval for log carry (test games)
conformal adjustment +0.0022 in log carry
  all test balls                                 n 10041  raw coverage 0.783  conformal 0.808  median width -33 ft
  100 to 110 mph, 20 to 35 degrees               n  1259  raw coverage 0.803  conformal 0.810  median width -36 ft
  105 mph and up                                 n  1243  raw coverage 0.779  conformal 0.820  median width -50 ft
  launch angle 20 to 26 degrees                  n  2066  raw coverage 0.785  conformal 0.792  median width -38 ft
  bearing beyond 35 degrees (near the lines)     n  1682  raw coverage 0.781  conformal 0.827  median width -33 ft
  simulated distance within 20 ft of the fence   n  1507  raw coverage 0.799  conformal 0.807  median width -34 ft
  right-handed batters                           n  5535  raw coverage 0.781  conformal 0.806  median width -33 ft
  left-handed batters                            n  4506  raw coverage 0.785  conformal 0.811  median width -33 ft

## Home-run probability for 2500 test fly balls within 60 ft of their own fence (home-run share 0.241)
  deterministic physics prior (carry 1, 0 or 1)        Brier 0.1064   log loss 0.9801
  carry distribution, 24 common draws (what-if inputs) Brier 0.0716   log loss 0.2510
  E3b draws: conformal-widened, tails to 0.1% and 99.9% Brier 0.0718   log loss 0.2469
  plain LightGBM classifier on the same inputs + fence Brier 0.0701   log loss 0.2276
  average of the draws and the classifier              Brier 0.0670
  average of the E3b draws and the classifier          Brier 0.0671
  reliability of the raw draws (predicted bin -> actual home-run share):
    0.0 to 0.1: n 1595  predicted 0.007  actual 0.024   (classifier 0.030)
    0.1 to 0.3: n  220  predicted 0.188  actual 0.236   (classifier 0.242)
    0.3 to 0.5: n  116  predicted 0.387  actual 0.414   (classifier 0.399)
    0.5 to 0.7: n  130  predicted 0.584  actual 0.600   (classifier 0.571)
    0.7 to 0.9: n  241  predicted 0.813  actual 0.809   (classifier 0.789)
    0.9 to 1.0: n  198  predicted 0.942  actual 0.960   (classifier 0.898)
  reliability of the E3b draws (predicted bin -> actual home-run share):
    0.0 to 0.1: n 1584  predicted 0.008  actual 0.022   (classifier 0.029)
    0.1 to 0.3: n  231  predicted 0.190  actual 0.242   (classifier 0.240)
    0.3 to 0.5: n  122  predicted 0.390  actual 0.418   (classifier 0.410)
    0.5 to 0.7: n  131  predicted 0.587  actual 0.595   (classifier 0.576)
    0.7 to 0.9: n  235  predicted 0.812  actual 0.821   (classifier 0.792)
    0.9 to 1.0: n  197  predicted 0.942  actual 0.959   (classifier 0.899)

reading: coverage near 80% in every cohort and a draws-based Brier within noise of the classifier on the same inputs would mean the carry-distribution interface is as good as a plain model while giving a physical band for every park.
