"""The one test that replaces the old governance: a Predicted model cannot see post-contact data."""
import pytest

import arena
from features import assert_clean


def test_post_contact_columns_are_rejected():
    for col in ["hc_x", "hc_y", "endpoint_bearing_deg", "hit_distance_sc", "bb_type", "events"]:
        with pytest.raises(ValueError):
            assert_clean(["launch_speed", col])


def test_unknown_columns_are_rejected():
    with pytest.raises(ValueError):
        assert_clean(["launch_speed", "some_new_column"])


def test_contact_and_pre_columns_pass():
    assert_clean(["launch_speed", "launch_angle", "stand", "home_team", "weather_temp_f"])


def test_every_arena_model_uses_only_clean_features():
    for name, cols in arena.PREDICT_FEATURES.items():
        assert_clean(cols, job=name)
