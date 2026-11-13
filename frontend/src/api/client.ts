import type { Note, NoteSection, NoteVersion, Program, SampleNote, Session } from "./types";

// Vite proxies /api to the Python server (vite.config.ts). VITE_API_BASE_URL overrides it.
const BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) || "/api";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body: unknown,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  // Bearer token will be attached here from src/auth once real OIDC lands (frontend/CLAUDE.md).
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });
  } catch {
    throw new ApiError(0, "Can't reach the server. Is the Python API running on port 8000?", null);
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const detail = (body as { detail?: unknown } | null)?.detail;
    throw new ApiError(res.status, typeof detail === "string" ? detail : `Request failed (${res.status})`, body);
  }
  return body as T;
}

const post = <T>(path: string, data: unknown) =>
  request<T>(path, { method: "POST", body: JSON.stringify(data) });

export const api = {
  programs: () => request<Program[]>("/programs"),
  sessions: (program: string) => request<Session[]>(`/programs/${program}/sessions`),
  samples: (program: string) => request<SampleNote[]>(`/programs/${program}/samples`),

  /** Write page, Draft button: the only call (draft + checks + follow-ups in one response). */
  draft: (session_id: string, input_text: string) => post<Note>("/draft", { session_id, input_text }),

  /** Check page, Check note button. */
  checkPasted: (args: { program: string; note_type: string; text: string; date_of_service?: string }) =>
    post<Note>("/assess", args),

  /** Re-assess button: saves current editor text + follow-up answers and re-checks, one request. */
  reassess: (note_id: string, sections: NoteSection[], followup_answers: Record<string, string>) =>
    post<Note>("/assess", {
      note_id,
      sections: sections.filter((s) => s.editable).map(({ key, text }) => ({ key, text })),
      followup_answers,
    }),

  /** Approve. The server re-checks and answers 409 while a Critical issue is open. */
  approve: (note_id: string) => post<Note>(`/notes/${note_id}/approve`, {}),
  versions: (note_id: string) => request<NoteVersion[]>(`/notes/${note_id}/versions`),
};
