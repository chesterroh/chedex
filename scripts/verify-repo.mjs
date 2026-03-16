import { readFile, readdir } from 'node:fs/promises';
import { ROLE_DEFINITIONS } from '../registry/agent-definitions.mjs';
import {
  anyMissing,
  generatedAgentPath,
  installManifestPaths,
  listSkills,
  probeCodexHooksSupport,
  repoPath,
  roleNames,
  rolePromptPath,
} from './lib.mjs';

const hookProbe = probeCodexHooksSupport();
if (!hookProbe.ok) {
  throw new Error(`native hook support check failed: ${hookProbe.reason}`);
}

const repoSkillDirs = (await readdir(repoPath('skills'), { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();
const registeredSkills = [...listSkills()].sort();

if (JSON.stringify(repoSkillDirs) !== JSON.stringify(registeredSkills)) {
  throw new Error(
    `registered skills do not match skills/ directory:\nregistered=${registeredSkills.join(', ')}\nrepo=${repoSkillDirs.join(', ')}`,
  );
}

const missingPrompts = anyMissing(roleNames().map((name) => rolePromptPath(name)));
const missingAgents = anyMissing(roleNames().map((name) => generatedAgentPath(name)));
const missingSkills = anyMissing(repoSkillDirs.map((name) => repoPath('skills', name, 'SKILL.md')));

if (missingPrompts.length || missingAgents.length || missingSkills.length) {
  throw new Error([
    missingPrompts.length ? `missing prompts: ${missingPrompts.join(', ')}` : '',
    missingAgents.length ? `missing agents: ${missingAgents.join(', ')}` : '',
    missingSkills.length ? `missing skills: ${missingSkills.join(', ')}` : '',
  ].filter(Boolean).join('\n'));
}

for (const name of roleNames()) {
  const prompt = await readFile(rolePromptPath(name), 'utf8');
  const agent = await readFile(generatedAgentPath(name), 'utf8');
  if (!agent.includes(`role: ${name}`)) {
    throw new Error(`generated agent missing role metadata for ${name}`);
  }
  if (!prompt.includes('description:')) {
    throw new Error(`prompt missing frontmatter description for ${name}`);
  }
}

for (const name of repoSkillDirs) {
  const skill = await readFile(repoPath('skills', name, 'SKILL.md'), 'utf8');
  if (!skill.includes(`name: ${name}`)) {
    throw new Error(`skill frontmatter name mismatch for ${name}`);
  }
  if (!skill.includes('description:')) {
    throw new Error(`skill missing frontmatter description for ${name}`);
  }
}

const manifest = installManifestPaths();
const requiredPaths = [manifest.templateAgents, manifest.promptsDir, manifest.skillsDir, manifest.agentsDir, manifest.hooksDir];
const missingInstallPaths = anyMissing(requiredPaths);
if (missingInstallPaths.length) {
  throw new Error(`install manifest paths missing: ${missingInstallPaths.join(', ')}`);
}

const codexOnlySurfaces = [
  manifest.templateAgents,
  ...roleNames().map((name) => rolePromptPath(name)),
  ...roleNames().map((name) => generatedAgentPath(name)),
  ...repoSkillDirs.map((name) => repoPath('skills', name, 'SKILL.md')),
  repoPath('README.md'),
  repoPath('docs', 'install.md'),
  repoPath('docs', 'customizing.md'),
  repoPath('docs', 'governor.md'),
  repoPath('hooks', 'chedex-governor.mjs'),
];

for (const path of codexOnlySurfaces) {
  const content = await readFile(path, 'utf8');
  if (content.includes('~/.omx') || content.includes('$HOME/.omx') || content.includes('.omx/agents')) {
    throw new Error(`install surface still references ~/.omx: ${path}`);
  }
}

const skillDocSurfaces = [
  repoPath('README.md'),
  repoPath('docs', 'install.md'),
  manifest.templateAgents,
];

for (const path of skillDocSurfaces) {
  const content = await readFile(path, 'utf8');
  for (const skill of registeredSkills) {
    if (!content.includes(`\`${skill}\``)) {
      throw new Error(`doc surface missing registered skill ${skill}: ${path}`);
    }
  }
}

const governorSurfaceChecks = [
  [repoPath('README.md'), ['codex_hooks', 'hooks.json', '_active.json', 'handoff.json']],
  [repoPath('docs', 'install.md'), ['codex_hooks', 'hooks.json', '0.114.0']],
  [repoPath('docs', 'governor.md'), ['workflow-sync', 'SessionStart', 'Stop', 'handoff.json']],
  [repoPath('skills', 'plan', 'SKILL.md'), ['handoff.json', 'architect', 'verifier']],
  [repoPath('skills', 'ralph', 'SKILL.md'), ['schema_version', 'workflow_root', 'verification']],
  [repoPath('skills', 'autopilot', 'SKILL.md'), ['handoff.json', 'Validate', 'verification']],
  [repoPath('skills', 'ultrawork', 'SKILL.md'), ['$CODEX_HOME/workflows/ultrawork']],
  [repoPath('AGENTS.template.md'), ['SessionStart', 'Stop', 'terminal']],
];

for (const [path, snippets] of governorSurfaceChecks) {
  const content = await readFile(path, 'utf8');
  for (const snippet of snippets) {
    if (!content.includes(snippet)) {
      throw new Error(`governor surface missing "${snippet}": ${path}`);
    }
  }
}

const installScript = await readFile(repoPath('scripts', 'install-user.mjs'), 'utf8');
if (!installScript.includes('mergeManagedHooksConfig') || !installScript.includes('probeCodexHooksSupport')) {
  throw new Error('install-user.mjs is missing native hook wiring');
}

const uninstallScript = await readFile(repoPath('scripts', 'uninstall-user.mjs'), 'utf8');
if (!uninstallScript.includes('stripManagedHooksConfig')) {
  throw new Error('uninstall-user.mjs is missing managed hook cleanup');
}

const governorRuntime = await readFile(repoPath('hooks', 'chedex-governor.mjs'), 'utf8');
for (const snippet of ['session-start', 'workflow-sync', 'workflow-clear', 'decision: \'block\'']) {
  if (!governorRuntime.includes(snippet)) {
    throw new Error(`governor runtime missing "${snippet}"`);
  }
}

const libContent = await readFile(repoPath('scripts', 'lib.mjs'), 'utf8');
if (!libContent.includes("return process.env.CODEX_HOME || join(homedir(), '.codex');")) {
  throw new Error('codexHome() no longer resolves to ~/.codex');
}
for (const snippet of ['chedexMinimumCodexVersion', 'mergeManagedHooksConfig', 'probeCodexHooksSupport']) {
  if (!libContent.includes(snippet)) {
    throw new Error(`lib.mjs missing ${snippet}`);
  }
}

const installedAgentsPath = repoPath('.codex', 'AGENTS.md');
if (!anyMissing([installedAgentsPath]).length) {
  const expectedAgents = await readFile(manifest.templateAgents, 'utf8');
  const installedAgents = await readFile(installedAgentsPath, 'utf8');
  if (expectedAgents !== installedAgents) {
    throw new Error('.codex/AGENTS.md is stale relative to AGENTS.template.md');
  }
}

process.stdout.write(`verify-ok roles=${Object.keys(ROLE_DEFINITIONS).length} skills=${repoSkillDirs.length}\n`);
