"""Engine/session wiring. P3's services get a session via `get_session`
(a FastAPI dependency); scripts (seed, evaluate) use `session_scope()`.
"""
from __future__ import annotations

from collections.abc import Generator, Iterator
from contextlib import contextmanager

from sqlmodel import Session, SQLModel, create_engine

from backend.settings import get_settings

_engine = None


def get_engine():
    global _engine
    if _engine is None:
        settings = get_settings()
        _engine = create_engine(settings.database_url, echo=False)
    return _engine


def init_db() -> None:
    """Create all tables. Good enough for the hackathon prototype;
    swap for Alembic migrations before anything beyond the demo.
    """
    SQLModel.metadata.create_all(get_engine())


def get_session() -> Generator[Session, None, None]:
    with Session(get_engine()) as session:
        yield session


@contextmanager
def session_scope() -> Iterator[Session]:
    with Session(get_engine()) as session:
        yield session
