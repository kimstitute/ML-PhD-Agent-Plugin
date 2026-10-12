#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { execute, readJson } from '../lib/workspace.mjs';

export const HELP = `Research Workspace (Node >=20; no dependencies)
  node research.mjs [--project PATH] [--actor NAME] <command> [action] [options]
  init --topic TEXT [--constraints TEXT]     Create/rebind a project workspace
  context | status | doctor                Read context, JSON state, integrity report
  task add --title TEXT [--owner NAME]      Coordinator creates work
  task start --id ID                       Owner claims/starts work
  task submit --id ID --report FILE        Owner submits an artifact for review
  task accept|revise --id ID --reason TEXT  Coordinator reviews work
  run plan --spec FILE                     Register config, baseline, seed, budget
  run start --id ID --job TEXT              Record an externally launched job
  run finish --id ID --result FILE          Save measured result + raw artifacts
  source add --spec FILE                    Record paper notes + reading level
  claim add --spec FILE                     Link proposed claim to evidence
  claim review --id ID --status STATUS --reason TEXT
  decision add --text TEXT                  Record an accepted/rejected direction
  handoff add --summary TEXT --next TEXT [--artifact FILE ...]
Paths in specs/reports are relative to PROJECT, not the plugin or input file.
All writes use the shared lock + atomic journal. Commands NEVER execute training.
Actor defaults to coordinator; use unique actor names for parallel sessions.
Use skills/references for JSON spec examples. No global settings are changed.`;

try {
  const parsed = parseArgs({ allowPositionals: true, options: Object.fromEntries(
    ['project', 'actor', 'topic', 'constraints', 'title', 'owner', 'id', 'report', 'reason', 'spec', 'job', 'result', 'status', 'text', 'summary', 'next'].map(key => [key, { type: 'string' }]).concat([['artifact', { type: 'string', multiple: true }]])
  ) });
  const [entity, action, ...extra] = parsed.positionals;
  if (!entity || entity === 'help') process.stdout.write(`${HELP}\n`);
  else {
    if (extra.length || (action && ['init', 'context', 'status', 'doctor'].includes(entity))) throw new Error('Unexpected positional arguments');
    const options = { ...parsed.values };
    if (options.spec) options.spec = readJson(options.spec);
    if (options.result) options.result = readJson(options.result);
    options.artifacts = options.artifact || [];
    const result = execute(options.project || process.cwd(), action ? `${entity}:${action}` : entity, options);
    process.stdout.write(`${typeof result === 'string' ? result : JSON.stringify(result, null, 2)}\n`);
    if (entity === 'doctor' && !result.ok) process.exitCode = 1;
  }
} catch (error) {
  process.stderr.write(`research-workspace: ${error.message}\n`);
  process.exitCode = 1;
}
