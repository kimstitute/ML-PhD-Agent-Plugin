---
name: research-literature
description: Search, screen and synthesize AI/ML literature with explicit reading levels, reproducible search notes and claim-to-source pointers.
---

# Literature and evidence

Define the research question and inclusion/exclusion criteria at the needed scale. Log search date, queries, actual search services, filters and screening reasons in an actor's workspace. Group findings by research mechanism, assumption, evidence and limitation; do not produce only a paper-by-paper list. Look for contrary evidence and strong adjacent baselines before calling something a gap.

If `.research/vendor/index.json` exists, consult `../research/references/private-sources.md` and selectively load the original literature-review skill/reference for deeper screening or synthesis. Keep the shared source/claim ledger authoritative.

Use the available paper/web/library tools. Do not assume `paper-search-mcp`, Zotero, a particular credential or another plugin exists. Link to primary sources. Full-text access failures must be recorded as abstract-only, not replaced with invented content.

For each important paper, save a stable reading-note artifact containing identifier, question, method, evaluation conditions, limitations, exact section/page/table pointers and what it does NOT establish. Register with `source add --spec FILE`; read [source-schema.md](references/source-schema.md) for the shape. Keep live scratch notes separate from registered immutable snapshots.

To check DOI existence and metadata, run the bundled `scripts/citations.mjs` on text or a DOI. Its report separates handle resolution, Crossref registration and network uncertainty. It does NOT establish whether the paper supports a claim. Before `claim review --status supported`, read the cited full-text location and explain the scope of support.

The search/screen/theme/identifier-verification workflow and DOI extraction are adapted from pinshuai/literature-review-skill (MIT). Don't bring its optional PDF stack into a simple literature request.
