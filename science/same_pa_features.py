"""Same-plate-appearance swing state (GPT round 2, idea 2). For each ball in play (2023 on, when bat tracking exists), what do we know about the batter's EARLIER fouls in the same
plate appearance? A foul is an observed swing on the same pitcher, same game, a pitch or two before: how late or early the bat was, how fast, where the ball met it. Strictly earlier
pitches only (pitch_number below the current one). Whiffs are not in the pulled foul table, so this is fouls only. Output: data/derived/same_pa_features.parquet keyed by rid.
Columns: pa_n_fouls (count), pa_last_* (the most recent foul's swing and contact), pa_mean_* (mean over prior fouls), pa_d_* (this swing minus the last foul's), pa_dpx / pa_dpz /
pa_dspeed (this pitch minus the fouled pitch), pa_same_type, pa_gap (pitches since the last foul)."""
import numpy as np
import pandas as pd

D = "C:/Users/andrewwi/dev/nuke-navigator-new/data/"
cur = pd.read_parquet(D + "derived/exp_features.parquet", columns=["rid", "game_pk", "at_bat_number", "pitch_number", "game_year", "stand_r", "bat_speed", "swing_length", "attack_angle", "attack_dir_field", "swing_path_tilt",
                                                                    "intercept_x_field", "intercept_y", "plate_x", "plate_z", "release_speed", "pitch_type"])
cur = cur[cur.game_year >= 2023].copy()
fl = pd.read_parquet(D + "raw/fouls/fouls_2023_2026.parquet", columns=["game_pk", "at_bat_number", "pitch_number", "description", "stand", "bat_speed", "swing_length", "attack_angle", "attack_direction", "swing_path_tilt",
                                                                       "intercept_ball_minus_batter_pos_x_inches", "intercept_ball_minus_batter_pos_y_inches", "launch_speed", "launch_angle", "hit_distance_sc", "plate_x", "plate_z",
                                                                       "release_speed", "pitch_type"])
fl = fl[fl.description.isin(["foul", "foul_tip"])].copy()
sgn = np.where(fl.stand == "R", 1.0, -1.0)
fl["attack_dir_field"] = fl.attack_direction * sgn
fl["intercept_x_field"] = fl.intercept_ball_minus_batter_pos_x_inches * sgn
fl["intercept_y"] = fl.intercept_ball_minus_batter_pos_y_inches
keep = ["game_pk", "at_bat_number", "pitch_number", "bat_speed", "swing_length", "attack_angle", "attack_dir_field", "swing_path_tilt", "intercept_x_field", "intercept_y", "launch_speed", "launch_angle", "hit_distance_sc", "plate_x", "plate_z", "release_speed", "pitch_type"]
fl = fl[keep].rename(columns={c: "f_" + c for c in keep if c not in ("game_pk", "at_bat_number")})
print("balls in play 2023+:", len(cur), "fouls:", len(fl))
m = cur[["rid", "game_pk", "at_bat_number", "pitch_number"]].merge(fl, on=["game_pk", "at_bat_number"], how="inner")
m = m[m.f_pitch_number < m.pitch_number]
print("ball-foul pairs (earlier foul in the same PA):", len(m))
agg = m.groupby("rid").agg(pa_n_fouls=("f_pitch_number", "size"), pa_mean_bat_speed=("f_bat_speed", "mean"), pa_mean_attack_dir=("f_attack_dir_field", "mean"), pa_mean_attack_angle=("f_attack_angle", "mean"))
last = m.sort_values("f_pitch_number").groupby("rid").tail(1).set_index("rid")
out = agg.join(last.drop(columns=["game_pk", "at_bat_number", "pitch_number"]).rename(columns={c: c.replace("f_", "pa_last_", 1) for c in last.columns if c.startswith("f_")}))
c2 = cur.set_index("rid")
j = out.join(c2[["pitch_number", "bat_speed", "attack_angle", "attack_dir_field", "intercept_x_field", "intercept_y", "plate_x", "plate_z", "release_speed", "pitch_type", "swing_path_tilt"]])
out["pa_d_bat_speed"] = j.bat_speed - j.pa_last_bat_speed
out["pa_d_attack_angle"] = j.attack_angle - j.pa_last_attack_angle
out["pa_d_attack_dir"] = j.attack_dir_field - j.pa_last_attack_dir_field
out["pa_d_icx"] = j.intercept_x_field - j.pa_last_intercept_x_field
out["pa_d_icy"] = j.intercept_y - j.pa_last_intercept_y
out["pa_d_tilt"] = j.swing_path_tilt - j.pa_last_swing_path_tilt
out["pa_dpx"] = j.plate_x - j.pa_last_plate_x
out["pa_dpz"] = j.plate_z - j.pa_last_plate_z
out["pa_dspeed"] = j.release_speed - j.pa_last_release_speed
out["pa_same_type"] = (j.pitch_type == j.pa_last_pitch_type).astype("float32")
out["pa_gap"] = j.pitch_number - j.pa_last_pitch_number
out = out.drop(columns=["pa_last_pitch_type", "pa_last_pitch_number"]).reset_index()
full = cur[["rid"]].merge(out, on="rid", how="left")
full["pa_n_fouls"] = full.pa_n_fouls.fillna(0)
for c in full.columns:
    if c != "rid":
        full[c] = full[c].astype("float32")
full.to_parquet(D + "derived/same_pa_features.parquet", index=False)
print("rows", len(full), "with at least one prior foul:", int((full.pa_n_fouls > 0).sum()), f"({(full.pa_n_fouls > 0).mean():.1%})")
print("with tracked swing metrics on the last foul:", int(full.pa_last_attack_dir_field.notna().sum()))
print(full.pa_n_fouls.value_counts().sort_index().head(6).to_dict())
