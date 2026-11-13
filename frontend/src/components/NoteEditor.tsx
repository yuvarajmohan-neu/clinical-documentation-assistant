import { Fragment, useState, type ReactNode } from "react";
import type { Issue, Note, NoteSection } from "../api/types";
import { Icon } from "./Icon";

const NP = "[NOT PROVIDED]";

interface Props {
  note: Note;
  sections: NoteSection[];
  issues: Issue[];
  onEdit: (key: string, text: string) => void;
  locked: boolean;
  dirty: boolean;
  targetSection: string | null;
  footer?: ReactNode;
}

/**
 * Note editor. Click a section to edit it. [NOT PROVIDED] blanks stay highlighted and can be
 * stepped through — the UI never fills them in.
 */
export function NoteEditor({ note, sections, issues, onEdit, locked, dirty, targetSection, footer }: Props) {
  const [editing, setEditing] = useState<string | null>(null);
  const [activeFlag, setActiveFlag] = useState<number | null>(null);

  // Missing-element markers for pasted notes, placed in the section the issue points to.
  const markers: Record<string, string[]> = {};
  for (const i of issues) {
    if (!i.missing_label) continue;
    const list = (markers[i.section] ??= []);
    if (!list.includes(i.missing_label)) list.push(i.missing_label);
  }
  const blankCount = sections.reduce((n, s) => n + s.text.split(NP).length - 1, 0);
  const markerCount = Object.values(markers).reduce((n, l) => n + l.length, 0);
  const flagTotal = blankCount + markerCount;

  let flagN = 0; // assigns ids flag-0, flag-1 … in document order while rendering
  const flagId = () => `flag-${flagN++}`;

  const step = (dir: 1 | -1) => {
    if (!flagTotal) return;
    const next = activeFlag === null ? (dir === 1 ? 0 : flagTotal - 1) : (activeFlag + dir + flagTotal) % flagTotal;
    setActiveFlag(next);
    document.getElementById(`flag-${next}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
  };

  const tokens = (text: string) =>
    text.split(/(\[NOT PROVIDED\]|\bG\d+\b)/).map((part, idx) => {
      if (part === NP) {
        const id = flagId();
        return (
          <span key={idx} id={id} className={`notprov${activeFlag === Number(id.slice(5)) ? " active" : ""}`}>
            <Icon name="flag" />
            {NP}
          </span>
        );
      }
      if (/^G\d+$/.test(part)) {
        return (
          <span key={idx} className="goal">
            {part}
          </span>
        );
      }
      return <Fragment key={idx}>{part}</Fragment>;
    });

  const renderLine = (line: string, idx: number) => {
    if (!line.trim()) return <div key={idx} style={{ height: 8 }} />;
    const goal = line.match(/^(G\d+)\s+—\s+(.*?):\s(.*)$/);
    if (goal) {
      return (
        <p key={idx}>
          <span className="goal">{goal[1]}</span> {goal[2]}: {tokens(goal[3])}
        </p>
      );
    }
    const label = line.match(/^(Intervention|Client response|Signed|Interventions|Response):\s*(.*)$/i);
    if (label) {
      return (
        <p key={idx}>
          <b>{label[1]}:</b> {tokens(label[2])}
        </p>
      );
    }
    return <p key={idx}>{tokens(line)}</p>;
  };

  const ctx = note.context;
  const metaPairs: [string, string][] = ctx
    ? [
        ["Client", `${ctx.client_name} — ${ctx.client_id}`],
        ["Service type", ctx.service_type],
        ["Date of service", ctx.date_time],
        ["Modality", ctx.modality],
        ["Clinician", ctx.clinician],
        ["Duration", ctx.duration],
      ]
    : note.meta;

  return (
    <section className="card editor" aria-labelledby="note-h">
      <div className="editor-toolbar">
        <h3 id="note-h">Note</h3>
        {note.approved ? (
          <span className="small">
            <Icon name="lock" /> Approved and locked
          </span>
        ) : dirty ? (
          <span className="small">
            <span className="edited-dot" /> Edited since last check
          </span>
        ) : (
          <span className="small muted">
            <Icon name={note.origin === "pasted" ? "doc" : "pen"} />{" "}
            {note.origin === "pasted" ? "Pasted note. Edit it directly." : "Click any section to edit."}
          </span>
        )}
        {flagTotal > 0 && (
          <span className={`blank-nav sp${blankCount === 0 ? " flagged-nav" : ""}`}>
            <Icon name="flag" />
            &nbsp;{flagTotal} {blankCount ? "blank" : "flagged"}
            {flagTotal > 1 ? "s" : ""}
            {activeFlag !== null && ` · ${activeFlag + 1} of ${flagTotal}`}
            <button type="button" aria-label="Previous blank" onClick={() => step(-1)}>
              <Icon name="up" />
            </button>
            <button type="button" aria-label="Next blank" onClick={() => step(1)}>
              <Icon name="down" />
            </button>
          </span>
        )}
      </div>
      <div className="editor-body">
        <div className="doc-title">{note.title}</div>
        {metaPairs.length > 0 && (
          <div className="meta">
            {metaPairs.map(([k, v]) => (
              <span key={k}>
                <b>{k}:</b> {v}
              </span>
            ))}
            <span className="from-record">
              <Icon name="record" />
              {ctx ? "From the session record. Not editable here." : "From the pasted note header."}
            </span>
          </div>
        )}
        {sections.map((s) => {
          const canEdit = s.editable && !locked;
          const isEditing = editing === s.key && canEdit;
          const sectionMarkers = markers[s.key] ?? [];
          return (
            <div key={s.key} id={`sec-${s.key}`} className={`note-sec${targetSection === s.key ? " target" : ""}`}>
              <h4 className="sec">
                {s.heading}
                {canEdit && !isEditing && (
                  <button type="button" className="link-btn" onClick={() => setEditing(s.key)}>
                    Edit
                  </button>
                )}
              </h4>
              {isEditing ? (
                <textarea
                  className="textarea"
                  aria-label={`${s.heading} text`}
                  autoFocus
                  value={s.text}
                  onChange={(e) => onEdit(s.key, e.target.value)}
                  onBlur={() => setEditing(null)}
                  rows={Math.max(4, s.text.split("\n").length + 2)}
                />
              ) : (
                <div
                  className={`view${canEdit ? "" : " locked"}`}
                  onClick={() => canEdit && setEditing(s.key)}
                >
                  {s.key === "signature" && note.approved ? (
                    <div className="signed-box">{s.text}</div>
                  ) : s.text.trim() ? (
                    s.editable ? (
                      s.text.split("\n").map(renderLine)
                    ) : (
                      <p className="muted">{s.text}</p>
                    )
                  ) : (
                    <p className="empty">Empty{canEdit ? " — click to add." : ""}</p>
                  )}
                </div>
              )}
              {!isEditing &&
                sectionMarkers.map((label) => {
                  const id = flagId();
                  return (
                    <div
                      key={label}
                      id={id}
                      className={`missing-here${activeFlag === Number(id.slice(5)) ? " active" : ""}`}
                    >
                      <Icon name="flag" /> Missing here: {label}
                    </div>
                  );
                })}
            </div>
          );
        })}
      </div>
      {footer}
    </section>
  );
}
