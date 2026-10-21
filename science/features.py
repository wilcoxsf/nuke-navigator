"""When is each column knowable? This registry is the whole leakage policy.

A Predicted model may only use PRE and CONTACT features. POST columns describe where
or how the ball ended up (or are derived from that), and LABEL columns are targets.
Anything not listed here is rejected, so adding a column forces a decision.
"""
from __future__ import annotations

PRE = "pre_pitch"          # known before the pitch (park, handedness, weather at first pitch)
CONTACT = "contact"        # measured at the moment of contact
POST = "post_contact"      # observed after contact, or derived from it
LABEL = "label"            # a target
ID = "id"                  # keys, never features

FEATURES: dict[str, str] = {
    # keys
    "game_pk": ID, "game_date": ID, "at_bat_number": ID, "pitch_number": ID, "batter": ID,
    # pre-pitch
    "game_year": PRE, "hawkeye": PRE, "home_team": PRE, "away_team": PRE, "stand": PRE, "p_throws": PRE,
    "stand_r": PRE,  # 1.0 if stand == "R"; derived from `stand`
    "weather_temp_f": PRE, "wind_speed_mph": PRE, "day_night": PRE,
    "pitch_type": PRE, "release_speed": PRE, "release_spin_rate": PRE, "plate_x": PRE, "plate_z": PRE,
    # weather and park (known before first pitch)
    "om_temp_f": PRE, "om_rh": PRE, "om_pressure_hpa": PRE, "air_density": PRE, "om_wind_u": PRE, "om_wind_v": PRE,
    "om_wind_mph": PRE, "om_gust_mph": PRE, "om_precip_mm": PRE, "elevation_ft": PRE, "roof": PRE, "turf": PRE,
    # pitch details (known when the pitch is thrown)
    "spin_axis": PRE, "effective_speed": PRE, "release_extension": PRE, "pfx_x": PRE, "pfx_z": PRE, "balls": PRE,
    "strikes": PRE, "zone": PRE,
    # rolling history from strictly earlier batted balls
    "b_ev": PRE, "b_la": PRE, "b_hr": PRE, "b_hard": PRE, "b_pull": PRE, "b_n": PRE, "b_bat_speed": PRE, "p_ev": PRE, "p_hr": PRE,
    # round-2 raw columns. Pitch and context items are known when the pitch is thrown; the intercept is measured at contact.
    "release_pos_x": PRE, "release_pos_y": PRE, "release_pos_z": PRE, "vx0": PRE, "vy0": PRE, "vz0": PRE, "ax": PRE, "ay": PRE, "az": PRE,
    "sz_top": PRE, "sz_bot": PRE, "arm_angle": PRE, "api_break_z_with_gravity": PRE, "api_break_x_arm": PRE, "api_break_x_batter_in": PRE,
    "age_bat": PRE, "age_pit": PRE, "n_thruorder_pitcher": PRE, "n_priorpa_thisgame_player_at_bat": PRE,
    "pitcher_days_since_prev_game": PRE, "batter_days_since_prev_game": PRE, "bat_score": PRE, "fld_score": PRE,
    "outs_when_up": PRE, "inning": PRE, "on_1b": PRE, "on_2b": PRE, "on_3b": PRE,
    "if_fielding_alignment": PRE, "of_fielding_alignment": PRE,
    "intercept_ball_minus_batter_pos_x_inches": CONTACT, "intercept_ball_minus_batter_pos_y_inches": CONTACT,
    # round-2 engineered columns (exp_data.py): all functions of the raw legal columns above or of strictly earlier balls
    "vaa": PRE, "haa": PRE, "plate_speed": PRE, "plate_z_rel": PRE, "score_diff": PRE, "runners_on": PRE,
    "days_since_2015": PRE, "park_year": PRE, "b_hr_500": PRE, "b_ev_500": PRE, "b_hard_500": PRE, "p_hr_500": PRE, "p_ev_500": PRE,
    "intercept_x": CONTACT, "intercept_y": CONTACT, "intercept_x_field": CONTACT, "intercept_dist": CONTACT,
    "dyn_loft": CONTACT, "attack_dir_field": CONTACT, "ev_over_pitch": CONTACT, "squared_up": CONTACT, "swing_speed_per_len": CONTACT,
    "ev_minus_bat": CONTACT, "bat_minus_pitch": CONTACT,
    "sw_attack_angle": PRE, "sw_attack_dir": PRE, "sw_length": PRE, "sw_bat_speed": PRE, "sw_intercept_x": PRE, "sw_intercept_y": PRE,
    # physics and fence features derived only from legal inputs (contact, pitch, weather, park, estimated direction)
    "phys_dist": CONTACT, "phys_hang": CONTACT, "fence_hat": CONTACT, "margin_hat": CONTACT, "park_cf": PRE, "park_lf": PRE, "park_rf": PRE,
    # distilled estimate: trained on the post-contact bearing as a label, but it only ever sees legal inputs
    "bearing_hat": CONTACT,
    # contact
    "launch_speed": CONTACT, "launch_angle": CONTACT,
    "bat_speed": CONTACT, "swing_length": CONTACT, "attack_angle": CONTACT,
    "attack_direction": CONTACT, "swing_path_tilt": CONTACT,
    # post-contact (never allowed in a Predicted model)
    "hc_x": POST, "hc_y": POST, "field_x_ft": POST, "field_y_ft": POST,
    "endpoint_radius_ft": POST, "endpoint_bearing_deg": POST,
    "bb_type": POST, "events": POST, "hit_location": POST,
    "launch_speed_angle": POST, "estimated_ba_using_speedangle": POST,
    "estimated_woba_using_speedangle": POST, "estimated_slg_using_speedangle": POST,
    "hyper_speed": POST, "delta_home_win_exp": POST, "delta_run_exp": POST,
    # labels
    "is_home_run": LABEL, "hit_distance_sc": LABEL,
}

ALLOWED_FOR_PREDICTION = {PRE, CONTACT}


def assert_clean(columns: list[str], job: str = "predict") -> None:
    """Raise if a Predicted model would use an unknown, post-contact, label or id column."""
    bad = []
    for c in columns:
        tag = FEATURES.get(c)
        if tag is None:
            bad.append(f"{c}: not in the registry")
        elif tag not in ALLOWED_FOR_PREDICTION:
            bad.append(f"{c}: tagged {tag}")
    if bad:
        raise ValueError(f"{job} model uses disallowed columns -> " + "; ".join(bad))
