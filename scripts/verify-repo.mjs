import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ROLE_DEFINITIONS } from '../registry/agent-definitions.mjs';
import {
  anyMissing,
  buildManagedHooksConfig,
  generatedAgentPath,
  installManifestPaths,
  listSkills,
  probeCodexHooksSupport,
  repoPath,
  roleNames,
  rolePromptPath,
} from './lib.mjs';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function listRelativeFiles(root, prefix = '') {
  const entries = await readdir(join(root, prefix), { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const relativePath = join(prefix, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listRelativeFiles(root, relativePath));
    } else if (entry.isFile()) {
      files.push(relativePath);
    }
  }

  return files.sort();
}

async function assertFileEqual(left, right, label) {
  const [leftContent, rightContent] = await Promise.all([
    readFile(left, 'utf8'),
    readFile(right, 'utf8'),
  ]);

  if (leftContent !== rightContent) {
    throw new Error(`${label} differs:\n${left}\n${right}`);
  }
}

async function assertTreeEqual(leftRoot, rightRoot, label) {
  const [leftFiles, rightFiles] = await Promise.all([
    listRelativeFiles(leftRoot),
    listRelativeFiles(rightRoot),
  ]);

  if (JSON.stringify(leftFiles) !== JSON.stringify(rightFiles)) {
    throw new Error(
      `${label} file list differs:\nleft=${leftFiles.join(', ')}\nright=${rightFiles.join(', ')}`,
    );
  }

  for (const relativePath of leftFiles) {
    await assertFileEqual(join(leftRoot, relativePath), join(rightRoot, relativePath), `${label}:${relativePath}`);
  }
}

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
  if (!agent.includes(`name = "${name}"`)) {
    throw new Error(`generated agent missing name field for ${name}`);
  }
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
  repoPath('hooks', 'codex-release-audit.mjs'),
];

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
  [repoPath('README.md'), ['codex_hooks', 'hooks.json', '_active.json', 'handoff.json', '0.115.0']],
  [repoPath('docs', 'install.md'), ['codex_hooks', 'hooks.json', '0.114.0', '0.115.0', '_codex_release_audit.json']],
  [repoPath('docs', 'governor.md'), ['workflow-sync', 'SessionStart', 'Stop', 'handoff.json', 'risks', 'release audit']],
  [repoPath('skills', 'clarify', 'SKILL.md'), ['Recommended next step', 'ralph', 'autopilot']],
  [repoPath('skills', 'execute', 'SKILL.md'), ['Escalate to `plan`', 'Escalate to `ralph`', 'Escalate to `autopilot`']],
  [repoPath('skills', 'review', 'SKILL.md'), ['Verdict: APPROVE / REVISE / REJECT', 'Findings first']],
  [repoPath('skills', 'tdd', 'SKILL.md'), ['Use this only when', 'execute` or `review`']],
  [repoPath('skills', 'plan', 'SKILL.md'), ['handoff.json', 'architect', 'verifier']],
  [repoPath('skills', 'ralph', 'SKILL.md'), ['schema_version', 'workflow_root', 'verification', 'risks']],
  [repoPath('skills', 'autopilot', 'SKILL.md'), ['handoff.json', 'architect', 'verifier', 'verification']],
  [repoPath('skills', 'ultrawork', 'SKILL.md'), ['$CODEX_HOME/workflows/ultrawork', 'verify.md', 'handoff.json']],
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

const mirrorScript = await readFile(repoPath('scripts', 'refresh-repo-mirror.mjs'), 'utf8');
for (const snippet of ['copyTree', '.codex', 'mirrorHookAssetsDir']) {
  if (!mirrorScript.includes(snippet)) {
    throw new Error(`refresh-repo-mirror.mjs missing "${snippet}"`);
  }
}

const governorRuntime = await readFile(repoPath('hooks', 'chedex-governor.mjs'), 'utf8');
for (const snippet of ['session-start', 'workflow-sync', 'workflow-clear', 'risks must be an array', 'buildReleaseAudit']) {
  if (!governorRuntime.includes(snippet)) {
    throw new Error(`governor runtime missing "${snippet}"`);
  }
}

