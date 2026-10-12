import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { projectRoot, safePath, withLock } from './workspace.mjs';

export const SOURCE_SELECTION = [
  { directory: 'agent-research-skills', repo: 'lingzhi227/agent-research-skills', revision: '9e6c085d65e313e475e921fdfe795ac11eb7589e', license: 'not-specified', skills: ['skills/backward-traceability', 'skills/experiment-design', 'skills/paper-to-code', 'skills/self-review'] },
  { directory: 'ml-researcher', repo: 'genai-io/ml-researcher', revision: '98d37cbc10538a3f1639e8482d6da49dd87aaa6f', license: 'not-specified', skills: ['skills/ablation-planner', 'skills/data-leak-scan', 'skills/seed-sensitivity', 'skills/error-analysis'] },
  { directory: 'agent-skills', repo: 'jurgendn/agent-skills', revision: 'f290312fb6c55a044402e8649afff5c112e660ab', license: 'not-specified', skills: ['skills/research-experimentation/hypothesis-and-ablation-planner', 'skills/research-experimentation/model-eval-error-analysis', 'skills/research-engineering/paper-to-code', 'skills/research-discovery/research-idea-stress-test'] },
  { directory: 'ResearcherSkill', repo: 'krzysztofdudek/ResearcherSkill', revision: '034ec64d73c0809b97bd3ddfc57e1e6b0ddcec9a', license: 'MIT', skills: ['skills/researcher'] },
  { directory: 'ml-researcher-os', repo: 'maximussthegreat/ml-researcher-os', revision: '5b1404d5aa4697dfd025fa9100169b3bf7f8b93d', license: 'MIT', skills: ['skills/experiment-planner', 'skills/reproducibility-auditor', 'skills/result-reporter'] },
  { directory: 'literature-review-skill', repo: 'pinshuai/literature-review-skill', revision: 'ed62a2899202707b58e87e4cd6ae45792772fe58', license: 'MIT', skills: ['SKILL.md', 'references', 'scripts/verify_citations.py'] }
];
const digest = data => crypto.createHash('sha256').update(data).digest('hex');
function walk(root, relative) {
  const file = safePath(root, relative);
  if (fs.statSync(file).isDirectory()) return fs.readdirSync(file).flatMap(name => walk(root, `${relative}/${name}`));
  if (!fs.statSync(file).isFile()) throw new Error(`Not a regular source file: ${relative}`);
  return [{ relative, bytes: fs.readFileSync(file) }];
}
// Explicit project-private vendoring, separate from the redistributable plugin.
// Copies source/reference material only; does not install or execute its hooks.
export function importSources(project, sourceRoot, allowUnlicensed = false) {
  const root = projectRoot(project);
  return withLock(root, () => importLocked(root, sourceRoot, allowUnlicensed));
}
function importLocked(root, sourceRoot, allowUnlicensed) {
  const sources = projectRoot(sourceRoot);
  safePath(root, '.research/vendor');
  if (!fs.existsSync(safePath(root, '.research/state.json'))) throw new Error('Initialize this project before importing sources');
  if (!allowUnlicensed) throw new Error('This selection contains license-unspecified repos; explicit --allow-unlicensed is required for private use');
  const pending = [];
  const records = [];
  // Validate every source and destination before copying anything.
  for (const selection of SOURCE_SELECTION) {
    const repoRoot = safePath(sources, selection.directory);
    const revision = execFileSync('git', ['-c', `safe.directory=${repoRoot.replaceAll('\\', '/')}`, '-C', repoRoot, 'rev-parse', 'HEAD'], { encoding: 'utf8', windowsHide: true }).trim();
    if (revision !== selection.revision) throw new Error(`Unexpected source revision for ${selection.repo}; inspect and update provenance before importing`);
    const files = selection.skills.flatMap(relative => walk(repoRoot, relative));
    if (selection.license === 'MIT') files.push(...walk(repoRoot, 'LICENSE'));
    const entry = { ...selection, importedAt: new Date().toISOString(), files: [] };
    for (const file of files) {
      const destination = `.research/vendor/${selection.directory}/${file.relative}`;
      const filename = safePath(root, destination);
      const sha256 = digest(file.bytes);
      if (fs.existsSync(filename) && digest(fs.readFileSync(filename)) !== sha256) throw new Error(`Private source modified; refusing overwrite: ${destination}`);
      pending.push({ filename, bytes: file.bytes });
      entry.files.push({ path: destination, sha256 });
    }
    records.push(entry);
  }
  for (const file of pending) {
    fs.mkdirSync(path.dirname(file.filename), { recursive: true });
    if (!fs.existsSync(file.filename)) fs.writeFileSync(file.filename, file.bytes, { flag: 'wx' });
  }
  const filename = safePath(root, '.research/vendor/index.json');
  const output = { schemaVersion: 1, distribution: 'private-project-only', warning: 'License-unspecified sources are excluded from the plugin package. Importing does not establish redistribution rights. Original instructions are reference material, subordinate to user scope and host safety.', sources: records };
  const temp = safePath(root, `.research/vendor/index-${crypto.randomUUID()}.tmp`);
  fs.writeFileSync(temp, `${JSON.stringify(output, null, 2)}\n`, { flag: 'wx' });
  fs.renameSync(temp, filename);
  return { repositories: records.length, files: pending.length, index: '.research/vendor/index.json' };
}
