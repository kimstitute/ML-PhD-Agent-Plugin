#!/usr/bin/env node
import fs from 'node:fs';
import { execute, projectRoot, safePath } from '../lib/workspace.mjs';

// Hooks are read-only. The agent explicitly persists handoffs via the CLI.
// Do not parse report code fences out of hook JSON, or infer success from Stop.
try {
  const raw = fs.readFileSync(0, 'utf8').trim();
  const input = raw ? JSON.parse(raw) : {};
  const root = projectRoot(input.cwd || process.cwd());
  if (fs.existsSync(safePath(root, '.research'))) {
    if (process.argv[2] === 'session') process.stdout.write(`${execute(root, 'context')}\n`);
    else {
      const report = execute(root, 'doctor');
      if (!report.ok) process.stderr.write(`Research integrity warning: ${report.issues.join('; ')}\n`);
    }
  }
} catch (error) {
  // Visible diagnostic, but no endless Stop retry loop or implicit mutation.
  process.stderr.write(`Research workspace hook warning: ${error.message}\n`);
}
