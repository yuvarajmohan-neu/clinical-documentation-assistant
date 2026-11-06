from __future__ import annotations

import pytest
from sqlmodel import Session, SQLModel, create_engine

# Import models so SQLModel.metadata knows about every table before create_all.
from backend.db import models  # noqa: F401


@pytest.fixture()
def db_session():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False})
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session
