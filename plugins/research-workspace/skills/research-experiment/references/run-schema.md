# Run ledger contract

Store resolved configuration as a distinct, stable file for each run. Register a spec:

```json
{
  "hypothesis": "The baseline is measurable under this fixed protocol",
  "command": "python train.py --config configs/baseline.json",
  "codeVersion": "git SHA + dirty diff hash, or an explicit source snapshot identifier",
  "config": "configs/baseline.json",
  "dataset": { "id": "dataset name", "version": "version/hash", "split": "validation" },
  "seed": 42,
  "budgetSeconds": 600,
  "purpose": "baseline",
  "baselineId": null
}
```

Subsequent trials use the actual successful baseline ID, not purpose baseline. Dataset id/version/split must match. Split values: train, validation, test. Test requires `purpose: final-evaluation` and `testApproval: human-approved`; write this only after real approval. The string is an auditable declaration, NOT an OS permission mechanism. Scope, environment, hardware, extra protocol details and approval context belong in the experiment plan.

After external launch: `run start --id ID --job "actual PID / Slurm ID / foreground smoke identifier"`. On completion:

```json
{
  "status": "succeeded",
  "metrics": { "accuracy": 0.82 },
  "artifacts": ["outputs/run-001/raw-metrics.json", "outputs/run-001/train.log"],
  "observation": "Measured validation accuracy; single seed, exploratory."
}
```

Terminal statuses: succeeded, failed, cancelled, timed-out. Failures need an error-log artifact; leave metrics empty if unmeasured. Do not encode a crash as accuracy zero. Succeeded requires finite metrics and an artifact, but the CLI cannot check that the number was honestly computed. Reviewer checks raw files.

Artifacts/configs are hashed on registration; later edits are detected. New evidence uses a new snapshot/record; don't overwrite existing raw results.

Run-linked claim:

```json
{
  "text": "Run X measured validation accuracy 0.82 under protocol P, not a general improvement claim.",
  "evidence": [{ "kind": "run", "id": "run-returned-id", "locator": "raw-metrics.json: accuracy", "metric": "accuracy", "value": 0.82 }]
}
```

The metric value must match the ledger. Causal or improvement claims additionally need matched baselines, controls, uncertainty and human/coordinator review.
