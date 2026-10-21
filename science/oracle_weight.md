# T4: Oracle Park weighting and fine-tuning

Test: games from 2025-06-01 on. Oracle home games: 7,068 balls (970 near the wall); other parks 196,966. Differences against `base` (negative is better), 95% interval over games.

| Variant | Oracle Brier (all) | vs base | Oracle near the wall | vs base | Other parks Brier | vs base |
|---|---|---|---|---|---|---|
| base | 0.01181 | +0.00000 (+0.00000, +0.00000) | 0.0838 | +0.0000 (+0.0000, +0.0000) | 0.01361 | +0.00000 (+0.00000, +0.00000) |
| w3 | 0.01174 | -0.00007 (-0.00043, +0.00028) | 0.0831 | -0.0007 (-0.0032, +0.0018) | 0.01366 | +0.00006 (-0.00001, +0.00012) |
| w10 | 0.01198 | +0.00017 (-0.00027, +0.00068) | 0.0846 | +0.0008 (-0.0023, +0.0044) | 0.01373 | +0.00012 (+0.00004, +0.00020) |
| finetune | 0.01165 | -0.00016 (-0.00043, +0.00009) | 0.0825 | -0.0013 (-0.0032, +0.0006) | 0.01400 | +0.00039 (+0.00033, +0.00046) |
