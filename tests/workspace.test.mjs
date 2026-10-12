import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { execute, loadState, safePath, doctor } from '../plugins/research-workspace/lib/workspace.mjs';
import { importSources } from '../plugins/research-workspace/lib/source-import.mjs';

const plugin = fileURLToPath(new URL('../plugins/research-workspace/', import.meta.url));
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'research-workspace-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  execute(root, 'init', { topic: 'CV hypothesis', constraints: 'No test-set tuning' });
  return root;
}
function put(root, filename, value) {
  fs.mkdirSync(path.dirname(path.join(root, filename)), { recursive: true });
  fs.writeFileSync(path.join(root, filename), typeof value === 'string' ? value : JSON.stringify(value));
}
function planned(root, extra = {}) {
  put(root, 'configs/baseline.json', { learningRate: 0.01 });
  return execute(root, 'run:plan', { actor: 'experiment-1', spec: { hypothesis: 'Measured baseline', command: 'python train.py', codeVersion: 'source-snapshot-001', config: 'configs/baseline.json', dataset: { id: 'cv-data', version: 'v1', split: 'validation' }, seed: 42, budgetSeconds: 60, purpose: 'baseline', ...extra } });
}
function succeeded(root) {
  const run = planned(root);
  execute(root, 'run:start', { actor: 'experiment-1', id: run.id, job: 'foreground-001' });
  put(root, 'outputs/metrics.json', { accuracy: 0.82 });
  execute(root, 'run:finish', { actor: 'experiment-1', id: run.id, result: { status: 'succeeded', metrics: { accuracy: 0.82 }, artifacts: ['outputs/metrics.json'], observation: 'Measured validation result' } });
  return run.id;
}
test('init is idempotent and preserves user guidance', t => {
  const root = fixture(t);
  put(root, 'AGENTS.md', `User-owned instructions.\n${fs.readFileSync(path.join(root, 'AGENTS.md'), 'utf8')}`);
  assert.equal(execute(root, 'init', { topic: 'DO NOT RESET' }).initialized, false);
  assert.equal(loadState(root).project.topic, 'CV hypothesis');
  const instructions = fs.readFileSync(path.join(root, 'AGENTS.md'), 'utf8');
  assert.ok(instructions.startsWith('User-owned instructions.'));
  assert.equal(instructions.match(/research-workspace:start/g).length, 1);
  assert.equal(doctor(root).ok, true);
});
test('Codex worker to Claude coordinator task handoff', t => {
  const root = fixture(t);
  const task = execute(root, 'task:add', { title: 'Inspect baseline', owner: 'codex-1' });
  execute(root, 'task:start', { actor: 'codex-1', id: task.id });
  put(root, '.research/agents/codex-1/workspace/report.md', 'Baseline inspected; no training run.');
  execute(root, 'task:submit', { actor: 'codex-1', id: task.id, report: '.research/agents/codex-1/workspace/report.md' });
  assert.throws(() => execute(root, 'task:accept', { actor: 'claude-1', id: task.id, reason: 'Reviewed' }), /coordinator/);
  execute(root, 'task:accept', { actor: 'coordinator', id: task.id, reason: 'Checked actual report' });
  assert.equal(loadState(root).tasks[0].status, 'done');
  execute(root, 'handoff:add', { actor: 'codex-1', summary: 'Baseline inspected', next: 'Plan the first smoke test' });
  assert.match(execute(root, 'context'), /Plan the first smoke test/);
});
test('task transitions and ownership are enforced', t => {
  const root = fixture(t);
  const task = execute(root, 'task:add', { title: 'Implement', owner: 'a' });
  assert.throws(() => execute(root, 'task:start', { actor: 'b', id: task.id }), /another actor/);
  assert.throws(() => execute(root, 'task:accept', { id: task.id, reason: 'Skip review' }), /under review/);
  execute(root, 'task:start', { actor: 'a', id: task.id });
  put(root, 'report.md', 'Report');
  execute(root, 'task:submit', { actor: 'a', id: task.id, report: 'report.md' });
  execute(root, 'task:revise', { id: task.id, reason: 'Add evidence' });
  assert.equal(loadState(root).tasks[0].status, 'in-progress');
});
test('failure is retained without manufacturing zero metrics', t => {
  const root = fixture(t);
  const run = planned(root);
  execute(root, 'run:start', { actor: 'experiment-1', id: run.id, job: 'PID-123' });
  put(root, 'outputs/error.log', 'OOM');
  execute(root, 'run:finish', { actor: 'experiment-1', id: run.id, result: { status: 'failed', metrics: {}, artifacts: ['outputs/error.log'], observation: 'OOM before evaluation' } });
  assert.deepEqual(loadState(root).runs[0].metrics, {});
  assert.equal(loadState(root).runs[0].status, 'failed');
  assert.equal(doctor(root).ok, true);
});
test('baseline references and test-set intent checked', t => {
  const root = fixture(t);
  assert.throws(() => planned(root, { purpose: 'experiment' }), /baselineId/);
  assert.throws(() => planned(root, { seed: '42' }), /integer seed/);
  assert.throws(() => planned(root, { budgetSeconds: 0 }), /budgetSeconds/);
  assert.throws(() => planned(root, { dataset: { id: 'cv-data', version: 'v1', split: 'test' } }), /human-approved/);
  const baselineId = succeeded(root);
  assert.throws(() => planned(root, { purpose: 'experiment', baselineId, dataset: { id: 'cv-data', version: 'v2', split: 'validation' } }), /must match/);
  const run = planned(root, { purpose: 'experiment', baselineId, dataset: { split: 'validation', version: 'v1', id: 'cv-data' } });
  assert.equal(run.baselineId, baselineId);
});
test('run control fields cannot be forged in a spec', t => {
  const root = fixture(t);
  const run = planned(root, { id: 'forged', owner: 'attacker', status: 'succeeded', metrics: { accuracy: 1 } });
  assert.notEqual(run.id, 'forged'); assert.equal(run.owner, 'experiment-1'); assert.equal(run.status, 'planned'); assert.equal(run.metrics, undefined);
});
test('raw artifacts, finite measured values and owner needed for completion', t => {
  const root = fixture(t);
  const run = planned(root);
  assert.throws(() => execute(root, 'run:finish', { actor: 'experiment-1', id: run.id, result: {} }), /running/);
  execute(root, 'run:start', { actor: 'experiment-1', id: run.id, job: 'real-job' });
  assert.throws(() => execute(root, 'run:finish', { actor: 'experiment-1', id: run.id, result: { status: 'succeeded', metrics: { accuracy: 1 }, artifacts: [] } }), /artifacts/);
  put(root, 'raw.log', 'Evidence');
  assert.throws(() => execute(root, 'run:finish', { actor: 'experiment-1', id: run.id, result: { status: 'succeeded', metrics: { accuracy: NaN }, artifacts: ['raw.log'], observation: 'Bad' } }), /finite/);
});
test('claims link exact run metrics and hashes', t => {
  const root = fixture(t); const runId = succeeded(root);
  assert.throws(() => execute(root, 'claim:add', { spec: { text: 'Forged', evidence: [{ kind: 'run', id: runId, locator: 'accuracy', metric: 'accuracy', value: 0.99 }] } }), /does not match/);
  const claim = execute(root, 'claim:add', { spec: { text: 'Measured 0.82', evidence: [{ kind: 'run', id: runId, locator: 'accuracy', metric: 'accuracy', value: 0.82 }] } });
  execute(root, 'claim:review', { id: claim.id, status: 'supported', reason: 'Checked raw metrics; scope is this run only' });
  assert.equal(loadState(root).claims[0].status, 'supported');
  put(root, 'outputs/metrics.json', { accuracy: 1 });
  assert.equal(doctor(root).ok, false);
  assert.throws(() => execute(root, 'claim:review', { id: claim.id, status: 'supported', reason: 'Ignore tampering' }), /Evidence changed/);
});
test('abstract-only citation cannot establish supported', t => {
  const root = fixture(t); put(root, 'notes.md', 'Only abstract was read');
  const source = execute(root, 'source:add', { spec: { title: 'Paper', url: 'https://example.org/paper', readLevel: 'abstract', notes: 'notes.md', locator: 'Abstract' } });
  const claim = execute(root, 'claim:add', { spec: { text: 'Tentative', evidence: [{ kind: 'source', id: source.id, locator: 'Abstract' }] } });
  assert.throws(() => execute(root, 'claim:review', { id: claim.id, status: 'supported', reason: 'DOI exists' }), /Abstract-only/);
  execute(root, 'claim:review', { id: claim.id, status: 'partial', reason: 'Only abstract evidence' });
});
test('full-text claim still needs explicit reviewer reason', t => {
  const root = fixture(t); put(root, 'paper.txt', 'Actual locally read text'); put(root, 'note-v1.md', 'Section 2 supports a scoped finding');
  const source = execute(root, 'source:add', { spec: { title: 'Paper', url: 'https://example.org/paper', readLevel: 'fulltext', notes: 'note-v1.md', fulltext: 'paper.txt', locator: 'Section 2' } });
  const claim = execute(root, 'claim:add', { spec: { text: 'Scoped finding', evidence: [{ kind: 'source', id: source.id, locator: 'Section 2' }] } });
  assert.throws(() => execute(root, 'claim:review', { id: claim.id, status: 'supported' }), /reason/);
  execute(root, 'claim:review', { id: claim.id, status: 'supported', reason: 'Read Section 2; finding applies under its assumptions' });
  assert.equal(doctor(root).ok, true);
});
test('path traversal, absolute paths, reserved actors and symlinks blocked', t => {
  const root = fixture(t);
  assert.throws(() => safePath(root, '../outside.txt'), /escapes/);
  assert.throws(() => safePath(root, path.resolve(root, 'inside.txt')), /relative/);
  assert.throws(() => execute(root, 'handoff:add', { actor: '../outside', summary: 'x', next: 'x' }), /Invalid actor/);
  assert.throws(() => execute(root, 'handoff:add', { actor: 'CON', summary: 'x', next: 'x' }), /Invalid actor/);
  fs.mkdirSync(path.join(root, 'original'));
  try { fs.symlinkSync(path.join(root, 'original'), path.join(root, 'linked'), process.platform === 'win32' ? 'junction' : 'dir'); }
  catch (error) { if (error.code === 'EPERM') { t.diagnostic('Symlink permission unavailable'); return; } throw error; }
  assert.throws(() => safePath(root, 'linked/file.txt'), /Symlink/);
});
test('writer lock does not silently delete another process lock', t => {
  const root = fixture(t); fs.mkdirSync(path.join(root, '.research/.write-lock'));
  assert.throws(() => execute(root, 'decision:add', { text: 'Race' }), /locked/);
  assert.ok(fs.existsSync(path.join(root, '.research/.write-lock')));
});
test('parallel real CLI writers keep every accepted update', async t => {
  const root = fixture(t);
  const command = path.join(plugin, 'scripts/research.mjs');
  const run = title => new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [command, '--project', root, 'task', 'add', '--title', title], { windowsHide: true });
    let stderr = ''; child.stderr.on('data', chunk => { stderr += chunk; });
    child.on('error', reject); child.on('close', code => resolve({ code, stderr }));
  });
  await Promise.all(Array.from({ length: 6 }, async (_, index) => {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const result = await run(`Parallel task ${index}`);
      if (result.code === 0) return;
      assert.match(result.stderr, /locked/);
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    assert.fail('Writer could not acquire lock after bounded retry');
  }));
  assert.equal(loadState(root).tasks.length, 6);
  assert.equal(loadState(root).revision, 7);
  assert.equal(doctor(root).ok, true);
});
test('a projection write failure does not erase an already committed event', t => {
  const root = fixture(t); const snapshot = path.join(root, '.research/state.json');
  fs.unlinkSync(snapshot); fs.mkdirSync(snapshot);
  assert.throws(() => execute(root, 'decision:add', { text: 'Committed before snapshot failure' }));
  assert.equal(loadState(root).decisions[0].text, 'Committed before snapshot failure');
  assert.equal(loadState(root).revision, 2);
  fs.rmdirSync(snapshot);
  execute(root, 'decision:add', { text: 'Recovered projection' });
  assert.equal(doctor(root).ok, true);
});
test('journal recovers torn snapshot; external state edits refused', t => {
  const root = fixture(t); execute(root, 'decision:add', { text: 'Preserve this decision' });
  put(root, '.research/state.json', '{torn');
  assert.equal(loadState(root).decisions[0].text, 'Preserve this decision');
  execute(root, 'decision:add', { text: 'Recovery succeeded' });
  const state = loadState(root); state.project.topic = 'Externally forged'; put(root, '.research/state.json', state);
  assert.throws(() => loadState(root), /outside the CLI/);
});
test('corrupted latest journal is not ignored', t => {
  const root = fixture(t); put(root, '.research/events/00000001.json', '{bad');
  assert.equal(doctor(root).ok, false);
  assert.throws(() => execute(root, 'decision:add', { text: 'Do not overwrite' }));
});
test('doctor detects a missing committed journal revision', t => {
  const root = fixture(t); execute(root, 'decision:add', { text: 'Second revision' });
  fs.unlinkSync(path.join(root, '.research/events/00000001.json'));
  assert.ok(doctor(root).issues.some(issue => issue.includes('sequence gap')));
});
test('private source import requires explicit opt-in and releases its lock on failure', t => {
  const root = fixture(t);
  assert.throws(() => importSources(root, root, false), /allow-unlicensed/);
  assert.equal(fs.existsSync(path.join(root, '.research/.write-lock')), false);
  assert.equal(fs.existsSync(path.join(root, '.research/vendor')), false);
});
test('real project launcher and SessionStart hooks work in paths with spaces', t => {
  const parent = fixture(t); const root = path.join(parent, 'project with spaces'); fs.mkdirSync(root);
  execute(root, 'init', { topic: '한국어 컴퓨터비전 연구' });
  const result = spawnSync(process.execPath, ['.research/research.mjs', 'context'], { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr); assert.match(result.stdout, /한국어/);
  const hook = spawnSync(process.execPath, [path.join(plugin, 'scripts/hook.mjs'), 'session'], { input: JSON.stringify({ cwd: root, session_id: 'claude-or-codex' }), encoding: 'utf8' });
  assert.equal(hook.status, 0); assert.match(hook.stdout, /한국어/);
  const before = loadState(root).revision;
  const stop = spawnSync(process.execPath, [path.join(plugin, 'scripts/hook.mjs'), 'stop'], { input: JSON.stringify({ cwd: root, last_assistant_message: 'I succeeded!' }), encoding: 'utf8' });
  assert.equal(stop.status, 0); assert.equal(loadState(root).revision, before);
});
test('hook skips unrelated projects and reports malformed input without mutation', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'research-hook-')); t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const hook = spawnSync(process.execPath, [path.join(plugin, 'scripts/hook.mjs'), 'session'], { input: JSON.stringify({ cwd: root }), encoding: 'utf8' });
  assert.equal(hook.stdout, ''); assert.equal(fs.existsSync(path.join(root, '.research')), false);
  const invalid = spawnSync(process.execPath, [path.join(plugin, 'scripts/hook.mjs'), 'session'], { input: 'invalid', encoding: 'utf8' });
  assert.match(invalid.stderr, /warning/); assert.equal(invalid.status, 0);
});
