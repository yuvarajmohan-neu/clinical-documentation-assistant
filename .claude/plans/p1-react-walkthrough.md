# P1 walkthrough — what the React owner builds

## Context
Team-lead briefing on P1's scope, from `.claude/plans/team-responsibility-split.md`, `docs/architecture.md` (§2.4, 2.5, 2.8, 2.12), the prototype and how-it-works diagrams, and the brand skill. Nothing is built yet: the repo has only docs, diagrams and skills. No code changes are proposed here.

## 1. P1's deliverables
1. **Web app** (`frontend/`, Vite + React + TypeScript), the bulk of the work.
2. **Submission pack** (`docs/submission/`), including the demo script.

(Evaluation and the demo-visible extras moved to P3 — see §6–7 below.)

## 2. The screen, left to right
Diagram A and §2.5 describe one workspace that follows the clinician's workflow. The app has four screens: **Sign-in**, one combined **Session setup** page, and two page shells (**Write a note** / **Check a note**) that both hand off to one **shared review screen**.

| # | Page/Screen | Component | What it does | Backend call |
|---|---|---|---|---|
| 1a | Sign-in | `SignInScreen` | With `AUTH_PROVIDER=dev` (the default), a single **Sign in** button picks a fixed synthetic demo user and goes straight into the app — no redirect, no identity server needed. If the Keycloak stretch is built, the same button instead redirects to Keycloak's hosted login page (no custom username/password form in the app). | None (dev) / Redirect to Keycloak (stretch) |
| 1b | Sign-in | Auth callback handler | Only needed if the Keycloak stretch is built: receives the redirect back from Keycloak (PKCE code exchange via `react-oidc-context`), shows a brief loading state, then forwards to the Session setup page once the token is stored. With the `dev` stub there is no redirect to handle. | Keycloak token endpoint (via `oidc-client-ts`), stretch only |
| 1c | Sign-in (cross-cutting) | `src/auth/` provider + `useAuth` | Wraps the whole app: holds the token (or fixed dev principal), attaches the bearer token to every API call, silently refreshes it if real OIDC is in use, exposes the role claim (→ allowed programs) to the rest of the app, and a **Sign out** action (usually in a header, not the sign-in screen itself). | Token attached to every call |
| 2 | Session setup page | `ProgramSelector` | Five programs. If the user has exactly one `program:*` role, it is locked and the picker is skipped. | `GET /programs` |
| 3 | Session setup page | Session picker | Lists synthetic sessions for the program. Picking one pre-fills client, date, time, service type, modality. Times display like `11/6/2026 2:05 PM ET`. | `GET /sessions?program=`, `GET /sessions/{id}` |
| 4a | **Write a note** page | `DictationBox` | Type or dictate. Mic button uses the browser Web Speech API (interim text, fallback if unsupported). Needs a session. | `POST /draft`, then `POST /assess` |
| 4b | **Check a note** page | `PasteBox` | Separate page, not a mode toggle. Paste a finished note, pick note type, optional date of service. No mic. | `POST /assess` only |
| 5 | Shared review screen | `NoteEditor` (shared by both pages) | Editable draft in the program format (SOAP where used). `[NOT PROVIDED]` blanks are highlighted and navigable. Goal links visible. Saving makes a new version. | `PUT /notes/{id}` |
| 6 | Shared review screen | `IssuesPanel` | Per issue: what is wrong, the requirement with a clickable source, how to fix it, and a severity badge (icon plus colour). Click an issue to jump to the text. Grouped by severity. | `POST /assess` result |
| 7 | Shared review screen | Follow-up questions | Write page: one question per gap, with an answer box; answers go back into the draft (the dashed re-draft loop in Diagram A). Check page: display-only, no answer box — clinician edits the pasted note directly to address it. | `POST /followups`, then `/draft` (Write page only) |
| 8 | Shared review screen | `StatusBanner` | Meets standards / Meets standards with warnings / Needs attention, shown before finalizing. | status from `/assess` |
| 8a | Shared review screen | **Re-assess button** | Sits with `NoteEditor`. Manually re-runs `/assess` on the saved note. No auto re-check on edit/keystroke. | `POST /assess` |
| 9 | Shared review screen | Approve flow | Doubles as save/finalize. Button disabled while a Critical is open. Confirm dialog. Version-history drawer. | `POST /notes/{id}/approve` (409 if Critical), `GET /notes/{id}/versions` |

Cross-cutting: loading, empty and error states; keyboard and screen-reader access; a permanent "SYNTHETIC DATA – DEMO ONLY" badge.

Rows 5–9 form one **shared review screen** used by both pages, driven by a `useNoteReview` hook. Each page only differs in how it collects input. Open questions for P3: does `/assess` on pasted text return a `note_id`, is `note_type` a request field, is `session_id` optional, and does the Check page's follow-up list need any server-side change now that it's display-only (no answer submitted back).

