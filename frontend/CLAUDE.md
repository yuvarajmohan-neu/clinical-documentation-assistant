# CLAUDE.md — frontend

Scope: this file applies to `frontend/` only. Root rules in `../CLAUDE.md` (synthetic data only,
never invent clinical content, human stays in control, 12-hour ET time format, JB brand) still
apply — this file adds frontend-specific detail. Full design reference:
`../.claude/plans/p1-react-walkthrough.md` and `../docs/architecture.md` §2.5/2.7/2.8.

## Stack
React + Vite + TypeScript. Vitest + React Testing Library for tests. ESLint + Prettier configs
are already set — don't introduce a second linter/formatter.

```sh
npm install
npm run dev     # http://localhost:5173
npm test        # vitest run
npm run lint
```

## Screens (build order)
Four screens, in this order: **Sign-in** → **Session setup** (program + session picker, one
combined page) → **Write a note** / **Check a note** (separate pages, no mode toggle) → one
**shared review screen** used by both. Rows 5–9 of the walkthrough's table (editor, issues panel,
follow-ups, status, approve) are one screen driven by a single `useNoteReview` hook — do not
duplicate it per page.

Build order across programs: Article 31 end to end first: the other four programs should only
need data/config changes, not new UI code.

## Auth (`src/auth/`)
- Everything OIDC-shaped is isolated in this one folder so the adapter swap stays contained:
  `react-oidc-context`/Keycloak now, MSAL/Entra ID later (JB Azure standard). Never import an auth
  SDK from outside `src/auth/`.
- The current `AuthContext.tsx` is a **dev-mode stub only** (mirrors `AUTH_PROVIDER=dev` on the
  backend). Replacing it with real `react-oidc-context` + PKCE is still open work — do it inside
  this file and `types.ts`'s `Principal` shape, not by changing how the rest of the app consumes
  `useAuth()`.
- A user with exactly one `program:*` role skips the program picker — the picker only renders when
  `principal.programs.length > 1`.
- Bearer token attaches to every API call from here; nothing else should set auth headers.

## Brand rules (jewish-board-brand skill)
- Load the skill before any new styling. Tokens live in `src/index.css` (`--jb-*` custom
  properties) — use them, never hard-code hex values or introduce new colors/tints.
- "The Jewish Board", never "JB", in anything user-visible.
- All text left-aligned (`text-align: left` is the default — don't override it).
- Cards/containers: rounded corners, `var(--jb-radius-lg)` (20px) or more.
- Severity badges: icon **plus** colour, never colour alone (accessibility). Colours for
  Critical/Warning/Informational aren't finalized by the brand — `--jb-severity-*` tokens in
  `index.css` are a placeholder pending a team decision (walkthrough §4, §8.6).
- Missing asset: the Radiant logo file isn't in `.claude/skills/jewish-board-brand/assets/` yet.
  The header currently renders "The Jewish Board" as text — swap in the real logo image when it
  arrives, don't fake one.

## Guardrails (frontend must not violate these)
- **Never fill a gap.** Only render what the backend returns. `[NOT PROVIDED]` blanks stay
  highlighted and navigable — the UI must not auto-complete or default clinical text.
- **The disabled Approve button is a convenience, not the gate.** The server's 409 (Critical issue
  open) is authoritative; don't skip handling that response just because the button is disabled.
- **No auto re-check.** `/assess` only re-runs when the clinician clicks Re-assess — never on
  keystroke or on every edit. Re-assess is a single call that saves the current note text (and any
  follow-up answers) and re-checks in one request — there's no separate "Save" action to call
  first.
- **Status wording** must exactly match the backend: any open Critical → "Needs attention"; only
  Warnings → "Meets standards with warnings"; otherwise → "Meets standards". Confirm this is still
  the backend's canonical three-way split before wiring `StatusBanner` (root CLAUDE.md lists only
  two).
- **Time:** always 12-hour Eastern, e.g. `11/6/2026 2:05 PM ET`. Format with `Intl`/
  `America/New_York`, or consume an already-formatted field from the API — don't do arithmetic on
  raw timestamps in components.
- **No secrets.** Only public OIDC client config (`cda-web`) belongs in `.env`/`VITE_*` vars.
- Web Speech API (dictation) only works in Chrome/Edge and sends audio to Google — acceptable only
  because all demo data is synthetic. Don't use it as a reason to relax that rule elsewhere.

## API contract
Typed client should be generated from `../docs/api.yaml` once P3 publishes it; until then develop
against P3's mock server. `/draft` and `/assess` share one response shape: `draft_text`, `issues[]`,
`followup_questions[]`, plus `note_id`/`status` as applicable (see `../docs/architecture.md`
§2.4/§2.5). The Write page's Draft button calls `/draft` only; the Re-assess button calls `/assess`
only, carrying note text + follow-up answers together — there is no frontend call to `/followups`.

## Testing
Every new page/component gets at least one Vitest + Testing Library test co-located as
`*.test.tsx`. Follow `SignInScreen.test.tsx`'s pattern: render through `AuthProvider`/`App` (or the
narrowest real wrapper the component needs), assert on rendered text/roles, not implementation
details.
