import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { installManifestPaths, listRelativeFiles, listSkills, repoPath, roleNames } from './lib.mjs';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function exists(path) {
  try { await readFile(path); return true; } catch { return false; }
}

async function assertTreeEqual(leftRoot, rightRoot, label) {
  const [leftFiles, rightFiles] = await Promise.all([listRelativeFiles(leftRoot), listRelativeFiles(rightRoot)]);
  assert(JSON.stringify(leftFiles) === JSON.stringify(rightFiles), `${label} file lists differ`);
  for (const relativePath of leftFiles) {
    const [left, right] = await Promise.all([
      readFile(join(leftRoot, relativePath), 'utf8'),
      readFile(join(rightRoot, relativePath), 'utf8'),
    ]);
    assert(left === right, `${label} differs at ${relativePath}`);
  }
}

const root = await mkdtemp(join(tmpdir(), 'chedex-install-'));
const codexHome = join(root, 'codex-home');
const agentsHome = join(root, 'agents-home');
const agentsDir = join(codexHome, 'agents');
const skillsDir = join(agentsHome, 'skills');
const hooksDir = join(codexHome, 'hooks', 'chedex');
await mkdir(agentsDir, { recursive: true });
await mkdir(skillsDir, { recursive: true });
await mkdir(hooksDir, { recursive: true });

const customAgents = '# Personal instructions\n\nKeep this line.\n';
const customAgent = 'name = "architect"\ndescription = "custom"\ndeveloper_instructions = "custom"\n';
const customSkill = 'custom skill contents\n';
const customConfig = [
  'model = "gpt-5.6-sol"',
  '',
  '[features]',
  'goals = true',
  'foo = true',
  '',
  '# BEGIN CHEDEX NATIVE AGENTS',
  '[agents.explore]',
  'config_file = "/old/chedex/explore.toml"',
  '# END CHEDEX NATIVE AGENTS',
  '',
].join('\n');
const customHooks = {
  hooks: {
    SessionStart: [
      { matcher: 'startup', hooks: [{ type: 'command', command: 'node /old/hooks/chedex/chedex-governor.mjs', statusMessage: 'Chedex governor: old' }] },
      { matcher: 'startup', hooks: [{ type: 'command', command: 'echo custom', statusMessage: 'custom' }] },
    ],
  },
};

await writeFile(join(codexHome, 'AGENTS.md'), customAgents);
await writeFile(join(agentsDir, 'architect.toml'), customAgent);
await mkdir(join(skillsDir, 'cdx-plan'), { recursive: true });
await writeFile(join(skillsDir, 'cdx-plan', 'SKILL.md'), customSkill);
await writeFile(join(codexHome, 'config.toml'), customConfig);
await writeFile(join(codexHome, 'hooks.json'), `${JSON.stringify(customHooks, null, 2)}\n`);
await writeFile(join(hooksDir, 'chedex-governor.mjs'), 'legacy runtime\n');
await writeFile(join(hooksDir, 'custom-helper.txt'), 'keep me\n');

const env = { ...process.env, CODEX_HOME: codexHome, CHEDEX_AGENTS_HOME: agentsHome };
const dryOutput = execFileSync(process.execPath, [repoPath('scripts', 'install-user.mjs'), '--dry-run'], { env, encoding: 'utf8' });
assert(dryOutput.includes('runtime_hooks=none'), 'dry run should declare no runtime hooks');
assert((await readFile(join(agentsDir, 'architect.toml'), 'utf8')) === customAgent, 'dry run changed an agent');

const installOutput = execFileSync(process.execPath, [repoPath('scripts', 'install-user.mjs')], { env, encoding: 'utf8' });
assert(installOutput.includes(`skills=${listSkills().length}`), 'install summary has wrong skill count');
assert(installOutput.includes('feature_flags=none'), 'install should declare no feature flags');

const manifest = installManifestPaths();
await assertTreeEqual(manifest.agentsDir, agentsDir, 'installed agents');
for (const skill of listSkills()) {
  await assertTreeEqual(join(manifest.skillsDir, skill), join(skillsDir, skill), `installed skill ${skill}`);
}

const installedAgentsMd = await readFile(join(codexHome, 'AGENTS.md'), 'utf8');
assert(installedAgentsMd.includes(customAgents.trim()), 'install should preserve user AGENTS content');
assert((installedAgentsMd.match(/BEGIN CHEDEX NATIVE/g) || []).length === 1, 'install should add one managed AGENTS block');
assert(!installedAgentsMd.includes('progress.json'), 'installed AGENTS should not require custom workflow state');

