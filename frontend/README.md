# frontend

React + Vite + TypeScript, scaffolded per `.claude/plans/p1-react-walkthrough.md` and `docs/architecture.md` §2.5.

```sh
npm install
cp .env.example .env.local
npm run dev      # http://localhost:5173
npm test         # vitest + React Testing Library
npm run lint
```

Currently built: app shell, JB brand tokens (`src/index.css`), `src/auth/` (Keycloak OIDC with
authorization code + PKCE, verified ID-token identity, and a dev-mode fallback), and
`SignInScreen`. Everything else in
`p1-react-walkthrough.md` §2 (Session setup, Write/Check a note, shared review screen) is next.
OIDC is the default when `VITE_AUTH_PROVIDER` is unset; set it explicitly to `dev` only for an
offline synthetic demo.

Keycloak's `clinician_app` client must be public, with Standard Flow enabled and PKCE set to
S256. Add `http://localhost:5173` as a valid redirect URI and Web Origin. Redirect URI matching
is exact: the app sends `http://localhost:5173` (without a trailing slash) after sign-in and
sign-out. The local
`.env.local` selects the `healthcare` realm and this client; copy `.env.example` to `.env.local`
to use or customize the same settings. The app uses the current browser origin for sign-in and
post-logout redirects.
