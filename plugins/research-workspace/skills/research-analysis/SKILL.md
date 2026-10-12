---
name: research-analysis
description: Analyze actual ML experiment results, matched-seed comparisons, CV failure slices and uncertainty, and write a decision-oriented evidence report.
---

# Analyze results

Read raw metrics, evaluation code and relevant run/config records; report unavailable files explicitly. Check comparability before calculating gains: same dataset/version/split, metric definition, training/evaluation budget and seed policy. Separate measured numbers from interpretation.

If the private source index exists, read `../research/references/private-sources.md` and consult the imported error-analysis or model-eval-error-analysis original when it adds useful detail. Do not claim its missing helpers were executed.

Use `templates/result-report.md` (adapted from ml-researcher-os, MIT). Include failed/negative runs and limitations. For paired seed trials, use the bundled `scripts/compare.mjs --input FILE` for sample mean/SD and a deterministic paired bootstrap interval for the mean difference. Read [comparison.md](references/comparison.md) first. It is not a generic significance-test engine and bootstrap across seeds does not estimate test-sample uncertainty.

For CV, inspect meaningful slices such as object scale, occlusion, class, viewpoint, scene, motion, lighting, sensor and domain shift. Verify failures visually using available image tools when relevant. Don't infer an explanation from an average alone; identify observations supporting and contradicting each suspected cause.

Record draft claims with run/source IDs and exact locators. Statistical uncertainty and confounds may require partial rather than supported. A successful training process is not a successful scientific hypothesis. Save the report in the actor workspace, submit it for review, and hand off the smallest informative next experiment.
