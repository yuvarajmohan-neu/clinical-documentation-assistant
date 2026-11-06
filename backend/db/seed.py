"""Load synthetic-data/<program>/{clients,sessions}.json into the DB.

Usage:
    python -m backend.db.seed --program article31
    python -m backend.db.seed --all

Idempotent on external_id: re-running updates existing rows instead of
duplicating them, so the seed can be re-run after editing synthetic data.
"""
from __future__ import annotations

import argparse
import json
from datetime import datetime
from pathlib import Path

from sqlmodel import Session, select

from backend.db.models import Client, ClinicalSession
from backend.db.session import get_engine, init_db
from backend.providers.types import Program

REPO_ROOT = Path(__file__).resolve().parents[2]
SYNTHETIC_DATA_DIR = REPO_ROOT / "synthetic-data"


def _load_json(path: Path) -> list[dict]:
    if not path.exists():
        return []
    with path.open(encoding="utf-8") as f:
        return json.load(f)


def seed_program(session: Session, program: str) -> tuple[int, int]:
    program_dir = SYNTHETIC_DATA_DIR / program
    clients_raw = _load_json(program_dir / "clients.json")
    sessions_raw = _load_json(program_dir / "sessions.json")

    external_id_to_db_id: dict[str, str] = {}
    client_count = 0
    for c in clients_raw:
        existing = session.exec(
            select(Client).where(
                Client.program == program, Client.external_id == c["external_id"]
            )
        ).first()
        if existing:
            existing.name = c["name"]
            existing.dob = c["dob"]
            existing.diagnosis_summary = c.get("diagnosis_summary")
            existing.goals = c.get("goals", [])
            session.add(existing)
            external_id_to_db_id[c["external_id"]] = existing.id
        else:
            row = Client(
                program=program,
                external_id=c["external_id"],
                name=c["name"],
                dob=c["dob"],
                diagnosis_summary=c.get("diagnosis_summary"),
                goals=c.get("goals", []),
            )
            session.add(row)
            session.flush()
            external_id_to_db_id[c["external_id"]] = row.id
        client_count += 1
    session.commit()

    session_count = 0
    for s in sessions_raw:
        client_db_id = external_id_to_db_id.get(s["client_external_id"])
        if client_db_id is None:
            raise ValueError(
                f"sessions.json references unknown client_external_id={s['client_external_id']!r} "
                f"in program {program!r}"
            )
        row = ClinicalSession(
            program=program,
            client_id=client_db_id,
            scheduled_at=datetime.fromisoformat(s["scheduled_at"]),
            service_type=s["service_type"],
            modality=s["modality"],
            duration_minutes=s["duration_minutes"],
            goal_ids=s.get("goal_ids", []),
        )
        session.add(row)
        session_count += 1
    session.commit()

    return client_count, session_count


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--program", choices=[p.value for p in Program])
    group.add_argument("--all", action="store_true")
    args = parser.parse_args()

    init_db()
    programs = [p.value for p in Program] if args.all else [args.program]

    with Session(get_engine()) as session:
        for program in programs:
            clients, sessions = seed_program(session, program)
            print(f"[{program}] seeded {clients} client(s), {sessions} session(s)")


if __name__ == "__main__":
    main()
