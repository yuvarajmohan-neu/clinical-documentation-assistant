import { vi } from "vitest";
import type { Issue, Note, Program, Session } from "../api/types";

export const programsFixture: Program[] = [
  { id: "adult_act", name: "Adult ACT", short: "Adult ACT", subtitle: "Assertive Community Treatment", note_type: "ACT contact note", note_types: ["Progress note"], accessible: false, session_count: 1 },
  { id: "article31", name: "Article 31 Outpatient Clinic", short: "Article 31", subtitle: "Therapy visits", note_type: "Progress note (SOAP)", note_types: ["Progress note", "Treatment plan update"], accessible: true, session_count: 1 },
];

export const sessionFixture: Session = {
  session_id: "article31-01",
  program: "article31",
  client: { id: "ART31-C001", name: "Jamie Rivera (synthetic)" },
  date_time: "11/6/2026 2:05 PM ET",
  service_type: "Individual Therapy",
  modality: "In-person",
  duration_minutes: 45,
  goals: [
    { goal_id: "G1", description: "Reduce panic episodes", target_date: "2027-02-01", target_date_display: "2/1/2027", status: "active" },
  ],
  note_type: "Progress note (SOAP)",
  note_status: "Not started",
  note_id: null,
};

const criticalIssue: Issue = {
  id: "A31-RESPONSE-001:0",
  issue: "Client response to the intervention is missing",
  element: "Client response",
  rule: "A31-RESPONSE-001",
  source: "14 NYCRR Part 599 · §599.11 Clinical records",
  source_url: "https://example.org/part599.pdf",
  severity: "Critical",
  suggestion: "Describe how the client responded.",
  requirement: "Progress notes must describe the client's response to the services provided.",
  check_type: "rule",
  section: "assessment",
  missing_label: null,
};

export function noteFixture(overrides: Partial<Note> = {}): Note {
  return {
    note_id: "n-0142",
    program: "article31",
    program_name: "Article 31 Outpatient Clinic",
    origin: "drafted",
    note_type: "Progress note",
    title: "Progress Note — Article 31 Outpatient Clinic",
    session_id: "article31-01",
    context: {
      client_name: "Jamie Rivera (synthetic)",
      client_id: "ART31-C001",
      date_time: "11/6/2026 2:05 PM ET",
      service_type: "Individual Therapy",
      modality: "In-person",
      duration: "45 minutes",
      clinician: "Demo Clinician (synthetic)",
    },
    meta: [],
    goals: sessionFixture.goals,
    sections: [
      { key: "subjective", heading: "Subjective", text: "Client reported fewer panic episodes.", editable: true },
      { key: "assessment", heading: "Assessment", text: "Intervention: Reviewed breathing.\nClient response: [NOT PROVIDED]", editable: true },
      { key: "signature", heading: "Signature", text: "Added when you approve.", editable: false },
    ],
    draft_text: "",
    issues: [criticalIssue],
    followup_questions: [
      { id: "fq-1", question: "How did the client respond to the intervention?", fills: "Client response · A31-RESPONSE-001", section: "assessment", line_prefix: "Client response" },
    ],
    status: "Needs attention",
    counts: { critical: 1, warning: 0, informational: 0 },
    version: 1,
    created_at: "11/6/2026 2:41 PM ET",
    drafted_at: "11/6/2026 2:41 PM ET",
    checked_at: "11/6/2026 2:41 PM ET",
    approved: false,
    approved_at: null,
    versions_info: { prompt: "draft.md v1.0", rules: "article31.yaml v0.3", kb_manifest: "3f9a2c1" },
    ...overrides,
  };
}

export const passingNote = (overrides: Partial<Note> = {}) =>
  noteFixture({ issues: [], followup_questions: [], status: "Meets standards", counts: { critical: 0, warning: 0, informational: 0 }, version: 2, ...overrides });

type Handler = (url: string, init?: RequestInit) => { status?: number; body: unknown };

/** Stub global fetch with a router function. Returns the mock for call assertions. */
export function mockFetch(handler: Handler) {
  const fn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const { status = 200, body } = handler(String(input), init);
    return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}
