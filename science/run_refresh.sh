#!/bin/bash
# 8 Nov: refresh test. Refit the v39c tree members on everything through August 2025 (early stopping on September 2025), predict 2026, and pair against the
# members frozen at the end of 2024 on the same 2026 balls. A production question (refit each winter?) as much as a Brier one.
cd "$(dirname "$0")/.."
P=.venv/Scripts/python.exe; D=data/derived; R=$D/bakeoff_features_v39c_refresh26.parquet
$P -W ignore science/make_refresh_split.py --data $D/bakeoff_features_v39c.parquet --out $R --val-from 2025-09-01 --test-from 2026-01-01
for sd in 0 1 2; do
  mkdir -p $D/r26_xgb_s$sd; echo "== xgb refresh seed $sd $(date +%H:%M)"
  SEED=$sd FEATSET=v39 $P -W ignore science/bakeoff.py --data $R --out-dir $D/r26_xgb_s$sd --entrant xgb 2>&1 | grep -E "^xgb|Error|Traceback" | cut -c1-200
done
mkdir -p $D/r26_lgbm_phys; echo "== lgbm_phys refresh $(date +%H:%M)"
FEATSET=v39 $P -W ignore science/bakeoff.py --data $R --out-dir $D/r26_lgbm_phys --entrant lgbm_phys 2>&1 | grep -E "lgbm|Error|Traceback" | cut -c1-200
$P - <<'EOF'
import numpy as np, pandas as pd
D = "data/derived/"
P = [pd.read_parquet(D + f"r26_xgb_s{s}/pred_xgb.parquet").set_index("rid").p_hr for s in range(3)]
ix = P[0].index
pd.DataFrame({"rid": ix, "p_hr": np.mean([p.loc[ix].to_numpy() for p in P], axis=0)}).to_parquet(D + "r26_xgb_avg.parquet")
print("averaged refresh xgb", len(ix))
EOF
pr() { $P -W ignore science/paired.py --data $R --a $1 --b $2 --label-a frozen --label-b refresh 2>&1 | tail -3 | cut -c1-150; }
echo "== 2026 balls: xgb seed 0 frozen vs refresh"; pr $D/v39c_s0/pred_xgb.parquet $D/r26_xgb_s0/pred_xgb.parquet
echo "== 2026 balls: xgb 3-seed frozen vs refresh"; pr $D/v39c_avg/pred_xgb.parquet $D/r26_xgb_avg.parquet
echo "== 2026 balls: lgbm_phys frozen vs refresh"; pr $D/v39c_lgbm_phys/pred_lgbm_phys.parquet $D/r26_lgbm_phys/pred_lgbm_phys.parquet
echo "== refresh finished $(date +%H:%M)"
