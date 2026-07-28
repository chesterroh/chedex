import { execFileSync } from 'node:child_process';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { ROLE_DEFINITIONS } from '../registry/agent-definitions.mjs';
import {
  anyMissing,
  buildAgentToml,
  chedexLatestVerifiedCodexVersion,
  chedexMinimumCodexVersion,
  generatedAgentPath,
  installManifestPaths,
  listSkills,
  repoPath,
  roleNames,
  rolePromptPath,
  stripFrontmatter,
} from './lib.mjs';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const expectedSkills = [...listSkills()].sort();
const actualSkills = (await readdir(repoPath('.agents', 'skills'), { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();
assert(JSON.stringify(actualSkills) === JSON.stringify(expectedSkills), 'registered skills do not match .agents/skills');
assert(actualSkills.every((name) => name.startsWith('cdx-')), 'all Chedex skills must use the cdx- prefix');

const manifest = installManifestPaths();
const requiredPaths = [manifest.templateAgents, manifest.promptsDir, manifest.skillsDir, manifest.agentsDir];
const missing = anyMissing(requiredPaths);
assert(missing.length === 0, `missing install surfaces: ${missing.join(', ')}`);

for (const name of actualSkills) {
  const path = join(manifest.skillsDir, name, 'SKILL.md');
  const content = await readFile(path, 'utf8');
  assert(content.startsWith('---\n'), `skill ${name} is missing frontmatter`);
  assert(content.includes(`name: ${name}`), `skill ${name} has the wrong frontmatter name`);
  assert(/^description:\s*\S/m.test(content), `skill ${name} is missing a description`);
}

for (const name of roleNames()) {
  const prompt = await readFile(rolePromptPath(name), 'utf8');
  assert(/^description:\s*\S/m.test(prompt), `prompt ${name} is missing a description`);
  const generated = await readFile(generatedAgentPath(name), 'utf8');
  const expected = buildAgentToml(ROLE_DEFINITIONS[name], stripFrontmatter(prompt));
  assert(generated === expected, `generated agent is stale: ${generatedAgentPath(name)}`);
  assert(generated.includes(`name = "${name}"`), `agent ${name} is missing name`);
  assert(generated.includes(`description = "${ROLE_DEFINITIONS[name].summary}"`), `agent ${name} is missing description`);
  assert(generated.includes('developer_instructions = """'), `agent ${name} is missing developer instructions`);
  assert(!generated.includes('model_reasoning_effort ='), `agent ${name} should inherit native caller/default effort`);
}

const docSurfaces = [repoPath('README.md'), repoPath('docs', 'install.md'), repoPath('AGENTS.template.md')];
for (const path of docSurfaces) {
  const content = await readFile(path, 'utf8');
  for (const skill of actualSkills) {
    assert(content.includes(`\`${skill}\``), `${path} does not document ${skill}`);
  }
}

const extraction = await readFile(repoPath('docs', 'omx-skill-extraction.md'), 'utf8');
for (const snippet of [
  '0.20.3',
  '6c970cc12da256bfc7667edd0a9183b158d4a7a7',
  'Complete OMX Skill Disposition',
  'Catalog skills | 50',
  'PORT',
  'MERGE',
  'NATIVE',
  'DROP',
  'no OMX command',
  'Codex CLI `0.145.0`',
]) {
  assert(extraction.includes(snippet), `extraction audit is missing ${snippet}`);
}
const dispositionRows = extraction.split('\n').filter((line) => /^\| \d+ \| `/.test(line));
assert(dispositionRows.length === 50, `extraction audit should classify 50 skills; found ${dispositionRows.length}`);

const nativeDelta = await readFile(repoPath('docs', 'native-delta-audit.md'), 'utf8');
for (const snippet of [
  `Minimum Codex CLI: \`${chedexMinimumCodexVersion}\``,
  `Latest verified Codex CLI: \`${chedexLatestVerifiedCodexVersion}\``,
  'goals are stable and on by default',
  '.agents/skills',
  'description',
  'Bounded Hook Delta',
  'rust-v0.145.0',
]) {
  assert(nativeDelta.includes(snippet), `native delta audit is missing ${snippet}`);
}

const readme = await readFile(repoPath('README.md'), 'utf8');
for (const snippet of ['native Goal mode', 'native subagents', '.agents/skills', '.codex/agents', '.codex/hooks.json', 'npm run audit:codex', 'rust-v0.145.0']) {
  assert(readme.includes(snippet), `README is missing ${snippet}`);
}

const hookDocs = await readFile(repoPath('docs', 'hooks.md'), 'utf8');
for (const snippet of ['Codex discovers', 'PreToolUse', 'PostToolUse', 'hash-based review', 'v0.20.3']) {
  assert(hookDocs.includes(snippet), `hook docs are missing ${snippet}`);
}

const installDocs = await readFile(repoPath('docs', 'install.md'), 'utf8');
for (const snippet of ['~/.agents/skills', '~/.codex/agents', 'does not install hooks', 'does not write feature flags', 'npm run uninstall:user']) {
  assert(installDocs.includes(snippet), `install docs are missing ${snippet}`);
}

const mjsFiles = [
  ...((await readdir(repoPath('scripts'))).filter((name) => name.endsWith('.mjs')).map((name) => repoPath('scripts', name))),
  repoPath('hooks', 'chedex-native-hook.mjs'),
  repoPath('registry', 'agent-definitions.mjs'),
];
for (const path of mjsFiles) {
  execFileSync(process.execPath, ['--check', path], { stdio: 'pipe' });
}

process.stdout.write(`verify-repo-ok roles=${roleNames().length} skills=${actualSkills.length}\n`);
