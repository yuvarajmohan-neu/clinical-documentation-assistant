import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { Note, Program, SampleNote } from "../api/types";
import { Icon } from "../components/Icon";
import { PasteBox } from "../components/PasteBox";

interface Props {
  program: Program;
  text: string;
  onTextChange: (t: string) => void;
  onBack: () => void;
  onChecked: (n: Note) => void;
}

export function CheckNote({ program, text, onTextChange, onBack, onChecked }: Props) {
  const [noteType, setNoteType] = useState(program.note_types[0] ?? "Progress note");
  const [dos, setDos] = useState("");
  const [samples, setSamples] = useState<SampleNote[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.samples(program.id).then(setSamples).catch(() => setSamples([]));
  }, [program.id]);

  const check = async () => {
    setBusy(true);
    setError(null);
    try {
      onChecked(
        await api.checkPasted({ program: program.id, note_type: noteType, text, date_of_service: dos || undefined }),
      );
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
        <b>Check a note</b>
      </nav>
      <div className="page-head">
        <div>
          <h1>Check a note</h1>
          <p className="lede">
            Paste a finished note that was written somewhere else. The assistant checks it against{" "}
            {program.short} requirements and tells you what to fix. It doesn&rsquo;t rewrite your note.
          </p>
        </div>
      </div>

      <div className="layout-2">
        <section className="card">
          <div style={{ display: "flex", gap: 28, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 18 }}>
            <div className="field">
              <span>Note type</span>
              <div className="seg" role="radiogroup" aria-label="Note type">
                {program.note_types.map((t) => (
                  <button
                    key={t}
                    type="button"
                    role="radio"
                    aria-checked={t === noteType}
                    className={t === noteType ? "on" : ""}
                    onClick={() => setNoteType(t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <label className="field">
              <span>
                Date of service <span className="muted" style={{ fontWeight: 400 }}>(optional)</span>
              </span>
              <input className="input" type="date" value={dos} onChange={(e) => setDos(e.target.value)} />
            </label>
            <p className="hint" style={{ maxWidth: 300 }}>
              <Icon name="info" /> With a date, the check can confirm the note was finished on time.
            </p>
          </div>

          <PasteBox value={text} onChange={onTextChange} />

          {error && (
            <div className="alert error" role="alert" style={{ marginTop: 14 }}>
              <Icon name="critical" /> {error}
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
            {samples.map((s) => (
              <button key={s.id} type="button" className="btn btn-outline btn-sm" onClick={() => onTextChange(s.text)}>
                Load {s.kind === "pass" ? "passing" : "failing"} example
              </button>
            ))}
            {samples.length === 0 && <span className="small muted">No microphone on this page. Paste or type only.</span>}
            <span style={{ marginLeft: "auto" }} />
            <button type="button" className="btn btn-ghost" onClick={() => onTextChange("")} disabled={!text}>
              Clear
            </button>
            <button
              type="button"
              className="btn btn-primary btn-lg"
              onClick={check}
              disabled={busy || !text.trim()}
              aria-busy={busy}
            >
              {busy ? <span className="spinner" /> : <Icon name="shield" />}
              {busy ? "Checking…" : "Check note"}
            </button>
          </div>
        </section>

        <div className="stack">
          <section className="card">
            <h2 style={{ marginBottom: 14 }}>What gets checked</h2>
            <ul className="checks">
              <li>
                <Icon name="check" />
                <span>
                  <b>Required fields and timelines</b> from the {program.short} rule set, e.g. signature, date,
                  duration, service type
                </span>
              </li>
              <li>
                <Icon name="check" />
                <span>
                  <b>Medicaid and NYS documentation standards</b> that apply to every program
                </span>
              </li>
              <li>
                <Icon name="check" />
                <span>
                  <b>Clinical content:</b> intervention and client response, measurable progress on goals, medical
                  necessity
                </span>
              </li>
            </ul>
            <p className="small muted">Each finding links to the regulation section it comes from.</p>
          </section>
          <div className="callout purple">
            <Icon name="warning" />
            <span>
              <b>Synthetic data only.</b> Don&rsquo;t paste notes about real clients. This prototype isn&rsquo;t
              approved for client information.
            </span>
          </div>
        </div>
      </div>
      <div className="footer-note">
        <span>Synthetic data only</span>
        <span>
          Check note → <code>POST /assess</code> only, no draft step.
        </span>
      </div>
    </>
  );
}
