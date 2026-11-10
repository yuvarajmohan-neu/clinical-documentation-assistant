# P4 walkthrough — what the KB ingest pipeline owner builds

## Context
Team-lead briefing on P4's scope, from `.claude/plans/team-responsibility-split.md` (P4 row, revised) and `docs/architecture.md` (§2.1, 2.7, §6 retrieval check). Nothing is built yet. Mirrors the structure of `p1-react-walkthrough.md` and `p2-infra-data-walkthrough.md`.

P4's scope was deliberately narrowed to **one self-contained feature**: the KB ingest pipeline. Regulation collection, program frameworks, rules content, and the rules engine all moved to P3 (the senior person on the team), who now owns that whole vertical end to end. This removes every dependency P4 used to have on "has P3/P4 finished the rules for this program yet" — P4's only remaining external dependency is P2's table schema, plus getting real documents to index once P3 has collected them.

## 1. P4's deliverable
The **KB ingest pipeline**: `backend/kb/ingest.py` plus the `parser`, `embeddings`, `search`, and `blob` providers. Given a program's source documents, it produces a searchable, versioned, citation-capable index. Nothing else.

## 2. The pipeline, in build order
1. **Parse** (`parser/docling.py`) — Docling parse into structured sections, keeping heading, section number, and page metadata; `pypdf` as a plain-text fallback for documents Docling can't handle.
2. **Chunk** — split by section, ~500 tokens with overlap, never crossing a section boundary, keeping the heading path on each chunk. This is what makes a retrieved passage citable (`doc_id` + `section`), not just a blob of text.
3. **Embed** (`embeddings/bge_small.py`) — `BAAI/bge-small-en-v1.5` via `sentence-transformers`, local CPU, batched, 384-dim vectors. The ~130MB model needs `scripts/fetch_models.py` run once before the first ingest.
4. **Index** (`search/pgvector_hybrid.py`) — writes into Postgres: a pgvector column for vector search and a full-text (GIN) index for keyword search, in the same table.
5. **Search** — at query time, keyword and vector results are merged by reciprocal-rank fusion, filtered to `program ∈ {selected, common}`, returned as `Passage{source_id, section, url, text, score}` — never a raw DB row or Docling/SDK object.
6. **Idempotency and versioning** — ingest is keyed by each document's `sha256` (from P3's manifest), so re-running `python -m backend.kb.ingest --program <program>` on unchanged documents doesn't re-embed them. A computed **KB manifest hash** gets produced for P3 to stamp onto drafts/assessments (req 22) — P4 produces the hash, P3 is the one who stores it.
7. **CLI**: `python -m backend.kb.ingest --program <program>`.
8. **Retrieval quality check** (`scripts/eval_retrieval.py`): a small hand-written question → expected `doc_id#section` set per program, reporting hit@5 (target ≥0.8 per architecture §6). This is P4's own proof the pipeline works — it doesn't require the rules engine or any other program's component to exist.
9. **Provider contract tests** (`tests/providers/`) for the `docling`/`pypdf` parser, the `bge_small` embedder, and `pgvector_hybrid` search — same suite runs against any adapter that implements the interface, so swapping `qdrant` or `azure_ai_search` in later is provably safe.

## 3. What P4 must NOT do (guardrails)
- **No rules, no rule content, no regulatory interpretation.** P4 indexes whatever documents P3 hands over; deciding what a document *means* for a program's requirements is entirely P3's job now.
- **No vendor objects leak out.** Docling's parse tree, sentence-transformers tensors, and raw Postgres rows all stay inside the adapters. Business code only ever sees `Passage`.
- **Ingest stays idempotent.** Don't re-embed unchanged documents on every run — that's the whole point of keying off `sha256`.
- **Don't invent citations.** A `Passage` is only ever text that actually exists in a parsed, chunked document with its real section — nothing synthesized or summarized in place of the source text.

## 4. Dependencies and ordering for P4
- **P2** owns `kb_chunks`/`kb_documents` (vector column + keyword index) — agree the table shape with P2 before writing `search/pgvector_hybrid.py` against it. This is P4's one real external dependency.
- **P3** supplies the actual documents and manifests to index, program by program (Article 31 first, per the stated build order). Until P3 delivers at least one program's manifest, P4 builds and proves the pipeline against a couple of sample documents — nothing blocks P4 from starting immediately.
- P4 does **not** depend on the rules engine, rule content, or the orchestrator at all — that coupling is gone now that P3 owns the whole regulation-to-rules vertical.
- **Depends on:** P2 (`kb_chunks`/`kb_documents` schema). **Delivers to:** P3 (`SearchProvider` only — P3's `RuleEngine` and `ContentChecker` consume `Passage` objects through this interface, but own everything downstream of it themselves).

## 5. Risks and open questions to raise with the team
1. **Schema timing.** If P2 is slow to finalize `kb_chunks`, P4 can build the parser/embedder stages regardless, but can't validate the real index or run `eval_retrieval.py` for real until the table exists.
2. **Sample-document gap.** P4 should not wait idle for P3's first manifest — grab one or two small public NYS documents to build and sanity-test the pipeline against from day one, then swap in P3's real manifests once they land.
3. **Model download step.** `scripts/fetch_models.py` is an easy first-run failure point (no clear error otherwise) — worth a README callout.
4. **KB manifest hash handoff.** P4 produces the hash; confirm with P3 exactly where it's read from (a return value of the ingest CLI? a file? a DB row?) so the version-stamping on drafts/assessments actually works.

## Verification (when built)
`python -m backend.kb.ingest --program article31` runs end to end against at least one real or sample document and produces a non-empty, idempotent index (re-running it does no extra embedding work); `scripts/eval_retrieval.py` reports hit@5 ≥ 0.8 once real documents are indexed; provider contract tests pass for the parser, embedder, and search adapters; switching `SEARCH_PROVIDER` from `pgvector` to `qdrant` and re-running the retrieval check gives an unchanged result (architecture §2.12's provider-swap demo).
