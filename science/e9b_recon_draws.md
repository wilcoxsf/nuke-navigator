# Reconstruct-mode models with and without carry draws (22 Oct 2026); test balls 204034
  recon xgb alone              all 0.01058   near-wall 0.0956   Oracle 0.00938
  recon lgbm alone             all 0.01061   near-wall 0.0965   Oracle 0.00922
  recon stack (xgb + lgbm)     all 0.01053   near-wall 0.0954   Oracle 0.00972
  recon stack + draws          all 0.01054   near-wall 0.0954   Oracle 0.00974
  draws alone                  all 0.01375   near-wall 0.1194   Oracle 0.01071

## Paired: recon stack + draws minus recon stack (negative = draws help)
  all                                      +0.00000  (95% -0.00000, +0.00001)
  near-wall                                +0.00004  (95% +0.00000, +0.00008)
  Oracle                                   +0.00001  (95% +0.00000, +0.00003)
