#!/usr/bin/env node
import fs from 'node:fs';
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';

function series(rows, label) {
  if (!Array.isArray(rows) || !rows.length) throw new Error(`${label} needs observations`);
  const result = new Map();
  for (const row of rows) {
    if (!Number.isInteger(row.seed) || !Number.isFinite(row.value)) throw new Error('Each row needs an integer seed and finite value');
    if (result.has(row.seed)) throw new Error(`Duplicate ${label} seed ${row.seed}`);
    result.set(row.seed, row.value);
  }
  return result;
}
const mean = values => values.reduce((sum, value) => sum + value / values.length, 0);
function summary(values) {
  const avg = mean(values);
  const sampleSd = values.length > 1 ? Math.sqrt(values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / (values.length - 1)) : null;
  if (!Number.isFinite(avg) || (sampleSd !== null && !Number.isFinite(sampleSd))) throw new Error('Summary overflow; rescale your metric before comparison');
  return { n: values.length, mean: avg, sampleSd };
}
export function compare(input) {
  if (!['higher', 'lower'].includes(input.direction)) throw new Error('direction must be higher or lower');
  if (typeof input.metric !== 'string' || !input.metric.trim()) throw new Error('metric is required');
  const baseline = series(input.baseline, 'baseline');
  const candidate = series(input.candidate, 'candidate');
  if (baseline.size !== candidate.size || [...baseline.keys()].some(seed => !candidate.has(seed))) throw new Error('Exactly matched seed sets required');
  const pairs = [...baseline.keys()].sort((a, b) => a - b).map(seed => ({ seed, baseline: baseline.get(seed), candidate: candidate.get(seed), delta: candidate.get(seed) - baseline.get(seed) }));
  const deltas = pairs.map(pair => pair.delta);
  if (!deltas.every(Number.isFinite)) throw new Error('Difference overflow');
  let interval = null;
  if (pairs.length > 1) {
    let rng = 42;
    const random = () => { rng = (Math.imul(1664525, rng) + 1013904223) >>> 0; return rng / 4294967296; };
    const draws = Array.from({ length: 10000 }, () => mean(Array.from({ length: pairs.length }, () => deltas[Math.floor(random() * pairs.length)]))).sort((a, b) => a - b);
    interval = [draws[Math.floor(draws.length * 0.025)], draws[Math.ceil(draws.length * 0.975) - 1]];
  }
  const result = { metric: input.metric, direction: input.direction, baseline: summary(pairs.map(p => p.baseline)), candidate: summary(pairs.map(p => p.candidate)), meanDelta: mean(deltas), improvementDelta: mean(deltas) * (input.direction === 'higher' ? 1 : -1), pairedMeanDeltaBootstrap95: interval, pairs,
    warnings: ['This estimates variation across paired seeds, not data-sample uncertainty or causal validity.', 'Comparability of dataset, metric and protocol must be checked separately.'] };
  if (pairs.length < 5) result.warnings.push('Fewer than five paired seeds: uncertainty estimates are unstable; treat as exploratory.');
  if (interval && interval[0] === interval[1]) result.warnings.push('Degenerate bootstrap interval is not proof of zero uncertainty.');
  return result;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const { values } = parseArgs({ options: { input: { type: 'string' } } });
    if (!values.input) throw new Error('Use --input FILE');
    process.stdout.write(`${JSON.stringify(compare(JSON.parse(fs.readFileSync(values.input, 'utf8').replace(/^\uFEFF/, ''))), null, 2)}\n`);
  } catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
}
