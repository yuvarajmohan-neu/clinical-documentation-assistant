import { useState } from "react";
import { api } from "../api/client";
import type { Note, Program, Session } from "../api/types";
import { DictationBox } from "../components/DictationBox";
import { Icon } from "../components/Icon";
import { SAMPLE_SESSION_NOTES } from "../demo/sampleInput";

interface Props {
  program: Program;
  session: Session;
  text: string;
  onTextChange: (t: string) => void;
  onBack: () => void;
  onDrafted: (n: Note) => void;
}

export function WriteNote({ program, session, text, onTextChange, onBack, onDrafted }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sample = SAMPLE_SESSION_NOTES[session.session_id];

  const draft = async () => {
    setBusy(true);
    setError(null);
    try {
      // One call: draft + rule checks + content checks + follow-up questions.
      onDrafted(await api.draft(session.session_id, text));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <nav className="crumbs" aria-label="Breadcrumb">
        <button type="button" onClick={onBack}>
          Session setup
        </button>
        <Icon name="right" />
        <b>Write a note</b>
      </nav>
      <div className="page-head">
        <div>
          <h1>Write a note</h1>
          <p className="lede">
            Type or dictate what happened in the session. The assistant drafts the note in the{" "}
            {program.short} format and leaves anything you didn&rsquo;t mention blank.
          </p>
        </div>
      </div>

      <div className="context">
        {[
          ["Client", session.client.name],
          ["Date and time", session.date_time],
          ["Service type", session.service_type],
          ["Modality", session.modality],
          ["Duration", `${session.duration_minutes} min`],
          ["Note type", session.note_type],
        ].map(([k, v]) => (
          <div className="kv" key={k}>
            <span className="k">{k}</span>
            <span className="v">{v}</span>
          </div>
        ))}
        <div className="end">
          <span className="from-record">
            <Icon name="record" /> From record
          </span>
          <button type="button" className="link-btn" onClick={onBack}>
            Change session
          </button>
        </div>
      </div>

      <div className="layout-2">
        <section className="card">
          <div className="card-head">
            <h2>Session notes</h2>
            <span className="sp hint">Typed and dictated text go in the same box. You can edit at any time.</span>
          </div>
          <DictationBox value={text} onChange={onTextChange} />
          {error && (
            <div className="alert error" role="alert" style={{ marginTop: 14 }}>
              <Icon name="critical" /> {error}
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 14, flexWrap: "wrap" }}>
            {sample && (
              <button type="button" className="btn btn-ghost" onClick={() => onTextChange(sample)}>
                Insert sample notes (synthetic)
              </button>
            )}
            <span className="small muted" style={{ marginLeft: "auto" }}>
              {text.length} characters
            </span>
            <button
              type="button"
              className="btn btn-primary btn-lg"
              onClick={draft}
              disabled={busy || !text.trim()}
              aria-busy={busy}
            >
              {busy ? <span className="spinner" /> : <Icon name="sparkle" />}
              {busy ? "Drafting…" : "Draft note"}
            </button>
          </div>
          <div className="callout soft" style={{ marginTop: 16 }}>
            <Icon name="info" />
            <span>
              Dictation uses your browser&rsquo;s speech service (Chrome or Edge). If it isn&rsquo;t
              available, the mic is hidden and you can type instead. Synthetic data only.
            </span>
          </div>
        </section>

        <div className="stack">
          <section className="card">
            <h2 style={{ marginBottom: 14 }}>Treatment plan goals</h2>
            {session.goals.map((g) => (
              <div key={g.goal_id} className="goal-card">
                <span className="goal">{g.goal_id}</span>
                <span>{g.description}</span>
              </div>
            ))}
            <p className="small muted">
              Mention progress on each goal. The draft links interventions and progress to these goals.
            </p>
          </section>
          <section className="card">
            <h2 style={{ marginBottom: 14 }}>When you click Draft note</h2>
            <ol className="steps">
              <li>
                <span className="n">1</span>
                <span>
                  The note is drafted in the {program.short} format, with session details filled in.
                </span>
              </li>
              <li>
                <span className="n">2</span>
                <span>
                  Anything you didn&rsquo;t say is left as{" "}
                  <span className="notprov">
                    <Icon name="flag" />
                    [NOT PROVIDED]
                  </span>{" "}
                  and flagged. Nothing is made up.
                </span>
              </li>
              <li>
                <span className="n">3</span>
                <span>The draft is checked against {program.short}, Medicaid and NYS documentation rules.</span>
              </li>
              <li>
                <span className="n">4</span>
                <span>You review the issues, answer follow-up questions, edit, and approve.</span>
              </li>
            </ol>
          </section>
        </div>
      </div>
      <div className="footer-note">
        <span>Synthetic data only</span>
        <span>
          Draft note → one <code>POST /draft</code> call (draft + rule checks + content checks + follow-up questions).
        </span>
      </div>
    </>
  );
}