const installedConfig = await readFile(join(codexHome, 'config.toml'), 'utf8');
assert(!installedConfig.includes('BEGIN CHEDEX NATIVE AGENTS'), 'install should remove legacy agent config blocks');
assert(installedConfig.includes('goals = true'), 'install must preserve user-owned feature flags without legacy state');
assert(installedConfig.includes('foo = true'), 'install must preserve unrelated config');
assert(!installedConfig.includes('[agents.explore]'), 'standalone native agents should not need config entries');

const installedHooks = JSON.parse(await readFile(join(codexHome, 'hooks.json'), 'utf8'));
const hookText = JSON.stringify(installedHooks);
assert(!hookText.includes('chedex-governor'), 'install should remove legacy Chedex hook wiring');
assert(hookText.includes('echo custom'), 'install should preserve unrelated hooks');
assert(!(await exists(join(hooksDir, 'chedex-governor.mjs'))), 'install should remove legacy hook runtime');
assert((await readFile(join(hooksDir, 'custom-helper.txt'), 'utf8')) === 'keep me\n', 'install should preserve sibling hook files');
assert(!(await exists(join(codexHome, 'prompts', 'architect.md'))), 'install should not install role prompts');
assert(!(await exists(join(codexHome, 'workflows', '_active.json'))), 'install should not create workflow state');

const state = JSON.parse(await readFile(join(codexHome, 'CHEDEX_UNINSTALL.json'), 'utf8'));
assert(state.schema_version === 2, 'install should write schema v2 rollback state');
assert(state.managed_paths.agents.length === roleNames().length, 'rollback state should track every agent');
assert(state.managed_paths.skills.length === listSkills().length, 'rollback state should track every skill');

execFileSync(process.execPath, [repoPath('scripts', 'uninstall-user.mjs')], { env, encoding: 'utf8' });
assert((await readFile(join(agentsDir, 'architect.toml'), 'utf8')) === customAgent, 'uninstall should restore a conflicting agent');
assert((await readFile(join(skillsDir, 'cdx-plan', 'SKILL.md'), 'utf8')) === customSkill, 'uninstall should restore a conflicting skill');
assert(!(await exists(join(agentsDir, 'executor.toml'))), 'uninstall should remove install-created agents');
assert(!(await exists(join(skillsDir, 'cdx-analyze', 'SKILL.md'))), 'uninstall should remove install-created skills');
assert((await readFile(join(codexHome, 'AGENTS.md'), 'utf8')) === customAgents, 'uninstall should remove only the managed AGENTS block');
assert(!(await exists(join(codexHome, 'CHEDEX_UNINSTALL.json'))), 'uninstall should remove rollback state');
assert(!(await exists(join(codexHome, 'CHEDEX_UNINSTALL.md'))), 'uninstall should remove uninstall note');

// Upgrade coverage for the retired 0.130 prompt/hook topology.
const legacyRoot = await mkdtemp(join(tmpdir(), 'chedex-legacy-install-'));
const legacyCodexHome = join(legacyRoot, 'codex-home');
const legacyAgentsHome = join(legacyRoot, 'agents-home');
const legacyPrompt = join(legacyCodexHome, 'prompts', 'architect.md');
const legacyHookDir = join(legacyCodexHome, 'hooks', 'chedex');
const legacyBackupRoot = join(legacyCodexHome, '.chedex-backups', 'old');
const promptBackup = join(legacyBackupRoot, 'prompts', 'architect.md');
const hookBackup = join(legacyBackupRoot, 'hooks', 'chedex');
const agentsBackup = join(legacyBackupRoot, 'AGENTS.md');
for (const path of [dirname(legacyPrompt), legacyHookDir, dirname(promptBackup), hookBackup]) {
  await mkdir(path, { recursive: true });
}
await writeFile(legacyPrompt, 'old Chedex prompt\n');
await writeFile(promptBackup, 'pre-Chedex custom prompt\n');
await writeFile(join(legacyHookDir, 'chedex-governor.mjs'), 'old Chedex runtime\n');
await writeFile(join(hookBackup, 'chedex-governor.mjs'), 'pre-Chedex same-name hook\n');
await writeFile(agentsBackup, '# Pre-Chedex AGENTS\n');
await writeFile(join(legacyCodexHome, 'AGENTS.md'), '# Old installed Chedex AGENTS\n');
await writeFile(join(legacyCodexHome, 'config.toml'), '[features]\ngoals = true\nfoo = true\n\n# BEGIN CHEDEX NATIVE AGENTS\n[agents.explore]\nconfig_file = "/old"\n# END CHEDEX NATIVE AGENTS\n');
await writeFile(join(legacyCodexHome, 'hooks.json'), `${JSON.stringify(customHooks, null, 2)}\n`);
await writeFile(join(legacyCodexHome, 'CHEDEX_UNINSTALL.json'), `${JSON.stringify({
  schema_version: 1,
  existing_before: { agentsMd: true },
  backups: { agentsMd: agentsBackup },
  managed_paths: {
    prompts: [{ target_path: legacyPrompt, backup_path: promptBackup, type: 'file' }],
    hooks: [{ target_path: legacyHookDir, backup_path: hookBackup, type: 'directory' }],
    agents: [],
    skills: [],
  },
}, null, 2)}\n`);

