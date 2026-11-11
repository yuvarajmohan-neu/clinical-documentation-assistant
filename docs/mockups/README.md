# UI mockups

Static mockups of every screen in the prototype, styled with The Jewish Board brand tokens from
`frontend/src/index.css` (jewish-board-brand skill). All content comes from
`synthetic-data/article31/`. Rule IDs and regulation citations are placeholders until
`rules/article31.yaml` is final.

| PNG | Screen | Covers |
|---|---|---|
| [01-sign-in.png](01-sign-in.png) | Sign-in | `SignInScreen` (dev-stub sign-in, demo badge) |
| [02-session-setup.png](02-session-setup.png) | Session setup | `ProgramSelector` + session picker + pre-filled session detail |
| [03-write-note.png](03-write-note.png) | Write a note | `DictationBox` while listening, session context strip, **Draft note** (`POST /draft`) |
| [04-check-note.png](04-check-note.png) | Check a note | `PasteBox`, note type, optional date of service, **Check note** (`POST /assess`) |
| [05-review-write.png](05-review-write.png) | Shared review (from Write) | `NoteEditor` with `[NOT PROVIDED]` blanks, `IssuesPanel`, follow-ups **with answer boxes**, `StatusBanner` (Needs attention), **Re-assess**, **Approve** (disabled) |
| [06-review-check.png](06-review-check.png) | Shared review (from Check) | Same screen for a pasted note: flagged gaps, 2 Critical issues, follow-ups **display-only** |
| [07-approve.png](07-approve.png) | Approve flow | Meets standards after Re-assess, Approve confirmation dialog |
| [08-component-states.png](08-component-states.png) | Component states | All StatusBanner, severity, editor-marker, Re-assess, Approve (incl. 409), follow-up and dictation states |

Purple dashed tags (for example `NoteEditor`) name the React component for each region. They are
not part of the UI.

## Open points shown in the mockups
- Severity colours (Critical = Brick Red, Warning = Cab Yellow, Informational = Classic Blue) are
  the walkthrough's suggestion and still need a team decision.
- The Radiant logo file is not in the repo yet, so the header shows "The Jewish Board" as text.

## Regenerate
Edit the `.html` files (shared styles in `mockup.css`, header and icons in `shell.js`), then run:

```sh
node docs/mockups/render.mjs            # all screens
node docs/mockups/render.mjs 05 06      # only screens whose filename starts with 05 or 06
```

Needs Node 22+ and Chrome or Edge (set `CHROME_PATH` if neither is in a standard location).
Output is 1440 px wide at 2× resolution.
