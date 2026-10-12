# Paired seed comparison

Input:

```json
{
  "metric": "validation_accuracy",
  "direction": "higher",
  "baseline": [{ "seed": 1, "value": 0.80 }, { "seed": 2, "value": 0.81 }],
  "candidate": [{ "seed": 1, "value": 0.82 }, { "seed": 2, "value": 0.80 }]
}
```

Values must be finite. Seed IDs must be unique integers with exactly matching sets; pairs are matched by seed, not input order. This tool rejects unpaired/missing seeds rather than silently dropping runs. Confirm experimental comparability yourself; the arrays alone cannot establish it.

`compare.mjs` reports mean and sample standard deviation, candidate minus baseline, improvement sign, and a seeded percentile bootstrap 95% interval for the paired mean delta. One pair has no sample SD/interval. Fewer than five pairs receive an instability warning. A degenerate interval is not proof of zero uncertainty. Avoid p-values or claims of significance from this report alone.

For detection/segmentation, aggregated mAP/mIoU seed intervals cannot stand in for paired image/scene resampling. Resample at the independent unit (e.g. scene/subject), not adjacent frames, when sample uncertainty matters.
