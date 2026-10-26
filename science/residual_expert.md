# Local residual expert on the v16 XGBoost three-seed average (23 Oct 2026)

## Cross-validation inside the validation slice (4 folds by game, 44503 balls): Brier by lambda
  lambda 0.00: 0.01352
  lambda 0.25: 0.01339
  lambda 0.50: 0.01330
  lambda 1.00: 0.01327
chosen lambda (on validation only): 1.00

## Test slice (204034 balls; near-wall 11446; Oracle 7068), paired by game against the base
  lambda 0.00: Brier 0.01310  | paired vs base: all +0.00000 (-0.00000, +0.00000); near-wall -0.00000 (-0.00000, +0.00000); Oracle +0.00000 (-0.00000, +0.00000)
  lambda 0.25: Brier 0.01303  | paired vs base: all -0.00007 (-0.00009, -0.00005); near-wall -0.00078 (-0.00106, -0.00050); Oracle +0.00010 (+0.00002, +0.00019)
  lambda 0.50: Brier 0.01301  | paired vs base: all -0.00009 (-0.00013, -0.00006); near-wall -0.00098 (-0.00154, -0.00043); Oracle +0.00024 (+0.00008, +0.00041)
  lambda 1.00: Brier 0.01312  | paired vs base: all +0.00002 (-0.00006, +0.00008); near-wall +0.00032 (-0.00078, +0.00143); Oracle +0.00062 (+0.00029, +0.00097)  <- chosen on validation

reading: only the lambda chosen on validation counts; a gain must reach 0.0001 with an interval clear of zero, otherwise the expert is dropped.
