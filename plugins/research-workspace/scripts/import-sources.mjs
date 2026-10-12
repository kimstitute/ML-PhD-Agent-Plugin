#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { importSources } from '../lib/source-import.mjs';

try {
  const { values } = parseArgs({ options: { project: { type: 'string' }, 'source-root': { type: 'string' }, 'allow-unlicensed': { type: 'boolean', default: false } } });
  if (!values['source-root']) throw new Error('Use --source-root PATH to the six cloned repositories');
  process.stdout.write(`${JSON.stringify(importSources(values.project || process.cwd(), values['source-root'], values['allow-unlicensed']), null, 2)}\n`);
} catch (error) { process.stderr.write(`source import: ${error.message}\n`); process.exitCode = 1; }
