from datetime import datetime, timezone

from backend.util.time_et import format_et, now, set_clock


def test_format_et_matches_claude_md_example():
    # CLAUDE.md: "11/6/2026 2:05 PM ET" — 2026-11-06 19:05 UTC is 2:05 PM EST.
    dt = datetime(2026, 11, 6, 19, 5, tzinfo=timezone.utc)
    assert format_et(dt) == "11/6/2026 2:05 PM ET"


def test_clock_can_be_fixed_for_deterministic_tests():
    fixed = datetime(2026, 11, 6, 19, 5, tzinfo=timezone.utc)
    set_clock(fixed)
    try:
        assert now() == fixed
    finally:
        set_clock(None)
