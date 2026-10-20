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
    "weather_temp_f": PRE, "wind_speed_mph": PRE, "day_night": PRE,
    "pitch_type": PRE, "release_speed": PRE, "release_spin_rate": PRE, "plate_x": PRE, "plate_z": PRE,
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
