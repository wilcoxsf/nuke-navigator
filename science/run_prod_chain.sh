#!/bin/bash
# The production chain (9 Nov 2026): the whole champion recipe rebuilt once from the production base table (science/prod_base.py: the research balls plus the
# sealed 2026 postseason), with every fitted model SAVED (modelstore.py, NN_STORE_MODE=save) so new games can be scored later without retraining. Writes only
# under data/prod (or data/prod_smoke); the research tables in data/derived are read, never written. Sealed rows are split "post": predicted like test rows,
# never trained on, never in a printed score. Commands and settings are the research ones (run_round2c.sh, run_night4.sh, run_night5.sh, run_night8.sh,
# run_fence_v3b.sh, the champion of 8 Nov); the explorer's map of the chain is in Documents/NukeNavigator/PROD-PIPELINE.md.
#   SMOKE=1 bash science/run_prod_chain.sh   a small run (2024 on, one-epoch nets, small trees) into data/prod_smoke, to catch crashes
#   bash science/run_prod_chain.sh           the full run into data/prod, about 9 to 10 hours
cd "$(dirname "$0")"
PY=../.venv/Scripts/python.exe; R=../data/derived
if [ "$SMOKE" = "1" ]; then P=../data/prod_smoke; LIM="--limit-year 2024"; EP="--epochs 1 --seeds 1"; EPL="--epochs 1 --seeds 1"; DPE="--epochs 1"; export XGB_N=60; LOGM=""; OOF="--seeds 1 --epochs 1"
else P=../data/prod; LIM=""; EP=""; EPL="--epochs 20"; DPE="--epochs 6"; LOGM="--logm $R/bakeoff_features_v10.parquet.logm.npy"; OOF="--seeds 2"; fi
mkdir -p $P
export NN_D=$P NN_STORE=$P/models NN_STORE_MODE=${PROD_MODE:-save}  # (10 Nov: PROD_MODE=load replays the saved models, no training)
echo "== mode $NN_STORE_MODE"
B=../data/prod; G=$B/game_context
Z() { $PY -W ignore "$@"; }
st() { echo "== $1 $(date +%H:%M)"; }
die() { echo "!! FAILED at $1 $(date +%H:%M)"; exit 1; }
set -o pipefail

st exp_features;   Z exp_data.py --bbe $B/bbe_prod.parquet --games $G/games.parquet --weather $G/game_weather.parquet --out $P/exp_features.parquet $LIM 2>&1 | grep -E "^(loaded|pools|wrote)|Error|Traceback" || die exp
if [ "$SMOKE" != "1" ]; then  # the research rows must sit in the research order, so cached labels and row ids line up
  Z - <<'EOF' || die alignment
