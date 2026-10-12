import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = fileURLToPath(new URL('../', import.meta.url));
const plugin = path.join(root, 'plugins/research-workspace');
let errors = 0;
function check(condition, label) { if (!condition) { process.stderr.write(`${label}\n`); errors += 1; } }
const json = relative => JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
const codex = json('plugins/research-workspace/.codex-plugin/plugin.json');
const claude = json('plugins/research-workspace/.claude-plugin/plugin.json');
check(codex.name === claude.name && codex.version === claude.version, 'Host manifests disagree');
check(codex.version === json('package.json').version, 'Package and plugin versions disagree');
for (const field of ['skills', 'hooks']) check(codex[field].startsWith('./') && !codex[field].includes('..') && fs.existsSync(path.resolve(plugin, codex[field])), `Bad Codex ${field}`);
for (const field of ['logo', 'composerIcon']) check(codex.interface[field].startsWith('./assets/') && !codex.interface[field].includes('..') && fs.existsSync(path.resolve(plugin, codex.interface[field])), `Bad plugin image: ${field}`);
check(fs.existsSync(path.join(root, 'LICENSE')), 'Missing repository license');
for (const relative of ['.agents/plugins/marketplace.json', '.claude-plugin/marketplace.json']) {
  const market = json(relative);
  check(market.plugins.every(p => p.name === codex.name && fs.existsSync(path.resolve(root, typeof p.source === 'string' ? p.source : p.source.path))), `Bad marketplace ${relative}`);
}
const directories = fs.readdirSync(path.join(plugin, 'skills'));
for (const name of directories) {
  const file = path.join(plugin, 'skills', name, 'SKILL.md');
  const content = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  check(content.startsWith(`---\nname: ${name}\n`), `Skill name mismatch: ${name}`);
  check(/^description: .+/m.test(content), `Missing skill description: ${name}`);
  for (const link of content.matchAll(/\]\(([^)]+)\)/g)) {
    if (!/^(https?:|#)/.test(link[1])) check(fs.existsSync(path.resolve(path.dirname(file), link[1])), `Broken reference in ${name}: ${link[1]}`);
  }
}
for (const [file, variable] of [['hooks/hooks.json', 'CLAUDE_PLUGIN_ROOT'], ['hooks/codex.json', 'PLUGIN_ROOT']]) {
  const config = JSON.parse(fs.readFileSync(path.join(plugin, file), 'utf8'));
  for (const groups of Object.values(config.hooks)) for (const group of groups) for (const hook of group.hooks) {
    check(hook.command.includes(`\"\${${variable}}/scripts/hook.mjs\"`), `Hook path is not safely quoted: ${file}`);
    check(hook.timeout <= 10, 'Unexpected long-running hook');
  }
}
for (const directory of ['lib', 'scripts']) for (const name of fs.readdirSync(path.join(plugin, directory)).filter(n => n.endsWith('.mjs'))) {
  const result = spawnSync(process.execPath, ['--check', path.join(plugin, directory, name)], { encoding: 'utf8' });
  check(result.status === 0, result.stderr || `Syntax error: ${name}`);
}
for (const license of ['oh-my-paper', 'researcher-skill', 'literature-review-skill', 'ml-researcher-os']) check(fs.readFileSync(path.join(plugin, 'licenses', `${license}.txt`), 'utf8').includes('Permission is hereby granted'), `Missing upstream license: ${license}`);
check(!fs.existsSync(path.join(plugin, '.research')) && !fs.existsSync(path.join(plugin, '.upstream')), 'Private sources leaked into distributable plugin');
process.stdout.write(`${directories.length} skills; 2 host manifests; 2 marketplaces; syntax/references/licenses checked. ${errors} errors.\n`);
process.exitCode = errors ? 1 : 0;

