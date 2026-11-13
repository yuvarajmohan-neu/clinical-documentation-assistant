import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import type { Program, Session } from "../api/types";
import type { Principal } from "../auth";
import { Icon } from "../components/Icon";
import { ProgramSelector } from "../components/ProgramSelector";

interface Props {
  principal: Principal;
  program: Program | null;
  session: Session | null;
  onSelectProgram: (p: Program) => void;
  onSelectSession: (s: Session) => void;
  onWrite: () => void;
  onCheck: () => void;
}

export function SessionSetup({
  principal,
  program,
  session,
  onSelectProgram,
  onSelectSession,
  onWrite,
  onCheck,
}: Props) {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const showPicker = principal.programs.length > 1;

  useEffect(() => {
    api
      .programs()
      .then((list) => {
        setPrograms(list);
        // Single-program users skip the picker (program set by role); others start on
        // Article 31, the end-to-end build target.
        if (!program) {
          const mine = list.filter((p) => p.accessible);
          const initial = mine.find((p) => p.id === "article31") ?? mine[0];
          if (initial) onSelectProgram(initial);
        }
      })
      .catch((e: Error) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!program) return;
    setLoading(true);
    api
      .sessions(program.id)
      .then((list) => {
        setSessions(list);
        // Refresh the selected session (its note status may have changed).
        if (session) {
          const fresh = list.find((s) => s.session_id === session.session_id);
          if (fresh) onSelectSession(fresh);
        }
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [program?.id]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q
      ? sessions.filter((s) => s.client.name.toLowerCase().includes(q) || s.client.id.toLowerCase().includes(q))
      : sessions;
  }, [sessions, query]);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Set up your session</h1>
          <p className="lede">
            Choose a program and a session. The session&rsquo;s details are carried into your note so
            you don&rsquo;t have to retype them.
          </p>
        </div>
      </div>
      {error && (
        <div className="alert error" role="alert">
          <Icon name="critical" /> {error}
        </div>
      )}
      <div className="layout-2">
        <div className="stack">
          {showPicker && (
            <section className="card">
              <div className="card-head">
                <span className="step-num">1</span>
                <h2>Program</h2>
                <span className="sp hint">
                  <Icon name="info" /> Only shown when your role covers more than one program.
                </span>
              </div>
              <ProgramSelector programs={programs} selected={program?.id ?? null} onSelect={onSelectProgram} />
            </section>
          )}
          <section className="card">
            <div className="card-head">
              <span className="step-num">{showPicker ? 2 : 1}</span>
              <h2>Session</h2>
              {program && (
                <span className="sp tag">
                  {program.short} · {sessions.length} session{sessions.length === 1 ? "" : "s"}
                </span>
              )}
            </div>
            <div className="input-icon" style={{ marginBottom: 16 }}>
              <Icon name="search" />
              <input
                className="input"
                placeholder="Search by client name or ID"
                aria-label="Search by client name or ID"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            {!program ? (
              <p className="muted">Choose a program first.</p>
            ) : loading ? (
              <p className="muted">Loading sessions…</p>
            ) : filtered.length === 0 ? (
              <p className="muted">No synthetic sessions for this program yet.</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="list">
                  <thead>
                    <tr>
                      <th aria-label="Selected" />
                      <th>Client</th>
                      <th>Date and time</th>
                      <th>Service type</th>
                      <th>Modality</th>
                      <th>Duration</th>
                      <th>Goals</th>
                      <th>Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((s) => {
                      const on = s.session_id === session?.session_id;
                      return (
                        <tr
                          key={s.session_id}
                          className={on ? "sel" : ""}
                          onClick={() => onSelectSession(s)}
                          aria-selected={on}
                        >
                          <td>
                            <span className={`radio${on ? " on" : ""}`} />
                          </td>
                          <td>
                            <b>{s.client.name}</b>
                            <br />
                            <span className="mono">{s.client.id}</span>
                          </td>
                          <td>{s.date_time}</td>
                          <td>{s.service_type}</td>
                          <td>{s.modality}</td>
                          <td>{s.duration_minutes} min</td>
                          <td>
                            <span style={{ display: "inline-flex", gap: 4 }}>
                              {s.goals.map((g) => (
                                <span key={g.goal_id} className="goal">
                                  {g.goal_id}
                                </span>
                              ))}
                            </span>
                          </td>
                          <td>
                            <span className={`tag ${s.note_status.toLowerCase().replace(" ", "-")}`}>
                              {s.note_status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        <aside className="card">
          <h2 style={{ marginBottom: 14 }}>Selected session</h2>
          {session ? (
            <>
              <p className="from-record" style={{ marginBottom: 6 }}>
                <Icon name="record" /> Pre-filled from the synthetic session record
              </p>
              <dl className="kv-list">
                <dt>Client</dt>
                <dd>
                  <b>{session.client.name}</b>
                  <br />
                  <span className="mono">{session.client.id}</span>
                </dd>
                <dt>Date and time</dt>
                <dd>{session.date_time}</dd>
                <dt>Service type</dt>
                <dd>{session.service_type}</dd>
                <dt>Modality</dt>
                <dd>{session.modality}</dd>
                <dt>Duration</dt>
                <dd>{session.duration_minutes} minutes</dd>
                <dt>Note type</dt>
                <dd>{session.note_type}</dd>
              </dl>
              <p className="label" style={{ margin: "18px 0 10px" }}>
                Treatment plan goals
              </p>
              {session.goals.map((g) => (
                <div key={g.goal_id} className="goal-card">
                  <span className="goal">{g.goal_id}</span>
                  <div>
                    {g.description}
                    <br />
                    <span className="small muted">
                      Target {g.target_date_display} · {g.status[0].toUpperCase() + g.status.slice(1)}
                    </span>
                  </div>
                </div>
              ))}
              <div className="stack" style={{ gap: 12, marginTop: 18 }}>
                <button type="button" className="btn btn-primary btn-lg btn-block" onClick={onWrite}>
                  <Icon name="pen" />
                  <span className="two">
                    Write a note
                    <small>Type or dictate session notes, then draft</small>
                  </span>
                  <span className="chev">
                    <Icon name="right" />
                  </span>
                </button>
                <button type="button" className="btn btn-outline btn-lg btn-block" onClick={onCheck}>
                  <Icon name="doc" />
                  <span className="two">
                    Check a note
                    <small>Paste a note written somewhere else</small>
                  </span>
                  <span className="chev">
                    <Icon name="right" />
                  </span>
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="muted" style={{ marginBottom: 16 }}>
                Pick a session to write a note. To check a note written somewhere else, you
                don&rsquo;t need a session.
              </p>
              <button type="button" className="btn btn-outline btn-block" onClick={onCheck} disabled={!program}>
                <Icon name="doc" /> Check a note
              </button>
            </>
          )}
        </aside>
      </div>
      <div className="footer-note">
        <span>Synthetic data only</span>
        <span>Demo API: sessions come from synthetic-data/&lt;program&gt;/sessions.json</span>
      </div>
    </>
  );
}
