"""Eastern-time display helper. Storage is always UTC; this is formatting only.

docs/architecture.md §2.4: "All timestamps are stored in UTC and shown as
M/D/YYYY h:mm AM/PM ET using zoneinfo('America/New_York')."
Injectable clock (§2.10) so tests and demo data get repeatable results.
"""
from __future__ import annotations

from datetime import datetime, timezone
from zoneinfo import ZoneInfo

_EASTERN = ZoneInfo("America/New_York")

_clock: list = []  # stack of overridden "now" values, for tests/demos only


def now() -> datetime:
    """Current UTC time, or the top of the override stack if one is set."""
    if _clock:
        return _clock[-1]
    return datetime.now(timezone.utc)


def set_clock(fixed: datetime | None) -> None:
    """Fix or release the clock. Pass a tz-aware UTC datetime, or None to release."""
    _clock.clear()
    if fixed is not None:
        if fixed.tzinfo is None:
            raise ValueError("set_clock requires a tz-aware datetime")
        _clock.append(fixed)


def format_et(dt: datetime) -> str:
    """Render a UTC datetime as '11/6/2026 2:05 PM ET'."""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    eastern = dt.astimezone(_EASTERN)
    month, day, year = eastern.month, eastern.day, eastern.year
    hour12 = eastern.strftime("%I").lstrip("0") or "12"
    minute = eastern.strftime("%M")
    ampm = eastern.strftime("%p")
    return f"{month}/{day}/{year} {hour12}:{minute} {ampm} ET"