### 2a. The screens, in order
- **Sign-in screen.** The entry point: a branded landing screen with a **Sign in** button (`SignInScreen`). By default (`AUTH_PROVIDER=dev`), clicking it immediately sets a fixed synthetic demo principal and moves straight to the Session setup page — no redirect, no identity server. If the Keycloak stretch is built, the same button instead redirects to Keycloak's own hosted login page — the app never renders a username/password form itself — and after Keycloak authenticates the clinician, it redirects back to an auth callback handler that completes the PKCE exchange and shows a brief loading state. Either way, the role claim (real or fixed dev) decides which programs the clinician can see next. A **Sign out** action (via `useAuth`) lives in the app header once signed in, not on this screen.
- **Session setup page.** One combined screen, right after sign-in: `ProgramSelector` and the session picker both render here (not two separate screens). The clinician picks a program — or it's pre-locked and skipped — then a synthetic session, which supplies the client/date/time/service/modality context carried into whichever page comes next.
- **Write a note page.** One of two entry points into the shared review screen. Owns only the input step: typing or dictating session notes, then calling `/draft` and `/assess`.
- **Check a note page.** The other entry point. Owns pasting a finished note, choosing its note type, and calling `/assess` directly — no `/draft`.
- **Shared review screen.** Both pages land here once a draft or assessment exists. It is one screen built once, not duplicated per page, and is where the clinician actually works: read the note, see the issues, resolve gaps, re-assess, and approve.