const legacyEnv = { ...process.env, CODEX_HOME: legacyCodexHome, CHEDEX_AGENTS_HOME: legacyAgentsHome };
execFileSync(process.execPath, [repoPath('scripts', 'install-user.mjs')], { env: legacyEnv, encoding: 'utf8' });
assert((await readFile(legacyPrompt, 'utf8')) === 'pre-Chedex custom prompt\n', 'upgrade should restore retired prompt conflicts');
assert((await readFile(join(legacyHookDir, 'chedex-governor.mjs'), 'utf8')) === 'pre-Chedex same-name hook\n', 'upgrade should preserve a backed-up same-name hook');
const migratedAgents = await readFile(join(legacyCodexHome, 'AGENTS.md'), 'utf8');
assert(migratedAgents.includes('# Pre-Chedex AGENTS'), 'upgrade should restore the pre-Chedex AGENTS base');
assert(migratedAgents.includes('BEGIN CHEDEX NATIVE'), 'upgrade should add the new managed guidance block');
const migratedConfig = await readFile(join(legacyCodexHome, 'config.toml'), 'utf8');
assert(!migratedConfig.includes('goals = true'), 'upgrade with legacy state should remove the old managed goals flag');
assert(migratedConfig.includes('foo = true'), 'upgrade should preserve unrelated feature flags');
assert(!migratedConfig.includes('BEGIN CHEDEX NATIVE AGENTS'), 'upgrade should remove the old agent config block');

// Upgrade coverage for custom agents retired in favor of Codex built-ins.
const retiredRoot = await mkdtemp(join(tmpdir(), 'chedex-retired-agent-install-'));
const retiredCodexHome = join(retiredRoot, 'codex-home');
const retiredAgentsHome = join(retiredRoot, 'agents-home');
const retiredAgentsDir = join(retiredCodexHome, 'agents');
const retiredBackupRoot = join(retiredCodexHome, '.chedex-backups', 'old', 'agents');
const retiredExplore = join(retiredAgentsDir, 'explore.toml');
const retiredExecutor = join(retiredAgentsDir, 'executor.toml');
const retiredExecutorBackup = join(retiredBackupRoot, 'executor.toml');
await mkdir(retiredAgentsDir, { recursive: true });
await mkdir(retiredBackupRoot, { recursive: true });
await writeFile(retiredExplore, 'name = "explore"\n# installed by old Chedex\n');
await writeFile(retiredExecutor, 'name = "executor"\n# installed by old Chedex\n');
await writeFile(retiredExecutorBackup, 'name = "executor"\n# pre-Chedex custom agent\n');
await writeFile(join(retiredCodexHome, 'CHEDEX_UNINSTALL.json'), `${JSON.stringify({
  schema_version: 2,
  managed_paths: {
    agents: [
      { target_path: retiredExplore, backup_path: null, type: null },
      { target_path: retiredExecutor, backup_path: retiredExecutorBackup, type: 'file' },
    ],
    skills: [],
  },
}, null, 2)}\n`);

const retiredEnv = { ...process.env, CODEX_HOME: retiredCodexHome, CHEDEX_AGENTS_HOME: retiredAgentsHome };
execFileSync(process.execPath, [repoPath('scripts', 'install-user.mjs')], { env: retiredEnv, encoding: 'utf8' });
assert(!(await exists(retiredExplore)), 'upgrade should remove an install-created retired explore agent');
assert(
  (await readFile(retiredExecutor, 'utf8')) === 'name = "executor"\n# pre-Chedex custom agent\n',
  'upgrade should restore a pre-Chedex agent hidden by the retired executor role',
);
const retiredState = JSON.parse(await readFile(join(retiredCodexHome, 'CHEDEX_UNINSTALL.json'), 'utf8'));
assert(retiredState.managed_paths.agents.length === roleNames().length, 'retired agents should leave rollback state');

process.stdout.write(`verify-install-ok roles=${roleNames().length} skills=${listSkills().length}\n`);
