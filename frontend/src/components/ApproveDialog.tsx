import { useEffect, useState } from "react";
import type { Note } from "../api/types";
import { formatEt } from "../util/time";
import { Icon } from "./Icon";

interface Props {
  note: Note;
  signerName: string;
  busy: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ApproveDialog({ note, signerName, busy, error, onCancel, onConfirm }: Props) {
  const [confirmed, setConfirmed] = useState(false);
  const [now, setNow] = useState(formatEt());

  useEffect(() => {
    const t = setInterval(() => setNow(formatEt()), 15000);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", onKey);
    return () => {
      clearInterval(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [onCancel]);

  const { warning, informational } = note.counts;
  return (
    <div className="overlay" role="presentation" onClick={onCancel}>
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="approve-h"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="close" aria-label="Close" onClick={onCancel}>
          <Icon name="x" />
        </button>
        <span className="badge-demo" style={{ alignSelf: "flex-start" }}>
          Synthetic data – demo only
        </span>
        <h2 id="approve-h" style={{ fontSize: 30 }}>
          Approve and finalize this note?
        </h2>
        <p>
          Approving signs version {note.version} and locks it. The note is checked once more before it&rsquo;s
          approved.
        </p>
        <ul>
          <li>
            <Icon name="shield" />
            <span>
              If the final check finds a Critical issue, for example from an edit made after your last Re-assess,
              approval stops and the issue is shown.
            </span>
          </li>
          <li>
            <Icon name="lock" />
            <span>Approved notes can&rsquo;t be edited. Any later change is added as an addendum with its own version.</span>
          </li>
          {(warning > 0 || informational > 0) && (
            <li>
              <Icon name="info" />
              <span>
                {[
                  warning ? `${warning} Warning${warning > 1 ? "s" : ""}` : null,
                  informational ? `${informational} Informational note${informational > 1 ? "s" : ""}` : null,
                ]
                  .filter(Boolean)
                  .join(" and ")}{" "}
                still open. {warning + informational > 1 ? "They don't" : "It doesn't"} block approval.
              </span>
            </li>
          )}
        </ul>
        {note.origin === "drafted" && (
          <div className="signed-box">
            <p className="label">Signature to be applied</p>
            {signerName} · Signed {now}
          </div>
        )}
        {error && (
          <div className="alert error" role="alert">
            <Icon name="critical" /> {error}
          </div>
        )}
        <label className="check-row">
          <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />I reviewed
          this note, and it accurately reflects the session.
        </label>
        <div className="actions">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary btn-lg"
            disabled={!confirmed || busy}
            aria-busy={busy}
            onClick={onConfirm}
          >
            {busy ? <span className="spinner" /> : <Icon name="tick" />} Approve and finalize
          </button>
        </div>
      </div>
    </div>
  );
}
