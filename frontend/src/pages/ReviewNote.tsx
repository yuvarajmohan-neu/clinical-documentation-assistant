import { useEffect, useState } from "react";
import type { Issue, Note } from "../api/types";
import { useAuth } from "../auth";
import type { Screen } from "../components/AppHeader";
import { ApproveDialog } from "../components/ApproveDialog";
import { FollowUpQuestions } from "../components/FollowUpQuestions";
import { Icon } from "../components/Icon";
import { IssuesPanel } from "../components/IssuesPanel";
import { NoteEditor } from "../components/NoteEditor";
import { StatusBanner } from "../components/StatusBanner";
import { VersionHistoryDialog } from "../components/VersionHistoryDialog";
import { useNoteReview } from "../hooks/useNoteReview";

interface Props {
  initialNote: Note;
  onNavigate: (s: Screen) => void;
  onNoteChange: (n: Note) => void;
}

/** Shared review screen for Write a note and Check a note. */
export function ReviewNote({ initialNote, onNavigate, onNoteChange }: Props) {
  const r = useNoteReview(initialNote, onNoteChange);
  const { principal } = useAuth();
  const { note } = r;
  const [selectedIssue, setSelectedIssue] = useState<string | null>(null);
  const [target, setTarget] = useState<string | null>(null);
  const [approveOpen, setApproveOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const drafted = note.origin === "drafted";
  const from = drafted ? "write" : "check";

  useEffect(() => {
    if (!target) return;
    document.getElementById(`sec-${target}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
    const t = setTimeout(() => setTarget(null), 2200);
    return () => clearTimeout(t);
  }, [target]);

  const goTo = (section: string) => {
    setTarget(null);
    requestAnimationFrame(() => setTarget(section));
  };
  const selectIssue = (i: Issue) => {
    setSelectedIssue(i.id);
    goTo(i.section);
  };

  const ctx = note.context;
  const subtitle = ctx
    ? `${ctx.client_name} · ${ctx.service_type} · ${ctx.date_time} · ${note.note_type}`
    : `${note.summary_line ? `${note.summary_line} · ` : ""}${note.note_type} (pasted)`;

  const reassessHint = () => {
    const parts: string[] = [];
    if (r.dirty) parts.push("your edits");
    if (drafted && r.answeredCount) parts.push(`${r.answeredCount} follow-up answer${r.answeredCount > 1 ? "s" : ""}`);
    const saves = parts.length ? `Saves ${parts.join(" and ")} as version ${note.version + 1}, then checks` : "Checks";
    return `${saves} the note again. Nothing is re-checked until you click.`;
  };

  return (
    <>
      <nav className="crumbs" aria-label="Breadcrumb">
        <button type="button" onClick={() => onNavigate("setup")}>
          Session setup
        </button>
        <Icon name="right" />
        <button type="button" onClick={() => onNavigate(from)}>
          {drafted ? "Write a note" : "Check a note"}
        </button>
        <Icon name="right" />
        <b>Review</b>
      </nav>
      <div className="page-head">
        <div>
          <h1>{drafted ? "Review your draft" : "Review the checked note"}</h1>
          <p className="lede">{subtitle}</p>
        </div>
        <div className="actions">
          <span className="small muted">
            Version {note.version} · {note.approved ? `Approved ${note.approved_at}` : `Checked ${note.checked_at}`}
          </span>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => setHistoryOpen(true)}>
            <Icon name="history" /> Version history
          </button>
        </div>
      </div>

      <div className="review-top">
        <StatusBanner note={note} />
        <div className="card approve-box">
          {note.approved ? (
            <>
              <Icon name="check" />
              <p style={{ color: "var(--jb-green)", fontWeight: 600 }}>
                Approved and locked.
                <br />
                <span className="muted" style={{ fontWeight: 400 }}>
                  {note.signature ?? `Approved ${note.approved_at}`}
                </span>
              </p>
            </>
          ) : (
            <>
              <p>{r.canApprove ? "No Critical issues are open." : "Approve unlocks when no Critical issues are open."}</p>
              <button
                type="button"
                className="btn btn-primary btn-lg"
                disabled={!r.canApprove || r.busy !== null}
                onClick={() => setApproveOpen(true)}
                style={{ marginLeft: "auto" }}
              >
                <Icon name={r.canApprove ? "tick" : "lock"} /> Approve and finalize
              </button>
            </>
          )}
        </div>
      </div>

      {r.error && !approveOpen && (
        <div className="alert error" role="alert">
          <Icon name="critical" /> {r.error}
        </div>
      )}
      {r.justApproved && note.approved && (
        <div className="alert ok" role="status">
          <Icon name="check" /> Note approved and locked as version {note.version}. Any later change will be an addendum.
          <button type="button" className="link-btn" style={{ marginLeft: "auto" }} onClick={() => onNavigate("setup")}>
            Back to sessions
          </button>
        </div>
      )}

      <div className="layout-review">
        <NoteEditor
          note={note}
          sections={r.sections}
          issues={note.issues}
          onEdit={r.editSection}
          locked={note.approved}
          dirty={r.dirty}
          targetSection={target}
          footer={
            !note.approved && (
              <div className="editor-foot">
                <button
                  type="button"
                  className="btn btn-blue btn-lg"
                  onClick={r.reassess}
                  disabled={r.busy !== null}
                  aria-busy={r.busy === "reassess"}
                >
                  {r.busy === "reassess" ? <span className="spinner" /> : <Icon name="refresh" />} Re-assess
                </button>
                <span className="small">{reassessHint()}</span>
              </div>
            )
          }
        />
        <div className="stack">
          <IssuesPanel issues={note.issues} selectedId={selectedIssue} onSelect={selectIssue} />
          <FollowUpQuestions
            questions={note.followup_questions}
            withAnswers={drafted}
            answers={r.answers}
            onAnswer={r.setAnswer}
            onGoTo={goTo}
            locked={note.approved}
          />
        </div>
      </div>

      <div className="versions">
        <span>
          Prompt <code>{note.versions_info.prompt}</code>
        </span>
        <span>
          Rules <code>{note.versions_info.rules}</code>
        </span>
        <span>
          Knowledge base manifest <code>{note.versions_info.kb_manifest}</code>
        </span>
        <span>
          Note ID <code>{note.note_id}</code>
        </span>
      </div>
      <div className="footer-note">
        <span>Synthetic data only</span>
        <span>Demo API: drafting and checks are mocked. Rule IDs and citations are placeholders until rules/*.yaml are final.</span>
      </div>

      {approveOpen && (
        <ApproveDialog
          note={note}
          signerName={`${principal?.name ?? "Clinician"} (synthetic)`}
          busy={r.busy === "approve"}
          error={r.error}
          onCancel={() => setApproveOpen(false)}
          onConfirm={async () => {
            if (await r.approve()) setApproveOpen(false);
          }}
        />
      )}
      {historyOpen && <VersionHistoryDialog noteId={note.note_id} onClose={() => setHistoryOpen(false)} />}
    </>
  );
}
