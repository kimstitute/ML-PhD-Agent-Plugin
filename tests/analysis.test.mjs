import test from 'node:test';
import assert from 'node:assert/strict';
import { compare } from '../plugins/research-workspace/scripts/compare.mjs';
import { extractDois, verifyDoi } from '../plugins/research-workspace/scripts/citations.mjs';

test('matched-seed statistics pair by identity and are deterministic', () => {
  const input = { metric: 'acc', direction: 'higher', baseline: [{ seed: 1, value: 1 }, { seed: 2, value: 2 }, { seed: 3, value: 3 }], candidate: [{ seed: 3, value: 4 }, { seed: 1, value: 2 }, { seed: 2, value: 3 }] };
  const report = compare(input); assert.equal(report.meanDelta, 1); assert.deepEqual(report.pairedMeanDeltaBootstrap95, [1, 1]);
  assert.equal(report.baseline.sampleSd, 1); assert.deepEqual(report, compare(input)); assert.ok(report.warnings.some(w => w.includes('Degenerate')));
});
test('unpaired, duplicate and nonfinite observations rejected', () => {
  const input = { metric: 'x', direction: 'higher', baseline: [{ seed: 1, value: 0 }], candidate: [{ seed: 2, value: 1 }] };
  assert.throws(() => compare(input), /matched/);
  assert.throws(() => compare({ ...input, candidate: [{ seed: 1, value: NaN }] }), /finite/);
  assert.throws(() => compare({ ...input, baseline: [{ seed: 1, value: 1 }, { seed: 1, value: 2 }] }), /Duplicate/);
});
test('one observation has no inferred confidence interval', () => {
  const report = compare({ metric: 'loss', direction: 'lower', baseline: [{ seed: 1, value: 2 }], candidate: [{ seed: 1, value: 1 }] });
  assert.equal(report.pairedMeanDeltaBootstrap95, null); assert.equal(report.baseline.sampleSd, null); assert.equal(report.improvementDelta, 1);
});
test('overflow is reported instead of becoming JSON null', () => {
  assert.throws(() => compare({ metric: 'scaled', direction: 'higher', baseline: [{ seed: 1, value: 1e200 }, { seed: 2, value: 0 }], candidate: [{ seed: 1, value: 1e200 }, { seed: 2, value: 0 }] }), /overflow/);
});
test('DOI extraction retains balanced parentheses and deduplicates', () => {
  assert.deepEqual(extractDois('See (10.1016/0022-1694(93)90119-t). Also 10.1234/ABC; and 10.1234/abc.'), ['10.1016/0022-1694(93)90119-t', '10.1234/ABC']);
});
const response = (status, body) => ({ status, ok: status >= 200 && status < 300, json: async () => body });
test('DOI metadata never implies claim support', async () => {
  const report = await verifyDoi('10.1234/example', async url => url.includes('handles') ? response(200, { responseCode: 1 }) : response(200, { message: { DOI: '10.1234/example', title: ['Example'] } }));
  assert.equal(report.resolution, 'resolved'); assert.equal(report.metadataStatus, 'found'); assert.equal(report.claimSupport, 'not-assessed');
});
test('DOI network failures are unknown, not false absence', async () => {
  const report = await verifyDoi('10.1234/example', async () => { throw new Error('offline'); });
  assert.equal(report.resolution, 'unknown'); assert.equal(report.metadataStatus, 'unknown');
});
test('HTTP200 handle not-found response and absent Crossref metadata distinct', async () => {
  const report = await verifyDoi('10.1234/example', async url => url.includes('handles') ? response(200, { responseCode: 100 }) : response(404, {}));
  assert.equal(report.resolution, 'not-found'); assert.equal(report.metadataStatus, 'not-in-crossref');
});
test('Crossref mismatch is not accepted as matching citation', async () => {
  const report = await verifyDoi('10.1234/example', async url => url.includes('handles') ? response(200, { responseCode: 1 }) : response(200, { message: { DOI: '10.9999/other' } }));
  assert.equal(report.metadataStatus, 'unknown'); assert.match(report.metadataError, /mismatched/);
});