const releaseAuditRuntime = await readFile(repoPath('hooks', 'codex-release-audit.mjs'), 'utf8');
for (const snippet of ['registry.npmjs.org', 'renderReleaseAuditAdvisory', 'KNOWN_CODEX_RELEASE_DELTAS']) {
  if (!releaseAuditRuntime.includes(snippet)) {
    throw new Error(`release audit runtime missing "${snippet}"`);
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

const mirrorRequiredPaths = [
  repoPath('.codex', 'AGENTS.md'),
  repoPath('.codex', 'prompts'),
  repoPath('.codex', 'skills'),
  repoPath('.codex', 'agents'),
  repoPath('.codex', 'hooks', 'chedex'),
];
const missingMirrorPaths = anyMissing(mirrorRequiredPaths);
if (missingMirrorPaths.length) {
  throw new Error(`.codex mirror is incomplete: ${missingMirrorPaths.join(', ')}`);
}

await assertFileEqual(manifest.templateAgents, repoPath('.codex', 'AGENTS.md'), '.codex/AGENTS.md');
await assertTreeEqual(manifest.promptsDir, repoPath('.codex', 'prompts'), '.codex/prompts');
await assertTreeEqual(manifest.skillsDir, repoPath('.codex', 'skills'), '.codex/skills');
await assertTreeEqual(manifest.agentsDir, repoPath('.codex', 'agents'), '.codex/agents');
await assertTreeEqual(manifest.hooksDir, repoPath('.codex', 'hooks', 'chedex'), '.codex/hooks/chedex');

const quotedHookCommand = buildManagedHooksConfig({
  hookRuntimePath: '/tmp/Codex Home/hooks/chedex/chedex-governor.mjs',
}).hooks.SessionStart[0].hooks[0].command;
assert(quotedHookCommand.startsWith("'"), 'managed hook commands must shell-quote the node executable');
assert(quotedHookCommand.includes("'/tmp/Codex Home/hooks/chedex/chedex-governor.mjs'"), 'managed hook commands must shell-quote governor paths');

for (const path of [repoPath('README.md'), repoPath('docs', 'customizing.md')]) {
  const content = await readFile(path, 'utf8');
  if (!content.includes('registry/agent-definitions.mjs')) {
    throw new Error(`doc surface missing registry/agent-definitions.mjs guidance: ${path}`);
  }
}

const architectAgentBeforeDryRun = await readFile(repoPath('agents', 'architect.toml'), 'utf8');
execFileSync(process.execPath, [repoPath('scripts', 'install-user.mjs'), '--dry-run'], {
  cwd: repoPath(),
  env: process.env,
  encoding: 'utf8',
});
const architectAgentAfterDryRun = await readFile(repoPath('agents', 'architect.toml'), 'utf8');
assert(architectAgentBeforeDryRun === architectAgentAfterDryRun, 'install-user --dry-run must not rewrite generated agents');

const installHomeRoot = await mkdtemp(join(tmpdir(), 'chedex verify '));
const installHome = join(installHomeRoot, 'Codex Home');
const customAgents = '# custom user agents\n';
const customHook = '#!/usr/bin/env node\nprocess.stdout.write("custom hook\\n");\n';
const siblingHookAsset = join(installHome, 'hooks', 'chedex', 'custom-helper.txt');
await mkdir(join(installHome, 'hooks', 'chedex'), { recursive: true });
await writeFile(join(installHome, 'AGENTS.md'), customAgents);
await writeFile(join(installHome, 'hooks', 'chedex', 'chedex-governor.mjs'), customHook);
await writeFile(siblingHookAsset, 'keep me\n');

const installEnv = {
  ...process.env,
  CODEX_HOME: installHome,
};

execFileSync(process.execPath, [repoPath('scripts', 'install-user.mjs')], {
  cwd: repoPath(),
  env: installEnv,
  encoding: 'utf8',
});

const installedHooksConfig = JSON.parse(await readFile(join(installHome, 'hooks.json'), 'utf8'));
const sessionStartCommand = installedHooksConfig.hooks.SessionStart[0].hooks[0].command;
assert(sessionStartCommand.includes(`'${join(installHome, 'hooks', 'chedex', 'chedex-governor.mjs')}'`), 'install-user should quote managed hook runtime paths');
assert(installedHooksConfig.hooks.SessionStart[0].matcher === '^(startup|resume)$', 'install-user should preserve the SessionStart startup/resume matcher');

execFileSync(process.execPath, [repoPath('scripts', 'uninstall-user.mjs')], {
  cwd: repoPath(),
  env: installEnv,
  encoding: 'utf8',
});

assert((await readFile(join(installHome, 'AGENTS.md'), 'utf8')) === customAgents, 'uninstall-user should restore a pre-existing AGENTS.md');
assert((await readFile(join(installHome, 'hooks', 'chedex', 'chedex-governor.mjs'), 'utf8')) === customHook, 'uninstall-user should restore a pre-existing hook runtime');
assert((await readFile(siblingHookAsset, 'utf8')) === 'keep me\n', 'uninstall-user should not remove sibling hook assets');
assert(anyMissing([join(installHome, 'config.toml')]).length === 1, 'uninstall-user should remove config.toml when install created it and no user config remains');
assert(anyMissing([join(installHome, 'hooks.json')]).length === 1, 'uninstall-user should remove hooks.json when install created it and no user hooks remain');

process.stdout.write(`verify-ok roles=${Object.keys(ROLE_DEFINITIONS).length} skills=${repoSkillDirs.length}\n`);