### 2b. What each component does
- **`SignInScreen`** — the signed-out landing screen: Jewish Board branding plus a single **Sign in** button. By default it doesn't collect credentials or redirect anywhere; clicking Sign in with `AUTH_PROVIDER=dev` sets a fixed demo principal directly. Only if the Keycloak stretch is built does it redirect the browser to Keycloak's hosted login page instead.
- **Auth callback handler** — stretch only, needed solely for the Keycloak path: the route Keycloak redirects back to after login. Completes the PKCE code exchange (via `oidc-client-ts`), shows a short loading state, then routes the clinician to the Session setup page once `src/auth/` has a stored token. With the `dev` stub, `SignInScreen` goes straight there with no callback step.
- **`src/auth/`** — wraps the whole app. With `AUTH_PROVIDER=dev`, holds a fixed demo principal with no network calls. If real OIDC is wired in as a stretch, this is where it handles the redirect/callback, stores and refreshes the token. Either way it attaches the bearer token (or dev identity) to every API call, exposes the role claim so the rest of the app knows which programs are allowed, and exposes `useAuth`'s sign-out action for the header.
- **`ProgramSelector`** (top of the Session setup page) — a simple list/dropdown of the five programs fetched from `GET /programs`. If the signed-in role implies exactly one program, this component doesn't render at all; the program is set automatically and the page opens straight to the session picker.
- **Session picker** (same Session setup page, below `ProgramSelector`) — lists the program's synthetic sessions (`GET /sessions?program=`). Selecting one fetches full session detail (`GET /sessions/{id}`) and carries client, date, time, service type and modality forward, pre-filled in 12-hour Eastern format. Once a session is picked, the clinician moves on to the Write or Check page.
- **`DictationBox`** (Write a note page only) — the text area plus mic button for the Write flow. The mic uses the browser's Web Speech API, showing interim (in-progress) text while dictating, with a visible fallback if the browser doesn't support it. Requires a session to already be selected. Submitting calls `/draft` to generate the note, then `/assess` to check it.
- **`PasteBox`** (Check a note page only) — a plain paste area, note-type picker, and optional date-of-service field for the Check flow. No mic, no session requirement. Submitting goes straight to `/assess`; there is no draft step.
- **`NoteEditor`** (shared) — the actual note text, editable, rendered in the program's required format (SOAP where applicable). Any `[NOT PROVIDED]` blank is visually flagged and the clinician can jump between them. Where interventions link to treatment-plan goals, those links are shown inline. Saving writes a new version via `PUT /notes/{id}`; it never auto-saves on every keystroke.
- **`IssuesPanel`** — lists every issue returned by the last `/assess` call, grouped by severity (Critical/Warning/Informational), each with a severity badge (icon plus colour, not colour alone, for accessibility), the specific requirement with a clickable source link, and a suggested fix. Clicking an issue scrolls/highlights the related spot in `NoteEditor`.
- **Follow-up questions** — on the Write page, one question per content gap with an answer box; submitting answers calls `/followups` and feeds the answers back into `/draft` to regenerate the note (the dashed re-draft loop). On the Check page the same questions render display-only with no answer box — the clinician reads the question, edits the pasted note directly in `NoteEditor`, then uses Re-assess.
- **`StatusBanner`** — a single summary readout above the Approve button: "Meets standards", "Meets standards with warnings", or "Needs attention", computed from the current `/assess` result (any open Critical forces "Needs attention").
- **Re-assess button** — sits beside `NoteEditor`. The only way `/assess` runs again after the clinician edits the note; there is no automatic re-check on every edit or keystroke, so the clinician edits, saves, then explicitly re-checks.
- **Approve flow** — the finalize action, doubling as save. Disabled client-side whenever a Critical issue is open (the server's 409 from `/notes/{id}/approve` is the authoritative gate, not the disabled button). Includes a confirm dialog before submitting and a version-history drawer (`GET /notes/{id}/versions`) to review prior saved versions.

## 3. What the UI must NOT do (the guardrails land here)
- **Never fill a gap.** The UI only displays what the backend returns. Blanks stay `[NOT PROVIDED]` and flagged. The frontend must not default or auto-complete clinical text.
- **Clinician in control.** Nothing is final without the approve click. The UI cannot bypass the 409. The disabled button is a convenience; the server is the real gate.
- **Status wording must match the backend rule.** Any Critical → Needs attention; Warnings only → Meets standards with warnings; else Meets standards. CLAUDE.md lists only two statuses and the architecture adds a third. Confirm with P3 which one is canonical.
- **Time:** 12-hour Eastern everywhere. Backend stores UTC. Frontend should format with `Intl`/`America/New_York` or consume a pre-formatted field.
- **No secrets in the frontend.** Only public OIDC client config (`cda-web`).

## 4. Brand rules (from the jewish-board-brand skill, `references/web-guide.md`)
- Tokens only: orange `#f36c21`, blue `#2261ae`, green `#1a5a40`, brick red `#b04c32`, soft-white page `#f1eee7`, white cards, black text `#231f20`. No tints, no off-brand colours.
- Headings Lora (Mackinac fallback) 500, body Inter (Indivisible fallback). All text left-aligned. Max width 1200px. Cards at 20px radius or more. Curly quotes.
- Say "The Jewish Board", not "JB", in user-visible text.
- Accessibility: WCAG AA. Orange on white is for large text and buttons only. Severity badges use icon plus colour.
- **Gap:** the skill says logo files live in `assets/`, but that folder is missing from `.claude/skills/jewish-board-brand/`. P1 needs the Radiant logo from the team or brand owner before the header can be done.
- Severity colours are not defined by the brand. Suggestion: Critical = Brick Red, Warning = Cab Yellow or Orange, Informational = Classic Blue, each with a distinct icon. Needs a team decision.

## 5. Dependencies and ordering for P1
- **P3** supplies `docs/api.yaml` (typed client is generated from it) and a **mock server** with canned JSON. P1 starts on the mock and switches to the real API later. Without the mock on day one, P1 is blocked.
- **P2** supplies the `dev` auth stub (users `art31.clinician`, `act.clinician`, `supervisor` as fixed demo principals) and the synthetic data; the Keycloak realm is only built if the stretch goal is picked up. `AUTH_PROVIDER=dev` is the default, so the frontend needs a way to run without any login redirect — and should treat that as the normal path, not a fallback to design around later.
- Build order from the docs: Article 31 end to end first, then the other four programs (these should be data-only changes for the UI), then polish (brand, dictation, demo).
- Auth caveat: JB's Azure standard uses MSAL, and the prototype's optional OIDC stretch path uses `react-oidc-context`. Keep auth isolated in `src/auth/` so swapping either the stub-to-OIDC step or the later OIDC-to-MSAL step is contained.

## 6. Demo-visible extras — moved to P3
Provenance highlighting (hover a draft sentence to see the source words via `source_spans`), clickable citations (opens the retrieved passage with document, section, page), an evaluation scoreboard page, and an audit **Verify** button for the tamper demo (`GET /audit/verify`). Stretch: rule explorer. Moved off P1's list; see `team-responsibility-split.md`'s P3 section.

## 7. Evaluation — moved to P3
`evaluate.py`: for every synthetic note call `/assess`. Every `pass_*` must have 0 Critical; every `fail_*` must hit the ids in `expected.json`; print a 5-program matrix. This doubles as "Impact" evidence. It depends on P2's data and P4's rules, so most of its value arrives late. Moved off P1's list; see `team-responsibility-split.md`'s P3 section.

**Submission** (stays with P1): problem, solution, impact metrics (time per note, first-pass compliance, audit findings), implementation approach, cost and value, risks/oversight/security/assumptions, demo script. P2 supplies production notes.

## 8. Risks and open questions to raise with the team
1. P1 carries three jobs (UI, evaluation, submission); the UI is the critical user-facing path. Consider moving evaluation to whoever owns the rules.
2. API contract mismatch: `/assess` response shape (does it return `status`, `issues[]` with `rule_id` and a `source{doc_id,section,url}` object?). CLAUDE.md's flat schema and architecture §2.3 differ slightly. Freeze this before P1 generates the client.
3. Drafts need `source_spans` and `goal_links` if provenance and goal-link display are wanted; `POST /draft` currently lists only `{note_id, draft_text, blanks[]}`.
4. Web Speech API only works in Chrome/Edge and sends audio to Google. Acceptable only for synthetic data. Use Chrome for the demo.
5. Missing logo asset (see §4).
6. Canonical status labels (see §3).

## Verification (when built)
Run Vite against the mock, sign in as the `art31.clinician` dev-stub principal (program locked, no redirect), dictate, draft, view issues and status, answer a follow-up, confirm approve is disabled with a Critical open and succeeds after the fix, and check times show as `11/6/2026 2:05 PM ET` and the UI follows the brand tokens.
