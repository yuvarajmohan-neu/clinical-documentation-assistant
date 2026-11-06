# frontend

React + Vite + TypeScript, scaffolded per `.claude/plans/p1-react-walkthrough.md` and `docs/architecture.md` §2.5.

```sh
npm install
cp .env.example .env
npm run dev      # http://localhost:5173
npm test         # vitest + React Testing Library
npm run lint
```

Currently built: app shell, JB brand tokens (`src/index.css`), `src/auth/` (dev-mode stub,
swappable per architecture §2.8), and `SignInScreen`. Everything else in
`p1-react-walkthrough.md` §2 (Session setup, Write/Check a note, shared review screen) is next.
