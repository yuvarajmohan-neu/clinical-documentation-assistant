import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { NoteVersion } from "../api/types";
import { Icon } from "./Icon";

export function VersionHistoryDialog({ noteId, onClose }: { noteId: string; onClose: () => void }) {
  const [items, setItems] = useState<NoteVersion[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.versions(noteId).then(setItems).catch((e: Error) => setError(e.message));
  }, [noteId]);

  return (
    <div className="overlay" role="presentation" onClick={onClose}>
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="vh-h" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="close" aria-label="Close" onClick={onClose}>
          <Icon name="x" />
        </button>
        <h2 id="vh-h">Version history</h2>
        <p className="small muted">
          Every draft, edit, check and approval is kept. In production this is the audit log.
        </p>
        {error && <p className="alert error">{error}</p>}
        {!items && !error && <p className="muted">Loading…</p>}
        {items?.map((v, idx) => (
          <div className="history-item" key={idx}>
            <span className="tag">v{v.version}</span>
            <span style={{ flex: 1 }}>
              <b>{v.event}</b>
              <br />
              <span className="small muted">
                {v.at} · {v.status}
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
