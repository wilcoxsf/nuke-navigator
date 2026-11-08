#!/bin/bash
# 8 Nov: carry the refreshed tree members (refit on data through Aug 2025) through the whole champion recipe for 2026 balls: hybrid member files (frozen
# before 2026, refreshed in 2026), S3 stack, layer (venue offsets + in-game carry), rolling meta, 50/50 blend; pair against the champion on 2026 balls.
cd "$(dirname "$0")/.."
P=.venv/Scripts/python.exe; D=data/derived; R=$D/bakeoff_features_v39c_refresh26.parquet
mkdir -p $D/r26
$P - <<'EOF'
import pandas as pd
D = "data/derived/"
t26 = pd.read_parquet(D + "bakeoff_features_v39c_refresh26.parquet", columns=["rid", "split"]); t26 = set(t26.rid[t26.split == "test"])
for name, frozen, fresh in (("xgb", "v39c_avg/pred_xgb.parquet", "r26_xgb_avg.parquet"), ("lgb", "v39c_lgbm_phys/pred_lgbm_phys.parquet", "r26_lgbm_phys/pred_lgbm_phys.parquet")):
    a = pd.read_parquet(D + frozen)[["rid", "p_hr"]].set_index("rid").p_hr
    b = pd.read_parquet(D + fresh)[["rid", "p_hr"]].set_index("rid").p_hr
    ix = [r for r in b.index if r in t26]
    a.loc[ix] = b.loc[ix]
    a.reset_index().to_parquet(D + f"r26/{name}.parquet"); print(name, "hybrid", len(a), "refreshed rows", len(ix))
EOF
C="xgb=$D/r26/xgb.parquet phys=$D/v7_stack/pred_diffphys_v3b.parquet lgb=$D/r26/lgb.parquet cat=$D/v39b_cat/pred_cat.parquet mlp=$D/e49a_wide/pred_mlp.parquet mlplong=$D/e49b_wide_long/pred_mlp.parquet mlpwider=$D/e51_wider/pred_mlp.parquet"
echo "== stack"; $P -W ignore science/final_stack.py --comp $C --out $D/r26/S3.parquet 2>&1 | tail -2 | cut -c1-200
echo "== layer"; $P -W ignore science/posthoc_memory.py --pred $D/r26/S3.parquet --write data/derived/r26/S3_layer.parquet 2>&1 | tail -1
echo "== meta"
M="xgb=r26/xgb.parquet,phys=v7_stack/pred_diffphys_v3b.parquet,lgb=r26/lgb.parquet,cat=v39b_cat/pred_cat.parquet,mlp=e49a_wide/pred_mlp.parquet,mlplong=e49b_wide_long/pred_mlp.parquet,mlpwider=e51_wider/pred_mlp.parquet"
$P -W ignore science/meta_rolling.py --pred $D/r26/S3.parquet --members $M --trees 200 --minleaf 1500 --tag r26 2>&1 | grep -v "^\[" | tail -1
$P -W ignore science/blend_preds.py --data $D/bakeoff_features_v5r.parquet --a $D/r26/S3_layer.parquet --b $D/meta_r26.parquet --out $D/r26/blend.parquet >/dev/null 2>&1
pr() { $P -W ignore science/paired.py --data $R --a $1 --b $2 --label-a champ --label-b refresh 2>&1 | tail -3 | cut -c1-150; }
echo "== 2026 balls: layer frozen vs refreshed"; pr $D/final8/S3_layer.parquet $D/r26/S3_layer.parquet
echo "== 2026 balls: champion blend vs refreshed blend"; pr $D/blend_c25_t200_m1500.parquet $D/r26/blend.parquet
echo "== e2e finished $(date +%H:%M)"
