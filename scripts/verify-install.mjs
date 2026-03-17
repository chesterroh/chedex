import { execFileSync } from 'node:child_process';
import { cp, mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { repoRoot } from './lib.mjs';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function pathMissing(path) {
  try {
    await readFile(path, 'utf8');
    return false;
  } catch {
    return true;
  }
}

function runNodeScript(cwd, script, env, args = []) {
  execFileSync('node', [script, ...args], {
    cwd,
    env,
    stdio: 'pipe',
    encoding: 'utf8',
  });
}

function runShellCommand(command, env, input = '') {
  return execFileSync('sh', ['-lc', command], {
    cwd: repoRoot,
    env,
    input,
    stdio: 'pipe',
    encoding: 'utf8',
  });
}

async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

const installProbeHome = await mkdtemp(join(tmpdir(), 'chedex-install-verify-'));
await mkdir(join(installProbeHome, 'hooks', 'chedex'), { recursive: true });
await mkdir(join(installProbeHome, 'prompts'), { recursive: true });
await mkdir(join(installProbeHome, 'skills', 'autopilot'), { recursive: true });
await mkdir(join(installProbeHome, 'agents'), { recursive: true });
await writeFile(join(installProbeHome, 'AGENTS.md'), '# custom agents\n');
await writeFile(join(installProbeHome, 'config.toml'), '[features]\nfoo = true\n');
await writeFile(join(installProbeHome, 'hooks.json'), `${JSON.stringify({ hooks: { Stop: [{ hooks: [{ type: 'command', command: 'echo keep', statusMessage: 'keep me' }] }] } }, null, 2)}\n`);
await writeFile(join(installProbeHome, 'hooks', 'chedex', 'chedex-governor.mjs'), '# custom runtime\n');
await writeFile(join(installProbeHome, 'hooks', 'chedex', 'codex-release-audit.mjs'), '# custom release audit\n');
await writeFile(join(installProbeHome, 'prompts', 'architect.md'), '# custom prompt\n');
await writeFile(join(installProbeHome, 'skills', 'autopilot', 'SKILL.md'), '# custom skill\n');
await writeFile(join(installProbeHome, 'agents', 'architect.toml'), '# custom agent\n');

const installProbeEnv = { ...process.env, CODEX_HOME: installProbeHome };
runNodeScript(repoRoot, 'scripts/install-user.mjs', installProbeEnv);
runNodeScript(repoRoot, 'scripts/uninstall-user.mjs', installProbeEnv);

assert((await readFile(join(installProbeHome, 'AGENTS.md'), 'utf8')) === '# custom agents\n', 'uninstall should restore pre-existing AGENTS.md');
assert((await readFile(join(installProbeHome, 'config.toml'), 'utf8')) === '[features]\nfoo = true\n', 'uninstall should restore pre-existing config.toml');
assert((await readFile(join(installProbeHome, 'hooks.json'), 'utf8')).includes('echo keep'), 'uninstall should restore pre-existing hooks.json');
assert((await readFile(join(installProbeHome, 'hooks', 'chedex', 'chedex-governor.mjs'), 'utf8')) === '# custom runtime\n', 'uninstall should restore pre-existing hook runtime');
assert((await readFile(join(installProbeHome, 'hooks', 'chedex', 'codex-release-audit.mjs'), 'utf8')) === '# custom release audit\n', 'uninstall should restore pre-existing managed hook assets');
assert((await readFile(join(installProbeHome, 'prompts', 'architect.md'), 'utf8')) === '# custom prompt\n', 'uninstall should restore pre-existing managed prompts');
assert((await readFile(join(installProbeHome, 'skills', 'autopilot', 'SKILL.md'), 'utf8')) === '# custom skill\n', 'uninstall should restore pre-existing managed skills');
assert((await readFile(join(installProbeHome, 'agents', 'architect.toml'), 'utf8')) === '# custom agent\n', 'uninstall should restore pre-existing managed agent TOMLs');
assert(await pathMissing(join(installProbeHome, 'CHEDEX_UNINSTALL.json')), 'uninstall should remove uninstall state metadata');

const freshHome = await mkdtemp(join(tmpdir(), 'chedex-install-fresh-'));
const freshEnv = { ...process.env, CODEX_HOME: freshHome };
runNodeScript(repoRoot, 'scripts/install-user.mjs', freshEnv);

const installedHooksConfig = JSON.parse(await readFile(join(freshHome, 'hooks.json'), 'utf8'));
const installedSessionStartCommand = installedHooksConfig.hooks.SessionStart[0].hooks[0].command;
assert(installedSessionStartCommand.includes('session-start'), 'install should wire SessionStart to the governor session-start command');

const emptySessionStartOutput = runShellCommand(
  installedSessionStartCommand,
  { ...freshEnv, CHEDEX_DISABLE_RELEASE_AUDIT: '1' },
  `${JSON.stringify({ cwd: join(freshHome, 'workspace-empty') })}\n`,
);
assert(emptySessionStartOutput === '', 'session-start should stay quiet when no governed workflow is active');

const installedGovernorPath = join(freshHome, 'hooks', 'chedex', 'chedex-governor.mjs');
const governedCwd = join(freshHome, 'workspace-governed');
const workflowRoot = join(freshHome, 'workflows', 'ralph', 'install-smoke');
const progressPath = join(workflowRoot, 'progress.json');
await mkdir(governedCwd, { recursive: true });
await mkdir(workflowRoot, { recursive: true });
await writeFile(join(workflowRoot, 'plan.md'), '# plan\n');
await writeFile(join(workflowRoot, 'verify.md'), '# verify\n');
await writeJson(join(workflowRoot, 'handoff.json'), {
  task: 'install smoke task',
  acceptance_criteria: ['restore workflow on session start'],
  verification_targets: ['session-start'],
  delegation_roster: ['executor'],
  execution_lane: 'default',
  source_artifacts: [],
  approved_at: '2026-03-17T00:00:00Z',
});
await writeJson(progressPath, {
  schema_version: 1,
  mode: 'ralph',
  task: 'install smoke task',
  active: true,
  status: 'active',
  phase: 'execute',
  updated_at: '2026-03-17T00:00:00Z',
  workflow_root: workflowRoot,
  next_step: 'Continue implementation',
  artifacts: {
    plan: join(workflowRoot, 'plan.md'),
    verify: join(workflowRoot, 'verify.md'),
    handoff: join(workflowRoot, 'handoff.json'),
  },
  verification: {
    state: 'pending',
    evidence: [],
  },
  blocker: null,
  risks: ['Pending verification'],
});

execFileSync(process.execPath, [installedGovernorPath, 'workflow-sync', '--codex-home', freshHome, '--cwd', governedCwd, '--progress', progressPath], {
  cwd: repoRoot,
  env: freshEnv,
  stdio: 'pipe',
  encoding: 'utf8',
});

const governedSessionStartOutput = runShellCommand(
  installedSessionStartCommand,
  { ...freshEnv, CHEDEX_DISABLE_RELEASE_AUDIT: '1' },
  `${JSON.stringify({ cwd: governedCwd })}\n`,
);
assert(governedSessionStartOutput.includes('mode: ralph'), 'installed session-start hook should restore governed workflow context');
assert(governedSessionStartOutput.includes('task: install smoke task'), 'installed session-start hook should render the governed workflow summary');

runNodeScript(repoRoot, 'scripts/uninstall-user.mjs', freshEnv);

for (const path of [
  join(freshHome, 'AGENTS.md'),
  join(freshHome, 'config.toml'),
  join(freshHome, 'hooks.json'),
  join(freshHome, 'hooks', 'chedex', 'chedex-governor.mjs'),
  join(freshHome, 'hooks', 'chedex', 'codex-release-audit.mjs'),
  join(freshHome, 'CHEDEX_UNINSTALL.json'),
]) {
  assert(await pathMissing(path), `fresh uninstall should remove ${path}`);
}

const legacyStateHome = await mkdtemp(join(tmpdir(), 'chedex-install-legacy-state-'));
await mkdir(join(legacyStateHome, 'skills', 'legacy-skill'), { recursive: true });
await writeFile(join(legacyStateHome, 'skills', 'legacy-skill', 'SKILL.md'), '# legacy\n');
await writeJson(join(legacyStateHome, 'CHEDEX_UNINSTALL.json'), {
  schema_version: 1,
  existing_before: {
    config: false,
    hooksConfig: false,
    agentsMd: false,
    hookRuntime: false,
  },
  backups: {
    config: null,
    hooksConfig: null,
    agentsMd: null,
    hookRuntime: null,
  },
  managed_paths: {
    prompts: [],
    agents: [],
    skills: [
      {
        target_path: join(legacyStateHome, 'skills', 'legacy-skill'),
        backup_path: null,
        type: 'directory',
      },
    ],
    hooks: [],
  },
});
runNodeScript(repoRoot, 'scripts/uninstall-user.mjs', { ...process.env, CODEX_HOME: legacyStateHome });
assert(await pathMissing(join(legacyStateHome, 'skills', 'legacy-skill', 'SKILL.md')), 'uninstall should remove legacy managed skill paths recorded in uninstall state');

const installCheckRepoRoot = await mkdtemp(join(tmpdir(), 'chedex-install-check-repo-'));
await cp(repoRoot, installCheckRepoRoot, {
  recursive: true,
  force: true,
  filter(source) {
    return !source.includes(`${join(repoRoot, '.git')}`);
  },
});

const installCheckAgentPath = join(installCheckRepoRoot, 'agents', 'architect.toml');
const installCheckAgentOriginal = await readFile(installCheckAgentPath, 'utf8');
const dryRunHome = await mkdtemp(join(tmpdir(), 'chedex-dry-run-home-'));
const dryRunEnv = { ...process.env, CODEX_HOME: dryRunHome };
execFileSync('node', ['scripts/install-user.mjs', '--dry-run'], {
  cwd: installCheckRepoRoot,
  env: dryRunEnv,
  stdio: 'pipe',
  encoding: 'utf8',
});
const installCheckAgentAfterDryRun = await readFile(installCheckAgentPath, 'utf8');
assert(installCheckAgentAfterDryRun === installCheckAgentOriginal, 'install:user:dry should not rewrite generated agent files');

const installCheckHome = await mkdtemp(join(tmpdir(), 'chedex-install-check-home-'));
execFileSync('node', ['scripts/install-user.mjs'], {
  cwd: installCheckRepoRoot,
  env: { ...process.env, CODEX_HOME: installCheckHome },
  stdio: 'pipe',
  encoding: 'utf8',
});
const installCheckAgentAfterInstall = await readFile(installCheckAgentPath, 'utf8');
assert(installCheckAgentAfterInstall === installCheckAgentOriginal, 'install:user should not rewrite generated agent files');

const staleInstallRepoRoot = await mkdtemp(join(tmpdir(), 'chedex-stale-install-repo-'));
await cp(repoRoot, staleInstallRepoRoot, {
  recursive: true,
  force: true,
  filter(source) {
    return !source.includes(`${join(repoRoot, '.git')}`);
  },
});
const staleAgentPath = join(staleInstallRepoRoot, 'agents', 'architect.toml');
await writeFile(staleAgentPath, `${installCheckAgentOriginal}\n# stale sentinel\n`);
let staleInstallFailed = false;
try {
  execFileSync('node', ['scripts/install-user.mjs', '--dry-run'], {
    cwd: staleInstallRepoRoot,
    env: { ...process.env, CODEX_HOME: await mkdtemp(join(tmpdir(), 'chedex-stale-home-')) },
    stdio: 'pipe',
    encoding: 'utf8',
  });
} catch (error) {
  staleInstallFailed = error.stderr.includes('Run npm run generate:agents before install.')
    || error.stdout.includes('Run npm run generate:agents before install.')
    || error.message.includes('Run npm run generate:agents before install.');
}
assert(staleInstallFailed, 'install:user:dry should fail with guidance when generated agents are stale');

await rm(installCheckRepoRoot, { recursive: true, force: true });
await rm(staleInstallRepoRoot, { recursive: true, force: true });

process.stdout.write('verify-install-ok\n');
