# Rules Engine — Ingest-Time Extraction & Validation Workflow

This is the implementation spec for turning a program's regulation KB into
reviewed, versioned `rules.yaml`. It replaces manual rule-writing with an
LLM-assisted pipeline that keeps a human in the loop only for review, not for
authoring. Read this before implementing `backend/rules_engine/` or
`scripts/extract_rules.py`.

## Fixed concepts (defined once, not per program)

### Rule types (closed list, code-owned)
A type exists only if an evaluator function exists for it. This list is
extended by engineers writing new evaluators — never by extraction output.

| type             | enforced by                         | param schema |
|-------------------|--------------------------------------|--------------|
| `required_field`  | field present in `ParsedNote`        | `RequiredFieldParams(field: str)` |
| `timeline`        | date/time arithmetic                 | `TimelineParams(max_hours: int, from_event: str)` |
| `signature`       | signer/credential present            | `SignatureParams(require_credentials: bool)` |
| `pattern`         | regex / format match                 | `PatternParams(regex: str)` |
| `llm_content`     | Claude content judgment (ContentChecker) | `LlmContentParams(topic: str)` |

### Type Registry (global, cross-program, grows over time)
A running store (`rules_engine/type_registry.yaml`) of approved types +
their param schemas + example sentences. Program #1 seeds it close to empty;
by program #4-5 almost nothing new appears here.

### Field Registry (per program, grows over time)
`programs/<id>/fields.yaml` — the closed list of elements `ParsedNote` can
produce for this program (e.g. `date_of_service`, `intervention`,
`client_response`, `signature`). `required_field.field` must be one of these.

---

## Pipeline — run once per program (and re-run on KB manifest change)

### Stage 0 — KB ingest (prerequisite, not part of this pipeline)
Docs → Docling parse → section chunks → embeddings → `KBChunk` rows in
Postgres, each with `doc_id`, `section`, `text`, `url`. Manifest sha256 drives
re-ingest of changed docs only.

### Stage 1 — Combined discovery + extraction pass (one scan over chunks)
For every `KBChunk` that contains normative language (must/shall/required/
within/etc.), make **one** LLM call per chunk returning:

```
{
  "fields_mentioned": [{"name": ..., "description": ...}, ...],
  "type_suggestions": [{"type": "existing_type_or_new", "reason": ...}, ...],
  "rule_candidates": [
    {
      "element": ...,
      "requirement": ...,
      "quote": ...,          // must be substring of chunk text
      "type": ...,           // from existing registry OR "llm_content" fallback
      "severity": "Critical|Warning|Informational",
      "params": {...}
    }
  ]
}
```

The prompt includes the current Type Registry and Field Registry so far
(existing programs' approved types, this program's fields collected so far
in-session) — this is what keeps later programs mostly automatic.

### Stage 2 — Reduce: Field Registry
Collect all `fields_mentioned` across chunks → dedupe/cluster (same field,
different wording) → draft `programs/<id>/fields.yaml`.
**Human gate:** review once, approve or merge entries. This is the one
place a person looks at raw regulation language.

### Stage 3 — Reduce: Type Registry
Collect all `type_suggestions` → diff against the global Type Registry.
- Suggestion matches an existing type → auto-merge, no review needed.
- Genuinely novel type → surface for human review. Approving it requires an
  engineer to add an evaluator + param schema before the type is usable.
Over time this step produces zero new work for most programs.

### Stage 4 — Code verification of `rule_candidates` (deterministic, no LLM)
For each candidate, in order:
1. **Quote check** — normalize whitespace/case, require `quote in chunk.text`.
   Fail → drop, log to `rejects.yaml`, optionally retry once with a stricter
   prompt reminder.
2. **Type check** — `type` must exist in the (now-updated) Type Registry.
   Fail → drop or hold for Stage 3 resolution.
3. **Param check** — validate `params` against that type's Pydantic schema.
   - `required_field.field` must be in the approved `fields.yaml` (Stage 2).
   - Numeric params (`max_hours`, etc.) must also appear in the quote text.
   Fail → drop, log to `rejects.yaml`.
4. **Citation overwrite** — discard any `doc_id`/`section` the model
   returned; replace with the source `KBChunk` row's values. (Optional: log
   a mismatch if the model's citation disagreed, as a chunking signal.)

### Stage 5 — Dedupe & conflict merge
Group candidates by `element`. Identical requirements from multiple chunks
merge into one rule (union of sources). Conflicting requirements (e.g. 48h
vs 72h for the same element) are **not** auto-resolved — both are kept,
flagged `conflict: true`, and surfaced for human review.

### Stage 6 — Coverage check
Compare extracted rule elements against `fields.yaml`. Any approved field
with zero rules referencing it is flagged — likely a missed requirement in
extraction, surfaced in the review report, not auto-rejected.

### Stage 7 — Write draft
Write `programs/<id>/rules.draft.yaml`, every rule `reviewed: false`.
Include `rejects.yaml` and the coverage/conflict report alongside it.

### Stage 8 — Human review gate
A person reviews `rules.draft.yaml` (+ reject/coverage/conflict reports),
edits/accepts rules, flips `reviewed: true`. **Only `reviewed: true` rules
ever load into the engine.** This is the only mandatory per-rule human step.

### Stage 9 — Load & version
Rule loader reads only `reviewed: true` rules, validates each `source`
against the KB (doc_id/section must exist), computes a ruleset hash, and
that hash is stamped on every draft/assessment produced afterward.

---

## Re-extraction on KB change
When a doc's manifest sha256 changes, re-run Stages 1–7 for the affected
sections only (match by `doc_id`/`section`, not the whole program). Rules
already `reviewed: true` whose source section is unchanged are left alone;
only rules tied to changed sections re-enter draft state.

## Why this order
Type Registry and Field Registry must exist (or be in progress) before
Stage 4 can validate anything — but Stage 1 collects the raw material for
both *and* the rule candidates in a single scan, so the document is read by
the LLM once per program onboarding, not twice. Everything after Stage 1 is
local computation (reduce/merge/validate) and human review, not further LLM
calls over the source documents.
