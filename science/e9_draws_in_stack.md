# Physics carry draws inside the production stack (22 Oct 2026)
quantile model fitted on 12324 balls before 2025-03-18, conformal adjustment +0.0059 from 4109 later balls
validation + test balls 248537, eligible by launch box 71390, with a known park 71305
stack rows: validation 44503, test 204034 (balls where every component has a prediction)

## Test Brier (204034 balls; near-wall 11446; Oracle 7068)
  stack (no draws)                   all 0.01321   near-wall 0.1231   Oracle 0.01202
  stack + predict-mode draws         all 0.01320   near-wall 0.1230   Oracle 0.01198
  stack + reconstruct-mode draws     all 0.01235   near-wall 0.1124   Oracle 0.01068
  xgb alone                          all 0.01333   near-wall 0.1238   Oracle 0.01137
  draws alone (predict mode)         all 0.01549   near-wall 0.1407   Oracle 0.01179
  draws alone (reconstruct mode)     all 0.01375   near-wall 0.1194   Oracle 0.01071

## Paired differences (second minus first; negative = draws help)
  predict-mode draws in stack, all                     -0.00001  (95% -0.00001, -0.00000)
  predict-mode draws in stack, near-wall               -0.00010  (95% -0.00017, -0.00002)
  predict-mode draws in stack, Oracle                  -0.00004  (95% -0.00007, -0.00001)
  reconstruct-mode draws in stack, all                 -0.00086  (95% -0.00096, -0.00076)
  reconstruct-mode draws in stack, near-wall           -0.01068  (95% -0.01202, -0.00929)
