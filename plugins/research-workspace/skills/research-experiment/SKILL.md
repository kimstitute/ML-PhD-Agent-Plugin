---
name: research-experiment
description: Implement research code and conduct bounded, baseline-grounded AI/ML experiments with reproducible configs, seeds, raw logs and preserved negative results.
---

# Implement and experiment

For a code-only request, implement and test the requested code; do not launch training or create an optimization loop unnecessarily. For an experiment, read relevant prior runs and decisions first.

If the private source index exists, consult `../research/references/private-sources.md` and load the relevant original paper-to-code, ablation, leakage or seed skill. Use available reference/code details, but replace its private paths and unsupported tool calls with the actual project capabilities.

Adapted from ResearcherSkill's THINK → TEST → REFLECT loop and ml-researcher-os's experiment-plan/negative-result templates (MIT). Do not import automatic hard resets, fixed noise thresholds, endless default loops or forced multi-evaluator calls.

- THINK: state the falsifiable hypothesis, comparator and measurement before execution. Use `templates/experiment-plan.md` when the plan warrants an artifact. Record stable dataset version/split, validation metric, code version including dirty diff identity, seed and compute/time budget. Choose the smallest experiment that can change the decision.
- TEST: inspect existing training/evaluation code; implement the requested change with a shape/device/data sanity check and small overfit or smoke run when relevant. Establish a measured baseline. Register `run plan --spec FILE`, then launch only the authorized command through the host. Record real PID/scheduler ID with `run start`. Never use test performance to choose hyperparameters.
- REFLECT: save raw output and config snapshots; finish with `run finish --result FILE`, even after a crash or timeout. Explain what the result rules out and does not rule out. Keep or reject a direction based on evidence, not a universal 0.1% threshold. Record follow-ups and a handoff.

Read [run-schema.md](references/run-schema.md) before registering/finishing runs. The CLI is a ledger, not a job launcher: it cannot supervise training, kill remote jobs or enforce a GPU budget. Don't confuse `run start` with actually starting a process. New process launches, resumed jobs and changes in GPU/SSH scope must respect existing user authorization.

For CV, inspect split leakage at the scene/video/subject/session level, pretrained-data overlap, augmentation differences, resolution, optimizer and training budget. Compare matched conditions. A single seed improvement is exploratory, not statistical proof. Pre-register the most informative ablations and record confounds when multiple variables must change.

When the agreed experiment count/budget/target is reached, stop. After repeated failures or a plateau, summarize the tested assumptions and propose a different hypothesis; do not consume an unbounded budget. Preserve raw failures instead of resetting away their context.
