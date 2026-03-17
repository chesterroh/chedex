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

function runNodeScript(cwd, script, env) {
  execFileSync('node', [script], {
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
  join(freshHome, 'CHEDEX_UNINSTALL.json'),
]) {
  assert(await pathMissing(path), `fresh uninstall should remove ${path}`);
}

const dryRunRepoRoot = await mkdtemp(join(tmpdir(), 'chedex-dry-run-repo-'));
await cp(repoRoot, dryRunRepoRoot, {
  recursive: true,
  force: true,
  filter(source) {
    return !source.includes(`${join(repoRoot, '.git')}`);
  },
});

const dryRunAgentPath = join(dryRunRepoRoot, 'agents', 'architect.toml');
const dryRunAgentOriginal = await readFile(dryRunAgentPath, 'utf8');
await writeFile(dryRunAgentPath, `${dryRunAgentOriginal}\n# dry-run sentinel\n`);

const dryRunHome = await mkdtemp(join(tmpdir(), 'chedex-dry-run-home-'));
const dryRunEnv = { ...process.env, CODEX_HOME: dryRunHome };
execFileSync('node', ['scripts/install-user.mjs', '--dry-run'], {
  cwd: dryRunRepoRoot,
  env: dryRunEnv,
  stdio: 'pipe',
  encoding: 'utf8',
});

const dryRunAgentAfter = await readFile(dryRunAgentPath, 'utf8');
assert(dryRunAgentAfter.endsWith('# dry-run sentinel\n'), 'install:user:dry should not rewrite generated agent files');

await rm(dryRunRepoRoot, { recursive: true, force: true });

process.stdout.write('verify-install-ok\n');
