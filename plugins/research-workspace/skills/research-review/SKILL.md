---
name: research-review
description: Audit ML research claims, drafts and experiment reproducibility against raw evidence; identify missing controls, unsupported conclusions and the smallest corrective action.
---

# Review and reproducibility

Adapted from Oh My Paper's Reviewer and ml-researcher-os's reproducibility auditor (MIT).

If the private source index exists, use `../research/references/private-sources.md` to find the imported self-review, idea stress-test or reproducibility-auditor original relevant to this audit. Original tool claims and scoring rules are not proof of actual checks.

Run `doctor` first; this checks evidence integrity, not scientific validity. Read the actual draft/results and cited evidence. Cover contribution, experimental adequacy, writing clarity, reference support and numeric consistency. For venue-specific reviews, consult current official review criteria rather than inventing a rating scale.

Use `templates/reproducibility-checklist.md` for a rerun audit. Mark each item present/missing/unclear/not_applicable and point to real files. Prefer the smallest fix that unlocks a credible rerun. Screenshots and agent statements are not substitutes for configs, logs and environment records.

Review hypotheses and claims separately: identify alternative explanations, leakage risk, protocol mismatch, baseline strength, seed uncertainty and missing ablations. Explain what the evidence establishes and what it does not. Never treat multiple role-play opinions as independent empirical replication.

Write actionable findings with artifact locations. Don't modify the manuscript/code when the user only asked for review. The coordinator may call `task accept` or `task revise` with a reason, and `claim review` with supported/partial/unsupported. A valid hash or a passing command cannot automatically earn scientific acceptance.
