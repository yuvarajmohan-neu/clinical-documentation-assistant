import { useCallback, useState } from "react";
import { ApiError, api } from "../api/client";
import type { Note, NoteSection } from "../api/types";

/**
 * One hook drives the shared review screen for both Write and Check (frontend/CLAUDE.md):
 * note + local edits, follow-up answers, Re-assess, and Approve.
 *
 * - Nothing re-checks automatically. Re-assess is one /assess call carrying the editor text
 *   and follow-up answers together.
 * - The disabled Approve button is a convenience; the server's 409 is the real gate.
 */
export function useNoteReview(initialNote: Note, onNoteChange?: (n: Note) => void) {
  const [note, setNoteState] = useState<Note>(initialNote);
  const [sections, setSections] = useState<NoteSection[]>(initialNote.sections);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState<null | "reassess" | "approve">(null);
  const [error, setError] = useState<string | null>(null);
  const [justApproved, setJustApproved] = useState(false);

  const setNote = useCallback(
    (n: Note) => {
      setNoteState(n);
      setSections(n.sections);
      onNoteChange?.(n);
    },
    [onNoteChange],
  );

  const editSection = useCallback((key: string, text: string) => {
    setSections((prev) => prev.map((s) => (s.key === key ? { ...s, text } : s)));
    setDirty(true);
  }, []);

  const setAnswer = useCallback((id: string, text: string) => {
    setAnswers((prev) => ({ ...prev, [id]: text }));
  }, []);

  const answeredCount = Object.values(answers).filter((a) => a.trim()).length;

  const reassess = useCallback(async () => {
    setBusy("reassess");
    setError(null);
    try {
      const fresh = await api.reassess(note.note_id, sections, note.origin === "drafted" ? answers : {});
      setNote(fresh);
      setAnswers({});
      setDirty(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }, [note, sections, answers, setNote]);

  /** Returns true when approved. On 409 the server's latest assessment is shown. */
  const approve = useCallback(async (): Promise<boolean> => {
    setBusy("approve");
    setError(null);
    try {
      if (dirty) {
        // Unsaved edits: save them with the approval's server-side re-check.
        const saved = await api.reassess(note.note_id, sections, {});
        setNote(saved);
        setDirty(false);
        if (saved.counts.critical > 0) {
          setError("Your latest edits left a Critical issue open. Fix it, then approve.");
          return false;
        }
      }
      setNote(await api.approve(note.note_id));
      setJustApproved(true);
      return true;
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        const body = e.body as { note?: Note } | null;
        if (body?.note) setNote(body.note);
      }
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(null);
    }
  }, [note, sections, dirty, setNote]);

  return {
    note,
    sections,
    editSection,
    answers,
    setAnswer,
    answeredCount,
    dirty,
    busy,
    error,
    reassess,
    approve,
    justApproved,
    canApprove: !note.approved && note.counts.critical === 0,
  };
}
