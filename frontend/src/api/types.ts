// Shapes returned by the demo API (backend/app/main.py). Replace with types generated from
// docs/api.yaml once P3 publishes it.

export type Severity = "Critical" | "Warning" | "Informational";
export type NoteStatus = "Meets standards" | "Meets standards with warnings" | "Needs attention";

export interface Program {
  id: string;
  name: string;
  short: string;
  subtitle: string;
  note_type: string;
  note_types: string[];
  accessible: boolean;
  session_count: number;
}

export interface Goal {
  goal_id: string;
  description: string;
  target_date: string;
  target_date_display: string;
  status: string;
}

export interface Session {
  session_id: string;
  program: string;
  client: { id: string; name: string };
  date_time: string; // already formatted, 12-hour ET
  service_type: string;
  modality: string;
  duration_minutes: number;
  goals: Goal[];
  note_type: string;
  note_status: "Not started" | "Draft" | "Approved";
  note_id: string | null;
}

export interface SampleNote {
  id: string;
  kind: "pass" | "fail";
  label: string;
  text: string;
}

export interface Issue {
  id: string;
  issue: string;
  element: string;
  rule: string;
  source: string;
  source_url: string;
  severity: Severity;
  suggestion: string;
  requirement: string;
  check_type: "rule" | "content";
  section: string;
  missing_label: string | null;
}

export interface FollowUpQuestion {
  id: string;
  question: string;
  fills: string;
  section: string;
  line_prefix: string;
}

export interface NoteSection {
  key: string;
  heading: string;
  text: string;
  editable: boolean;
}

export interface NoteContext {
  client_name: string;
  client_id: string;
  date_time: string;
  service_type: string;
  modality: string;
  duration: string;
  clinician: string;
}

export interface Note {
  note_id: string;
  program: string;
  program_name: string;
  origin: "drafted" | "pasted";
  note_type: string;
  title: string;
  session_id: string | null;
  context: NoteContext | null;
  meta: [string, string][];
  goals: Goal[];
  sections: NoteSection[];
  draft_text: string;
  issues: Issue[];
  followup_questions: FollowUpQuestion[];
  status: NoteStatus;
  counts: { critical: number; warning: number; informational: number };
  version: number;
  created_at: string;
  drafted_at: string | null;
  checked_at: string;
  approved: boolean;
  approved_at: string | null;
  signature?: string;
  summary_line?: string;
  versions_info: { prompt: string; rules: string; kb_manifest: string };
}

export interface NoteVersion {
  version: number;
  event: string;
  at: string;
  status: NoteStatus;
}