import pandas as pd
a = pd.read_parquet("../data/derived/exp_features.parquet", columns=["game_pk", "at_bat_number", "pitch_number"])
b = pd.read_parquet("../data/prod/exp_features.parquet", columns=["game_pk", "at_bat_number", "pitch_number", "sealed"])
n = len(a); ok = (b.iloc[:n][["game_pk", "at_bat_number", "pitch_number"]].to_numpy() == a.to_numpy()).all() and b.iloc[n:].sealed.fillna(False).astype(bool).all() and not b.iloc[:n].sealed.fillna(False).astype(bool).any()
print("alignment: research rows", n, "in research order:", bool(ok), "| sealed rows appended:", len(b) - n)
raise SystemExit(0 if ok else 1)
EOF
fi
Z - <<'EOF' || die keys
import os, pandas as pd
P = os.environ["NN_D"]
pd.read_parquet(P + "/exp_features.parquet", columns=["rid", "batter", "pitcher", "at_bat_number", "pitch_number"]).to_parquet(P + "/bakeoff_features.parquet")
print("bakeoff_features (keys for the layer and meta) written")
EOF
st v3;  Z bakeoff_data.py --exp $P/exp_features.parquet --games $G/games.parquet --college $R/trackman_college_bbe.parquet --params flight_fit_results_params.json --out $P/bakeoff_features_v3.parquet 2>&1 | grep -E "^(rows|bearing_hat|wrote)|Error|Traceback" || die v3
st v5;  Z direction_c5_features.py --data $P/bakeoff_features_v3.parquet --out $P/bakeoff_features_v5.parquet 2>&1 | grep -E "^(fold|test|wrote)|Error|Traceback" || die v5
st v5r; Z contact_surprise.py --data $P/bakeoff_features_v5.parquet --exp $P/exp_features.parquet --out $P/bakeoff_features_v5r.parquet 2>&1 | grep -E "R2|wrote|Error|Traceback" || die v5r
st v10; Z carry_features.py --data $P/bakeoff_features_v5r.parquet --out $P/bakeoff_features_v10.parquet $LOGM 2>&1 | grep -E "R2|written|Error|Traceback" || die v10
st v19; Z direct_distance.py --data $P/bakeoff_features_v5r.parquet --out $P/bakeoff_features_v19.parquet 2>&1 | grep -E "MAE|written|Error|Traceback" || die v19
st v30; Z distance_aux2.py --data $P/bakeoff_features_v19.parquet --out $P/bakeoff_features_v30.parquet 2>&1 | grep -E "MAE|written|Error|Traceback" || die v30
st v36; Z distance_bat.py --data $P/bakeoff_features_v30.parquet --out $P/bakeoff_features_v36.parquet 2>&1 | grep -E "MAE|written|Error|Traceback" || die v36
st v35; Z league_drift_features.py --v19 $P/bakeoff_features_v19.parquet --v10 $P/bakeoff_features_v10.parquet --out $P/bakeoff_features_v35.parquet 2>&1 | grep -E "written|Error|Traceback" || die v35
st v37; Z merge_features.py --base $P/bakeoff_features_v36.parquet --drift $P/bakeoff_features_v35.parquet --out $P/bakeoff_features_v37.parquet 2>&1 | grep -E "written|Error|Traceback" || die v37
st e48;  FEATSET=v37 Z mlp_aux3.py --data $P/bakeoff_features_v37.parquet --out-dir $P/e48_oof --variant everything --oof 4 $OOF 2>&1 | grep -E "fold . done|oof train|Error|Traceback" | cut -c1-200 || die e48
Z merge_mlp_oof.py --base $P/bakeoff_features_v37.parquet --oof $P/e48_oof/mlp_oof.parquet --out $P/bakeoff_features_v39b.parquet 2>&1 | grep -E "written|Error|Traceback" || die v39b
st e50;  FEATSET=v37 Z mlp_aux3.py --data $P/bakeoff_features_v37.parquet --out-dir $P/e50_oof --variant everything --hidden 512,256,128 --swa 3 --oof 4 $OOF 2>&1 | grep -E "fold . done|oof train|Error|Traceback" | cut -c1-200 || die e50
Z merge_mlp_oof.py --base $P/bakeoff_features_v37.parquet --oof $P/e50_oof/mlp_oof.parquet --out $P/bakeoff_features_v39c.parquet 2>&1 | grep -E "written|Error|Traceback" || die v39c
# ---- the seven members ----
for sd in 0 1 2; do st "xgb seed $sd"; mkdir -p $P/v39c_s$sd; SEED=$sd FEATSET=v39 Z bakeoff.py --data $P/bakeoff_features_v39c.parquet --out-dir $P/v39c_s$sd --entrant xgb 2>&1 | grep -E "^xgb done|Error|Traceback" | cut -c1-200 || die xgb$sd; done
mkdir -p $P/v39c_avg; Z - <<'EOF' || die xgbavg
import os, numpy as np, pandas as pd
P = os.environ["NN_D"] + "/"
Q = [pd.read_parquet(P + f"v39c_s{s}/pred_xgb.parquet").set_index("rid").p_hr for s in range(3)]
ix = Q[0].index
pd.DataFrame({"rid": ix, "p_hr": np.mean([q.loc[ix].to_numpy() for q in Q], axis=0)}).to_parquet(P + "v39c_avg/pred_xgb.parquet"); print("averaged xgb", len(ix))
EOF
st lgbm_phys; mkdir -p $P/v39c_lgbm_phys; FEATSET=v39 Z bakeoff.py --data $P/bakeoff_features_v39c.parquet --out-dir $P/v39c_lgbm_phys --entrant lgbm_phys 2>&1 | grep -E "done|Error|Traceback" | cut -c1-200 || die lgbm
st cat; mkdir -p $P/v39b_cat; FEATSET=v39 Z bakeoff.py --data $P/bakeoff_features_v39b.parquet --out-dir $P/v39b_cat --entrant cat 2>&1 | grep -E "done|Error|Traceback" | cut -c1-200 || die cat
st diffphys; FEATSET=v2 Z diffphys.py --data $P/bakeoff_features_v3.parquet --college $R/trackman_college_bbe.parquet --params flight_fit_results_params.json --out-dir $P/bakeoff_v3 $DPE --seeds 1 --name diffphys_v3b --teacher v3 --learn-fence 2>&1 | grep -E "done|Error|Traceback" | cut -c1-200 || die diffphys
mkdir -p $P/v7_stack; cp $P/bakeoff_v3/pred_diffphys_v3b.parquet $P/v7_stack/pred_diffphys_v3b.parquet
w() { n=$1; shift; st $n; mkdir -p $P/$n; FEATSET=v37 Z mlp_aux3.py --data $P/bakeoff_features_v37.parquet --out-dir $P/$n --variant everything "$@" 2>&1 | grep -E "done|Error|Traceback" | cut -c1-200 || die $n; }
if [ "$SMOKE" = "1" ]; then w e49a_wide --hidden 512,256,128 --swa 3 $EP; w e49b_wide_long --hidden 512,256,128 --swa 3 $EP; w e51_wider --hidden 1024,512,256 --swa 3 $EP
else w e49a_wide --hidden 512,256,128 --seeds 5 --swa 3; w e49b_wide_long --hidden 512,256,128 --seeds 5 --swa 3 --epochs 20; w e51_wider --hidden 1024,512,256 --seeds 3 --swa 3; fi
# ---- the stack, the layer, the meta and the blend (2025-26 test rows; the sealed rows wait for score_lockbox.py) ----
st stack; mkdir -p $P/final8
Z final_stack.py --comp xgb=$P/v39c_avg/pred_xgb.parquet phys=$P/v7_stack/pred_diffphys_v3b.parquet lgb=$P/v39c_lgbm_phys/pred_lgbm_phys.parquet cat=$P/v39b_cat/pred_cat.parquet mlp=$P/e49a_wide/pred_mlp.parquet mlplong=$P/e49b_wide_long/pred_mlp.parquet mlpwider=$P/e51_wider/pred_mlp.parquet --out $P/final8/S3.parquet 2>&1 | cut -c1-260 || die stack
st layer; Z posthoc_memory.py --pred ${P#../}/final8/S3.parquet --write ${P#../}/final8/S3_layer.parquet --score-post 2>&1 | grep -E "^gm |wrote|Error|Traceback" | cut -c1-200 || die layer
st meta;  Z meta_rolling.py --base S3 --trees 200 --minleaf 1500 --tag prod --score-post 2>&1 | grep -v "^\[" | tail -1 | cut -c1-220 || die meta
Z blend_preds.py --data $P/bakeoff_features_v5r.parquet --a $P/final8/S3_layer.parquet --b $P/meta_prod.parquet --out $P/blend_prod.parquet 2>&1 | tail -1 || die blend
st logit; mkdir -p $P/logit; Z bakeoff.py --data $P/bakeoff_features_v39c.parquet --out-dir $P/logit --entrant logit 2>&1 | grep -E "done|Error|Traceback" | cut -c1-200 || die logit  # (the contact-only reference for the lockbox)
st parity; Z prod_parity.py 2>&1 | tail -12 || die parity
if [ "$SMOKE" != "1" ]; then
  st "check against the research champion (2025-26 test balls; same row ids)"
  Z paired.py --data $R/bakeoff_features_v5r.parquet --a $R/blend_c25_t200_m1500.parquet --b $P/blend_prod.parquet --label-a research --label-b prod 2>&1 | tail -3 | cut -c1-160
  Z paired.py --data $R/bakeoff_features_v5r.parquet --a $R/v39c_avg/pred_xgb.parquet --b $P/v39c_avg/pred_xgb.parquet --label-a research_xgb --label-b prod_xgb 2>&1 | tail -3 | cut -c1-160
fi
echo "== chain finished $(date +%H:%M)"; ls $P/models | head -30
