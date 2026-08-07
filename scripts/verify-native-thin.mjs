import { existsSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { repoPath, roleNames } from './lib.mjs';

const expectedSkills = [
  'cdx-ai-slop-cleaner',
  'cdx-analyze',
  'cdx-autopilot',
  'cdx-autoresearch-loop',
  'cdx-autoresearch-plan',
  'cdx-best-practice-research',
  'cdx-clarify',
  'cdx-deep-interview',
  'cdx-design',
  'cdx-execute',
  'cdx-plan',
  'cdx-ralph',
  'cdx-refresh-upstreams',
  'cdx-review',
  'cdx-tdd',
  'cdx-ultraqa',
  'cdx-ultrawork',
  'cdx-visual-ralph',
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function directoryNames(path) {
  return (await readdir(path, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

const skillRoot = repoPath('.agents', 'skills');
assert(existsSync(skillRoot), 'canonical native skill root must be .agents/skills');
const actualSkills = await directoryNames(skillRoot);
assert(
  JSON.stringify(actualSkills) === JSON.stringify(expectedSkills),
  `native skill set mismatch:\nexpected=${expectedSkills.join(',')}\nactual=${actualSkills.join(',')}`,
);

for (const path of [
  repoPath('skills'),
  repoPath('agents'),
  repoPath('docs', 'governor.md'),
  repoPath('registry', 'workflow-mode-schemas.mjs'),
  repoPath('registry', 'workflow-mode-schemas.ts'),
  repoPath('scripts', 'verify-governor.mjs'),
  repoPath('.codex', 'AGENTS.md'),
  repoPath('.codex', 'hooks'),
  repoPath('.codex', 'prompts'),
  repoPath('.codex', 'skills'),
  repoPath('hooks', 'chedex-governor.mjs'),
  repoPath('hooks', 'codex-release-audit.mjs'),
  repoPath('hooks', 'codex-release-deltas.json'),
  repoPath('hooks', 'workflow-mode-schemas.mjs'),
]) {
  assert(!existsSync(path), `obsolete duplicated/runtime surface must be removed: ${path}`);
}

for (const name of roleNames()) {
  const path = repoPath('.codex', 'agents', `${name}.toml`);
  assert(existsSync(path), `missing native agent TOML: ${path}`);
  const content = await readFile(path, 'utf8');
  for (const field of ['name =', 'description =', 'developer_instructions =']) {
    assert(content.includes(field), `native agent ${name} is missing required field ${field}`);
  }
}

const productFiles = [
  repoPath('AGENTS.md'),
  repoPath('AGENTS.template.md'),
  repoPath('scripts', 'install-user.mjs'),
  repoPath('scripts', 'uninstall-user.mjs'),
  repoPath('scripts', 'lib.mjs'),
  repoPath('hooks', 'chedex-native-hook.mjs'),
  ...actualSkills.map((name) => join(skillRoot, name, 'SKILL.md')),
];
const forbiddenRuntimePatterns = [
  [/\bomx\s/i, 'OMX command'],
  [/\.omx\//i, 'OMX state path'],
  [/\bOMX_[A-Z0-9_]+\b/, 'OMX environment variable'],
  [/mcp__omx/i, 'OMX MCP tool'],
  [/\btmux\b/i, 'tmux runtime'],
];

for (const path of productFiles) {
  const content = await readFile(path, 'utf8');
  for (const [pattern, label] of forbiddenRuntimePatterns) {
    assert(!pattern.test(content), `${path} retains ${label}`);
  }
}

const installScript = await readFile(repoPath('scripts', 'install-user.mjs'), 'utf8');
for (const token of ['upsertFeatureFlag', 'mergeManagedHooksConfig', 'hookRuntimePath', 'workflowsDir']) {
  assert(!installScript.includes(token), `installer still owns native/runtime surface: ${token}`);
}

process.stdout.write(`native-thin-ok roles=${roleNames().length} skills=${actualSkills.length}\n`);
