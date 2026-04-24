import { execFileSync } from 'node:child_process';
import { cp, mkdtemp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { probeCodexHooksSupport, repoRoot } from './lib.mjs';

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

async function pathExists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
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
await mkdir(join(installProbeHome, 'skills', 'ralph'), { recursive: true });
await mkdir(join(installProbeHome, 'agents'), { recursive: true });
await writeFile(join(installProbeHome, 'AGENTS.md'), '# custom agents\n');
await writeFile(join(installProbeHome, 'config.toml'), '[features]\nfoo = true\n');
await writeFile(join(installProbeHome, 'hooks.json'), `${JSON.stringify({ hooks: { Stop: [{ hooks: [{ type: 'command', command: 'echo keep', statusMessage: 'keep me' }] }] } }, null, 2)}\n`);
await writeFile(join(installProbeHome, 'hooks', 'chedex', 'chedex-governor.mjs'), '# custom runtime\n');
await writeFile(join(installProbeHome, 'hooks', 'chedex', 'codex-release-audit.mjs'), '# custom release audit\n');
await mkdir(join(installProbeHome, 'hooks', 'chedex', 'nested'), { recursive: true });
await writeFile(join(installProbeHome, 'hooks', 'chedex', 'nested', 'custom-hook.txt'), '# custom nested hook asset\n');
await writeFile(join(installProbeHome, 'prompts', 'architect.md'), '# custom prompt\n');
await writeFile(join(installProbeHome, 'skills', 'ralph', 'SKILL.md'), '# custom skill\n');
await writeFile(join(installProbeHome, 'agents', 'architect.toml'), '# custom agent\n');

const installProbeEnv = { ...process.env, CODEX_HOME: installProbeHome };
runNodeScript(repoRoot, 'scripts/install-user.mjs', installProbeEnv);
runNodeScript(repoRoot, 'scripts/uninstall-user.mjs', installProbeEnv);

assert((await readFile(join(installProbeHome, 'AGENTS.md'), 'utf8')) === '# custom agents\n', 'uninstall should restore pre-existing AGENTS.md');
assert((await readFile(join(installProbeHome, 'config.toml'), 'utf8')) === '[features]\nfoo = true\n', 'uninstall should restore pre-existing config.toml');
assert((await readFile(join(installProbeHome, 'hooks.json'), 'utf8')).includes('echo keep'), 'uninstall should restore pre-existing hooks.json');
assert((await readFile(join(installProbeHome, 'hooks', 'chedex', 'chedex-governor.mjs'), 'utf8')) === '# custom runtime\n', 'uninstall should restore pre-existing hook runtime');
assert((await readFile(join(installProbeHome, 'hooks', 'chedex', 'codex-release-audit.mjs'), 'utf8')) === '# custom release audit\n', 'uninstall should restore pre-existing managed hook assets');
assert((await readFile(join(installProbeHome, 'hooks', 'chedex', 'nested', 'custom-hook.txt'), 'utf8')) === '# custom nested hook asset\n', 'uninstall should restore pre-existing nested hook assets');
assert((await readFile(join(installProbeHome, 'prompts', 'architect.md'), 'utf8')) === '# custom prompt\n', 'uninstall should restore pre-existing managed prompts');
assert((await readFile(join(installProbeHome, 'skills', 'ralph', 'SKILL.md'), 'utf8')) === '# custom skill\n', 'uninstall should restore pre-existing managed skills');
assert((await readFile(join(installProbeHome, 'agents', 'architect.toml'), 'utf8')) === '# custom agent\n', 'uninstall should restore pre-existing managed agent TOMLs');
assert(await pathMissing(join(installProbeHome, 'CHEDEX_UNINSTALL.json')), 'uninstall should remove uninstall state metadata');

const freshHome = await mkdtemp(join(tmpdir(), 'chedex-install-fresh-'));
const freshEnv = { ...process.env, CODEX_HOME: freshHome };
const hookProbe = probeCodexHooksSupport();
runNodeScript(repoRoot, 'scripts/install-user.mjs', freshEnv);

const freshUninstallState = JSON.parse(await readFile(join(freshHome, 'CHEDEX_UNINSTALL.json'), 'utf8'));
const freshSkillBackupPaths = freshUninstallState.managed_paths.skills
  .map((entry) => entry.backup_path)
  .filter(Boolean);
assert(
  freshSkillBackupPaths.every((path) => !path.startsWith(join(freshHome, 'skills'))),
  'install should keep managed skill backups outside the live skills directory',
);

const installedHooksConfig = JSON.parse(await readFile(join(freshHome, 'hooks.json'), 'utf8'));
const installedSessionStartCommand = installedHooksConfig.hooks.SessionStart[0].hooks[0].command;
const installedSessionStartStatus = installedHooksConfig.hooks.SessionStart[0].hooks[0].statusMessage;
assert(installedSessionStartCommand.includes('session-start'), 'install should wire SessionStart to the governor session-start command');
assert(installedSessionStartStatus.includes('managed:v1:SessionStart'), 'install should stamp managed SessionStart hooks with a stable marker');
if (hookProbe.supportedHookEvents.includes('UserPromptSubmit')) {
  const installedUserPromptSubmitCommand = installedHooksConfig.hooks.UserPromptSubmit[0].hooks[0].command;
  const installedUserPromptSubmitStatus = installedHooksConfig.hooks.UserPromptSubmit[0].hooks[0].statusMessage;
  assert(installedUserPromptSubmitCommand.includes('user-prompt-submit'), 'install should wire UserPromptSubmit to the governor prompt-submit command');
  assert(installedUserPromptSubmitStatus.includes('managed:v1:UserPromptSubmit'), 'install should stamp managed UserPromptSubmit hooks with a stable marker');
  const promptSubmitOutput = runShellCommand(
    installedUserPromptSubmitCommand,
    freshEnv,
    `${JSON.stringify({ cwd: join(freshHome, 'workspace-empty'), prompt: 'smoke test' })}\n`,
  );
  assert(promptSubmitOutput === '', 'user-prompt-submit should stay quiet when no governed workflow is active');
}

const emptySessionStartOutput = runShellCommand(
  installedSessionStartCommand,
  { ...freshEnv, CHEDEX_DISABLE_RELEASE_AUDIT: '1' },
  `${JSON.stringify({ cwd: join(freshHome, 'workspace-empty') })}\n`,
);
assert(emptySessionStartOutput === '', 'session-start should stay quiet when no governed workflow is active');
const emptyClearSessionStartOutput = runShellCommand(
  installedSessionStartCommand,
  { ...freshEnv, CHEDEX_DISABLE_RELEASE_AUDIT: '1' },
  `${JSON.stringify({ cwd: join(freshHome, 'workspace-empty'), source: 'clear' })}\n`,
);
assert(emptyClearSessionStartOutput === '', 'session-start clear should stay quiet when no governed workflow is active');

const duplicateInlineHome = await mkdtemp(join(tmpdir(), 'chedex-install-inline-duplicate-'));
await writeFile(join(duplicateInlineHome, 'config.toml'), [
  '[features]',
  'multi_agent = true',
  '',
  '[[hooks.SessionStart]]',
  'matcher = "^(startup|resume|clear)$"',
  '[[hooks.SessionStart.hooks]]',
  'type = "command"',
  'command = "node /tmp/chedex-governor.mjs session-start"',
  'statusMessage = "Chedex governor: managed:v1:SessionStart restore governed workflow context"',
  '',
].join('\n'));
let duplicateInlineFailed = false;
try {
  runNodeScript(repoRoot, 'scripts/install-user.mjs', { ...process.env, CODEX_HOME: duplicateInlineHome });
} catch (error) {
  duplicateInlineFailed = error.stderr.includes('managed hook duplicate')
    || error.stdout.includes('managed hook duplicate')
    || error.message.includes('managed hook duplicate');
}
assert(duplicateInlineFailed, 'install should fail when inline config.toml already defines the same managed lifecycle hook');

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
  approvals: [
    {
      role: 'architect',
      verdict: 'approved',
      evidence_ref: 'architect: install-smoke grounded',
      approved_at: '2026-03-17T00:00:00Z',
    },
    {
      role: 'verifier',
      verdict: 'approved',
      evidence_ref: 'verifier: install-smoke admission',
      approved_at: '2026-03-17T00:00:00Z',
    },
  ],
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
const governedClearSessionStartOutput = runShellCommand(
  installedSessionStartCommand,
  { ...freshEnv, CHEDEX_DISABLE_RELEASE_AUDIT: '1' },
  `${JSON.stringify({ cwd: governedCwd, source: 'clear' })}\n`,
);
assert(governedClearSessionStartOutput.includes('kept governed workflow protection after chat clear'), 'installed session-start hook should handle clear with a soft-clear notice');
assert(governedClearSessionStartOutput.includes('mode: ralph'), 'installed session-start clear should still identify the governed workflow');
assert(!governedClearSessionStartOutput.includes('artifacts:'), 'installed session-start clear should avoid the full restore artifact block');
if (hookProbe.supportedHookEvents.includes('UserPromptSubmit')) {
  const installedUserPromptSubmitCommand = installedHooksConfig.hooks.UserPromptSubmit[0].hooks[0].command;
  const governedPromptOutput = runShellCommand(
    installedUserPromptSubmitCommand,
    freshEnv,
    `${JSON.stringify({ cwd: governedCwd, prompt: 'continue' })}\n`,
  );
  assert(governedPromptOutput === '', 'user-prompt-submit should stay quiet when governed state is valid');
}

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

const hookOwnershipHome = await mkdtemp(join(tmpdir(), 'chedex-install-hook-ownership-'));
await writeFile(join(hookOwnershipHome, 'hooks.json'), `${JSON.stringify({
  hooks: {
    Stop: [
      {
        hooks: [
          {
            type: 'command',
            command: 'echo custom-user-hook',
            statusMessage: 'Chedex governor: my custom local guard',
          },
        ],
      },
    ],
  },
}, null, 2)}\n`);
const hookOwnershipEnv = { ...process.env, CODEX_HOME: hookOwnershipHome };
runNodeScript(repoRoot, 'scripts/install-user.mjs', hookOwnershipEnv);
const hookOwnershipConfig = JSON.parse(await readFile(join(hookOwnershipHome, 'hooks.json'), 'utf8'));
const hookOwnershipStopCommands = hookOwnershipConfig.hooks.Stop.flatMap((group) => group.hooks.map((hook) => hook.command));
assert(hookOwnershipStopCommands.includes('echo custom-user-hook'), 'install should preserve user hooks that only share the Chedex statusMessage prefix');
assert(hookOwnershipStopCommands.some((command) => command.includes('chedex-governor.mjs') && command.includes(' stop')), 'install should still add the managed stop hook');
runNodeScript(repoRoot, 'scripts/uninstall-user.mjs', hookOwnershipEnv);

const failedInstallHome = await mkdtemp(join(tmpdir(), 'chedex-install-failure-rollback-'));
await mkdir(join(failedInstallHome, 'CHEDEX_UNINSTALL.md'), { recursive: true });
let failedInstallDetected = false;
try {
  runNodeScript(repoRoot, 'scripts/install-user.mjs', { ...process.env, CODEX_HOME: failedInstallHome });
} catch (error) {
  failedInstallDetected = error.stderr.includes('CHEDEX_UNINSTALL.md')
    || error.stdout.includes('CHEDEX_UNINSTALL.md')
    || error.message.includes('CHEDEX_UNINSTALL.md');
}
assert(failedInstallDetected, 'install should surface a late uninstall-note write failure');
assert(!(await pathMissing(join(failedInstallHome, 'CHEDEX_UNINSTALL.json'))), 'failed install should persist CHEDEX_UNINSTALL.json for rollback');
assert(!(await pathMissing(join(failedInstallHome, 'AGENTS.md'))), 'failed install should have reached managed writes before the forced late failure');
runNodeScript(repoRoot, 'scripts/uninstall-user.mjs', { ...process.env, CODEX_HOME: failedInstallHome });
for (const path of [
  join(failedInstallHome, 'AGENTS.md'),
  join(failedInstallHome, 'config.toml'),
  join(failedInstallHome, 'hooks.json'),
  join(failedInstallHome, 'hooks', 'chedex', 'chedex-governor.mjs'),
  join(failedInstallHome, 'hooks', 'chedex', 'codex-release-audit.mjs'),
  join(failedInstallHome, 'CHEDEX_UNINSTALL.json'),
  join(failedInstallHome, 'CHEDEX_UNINSTALL.md'),
]) {
  assert(await pathMissing(path), `rollback after failed install should remove ${path}`);
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

const failingInstallHome = await mkdtemp(join(tmpdir(), 'chedex-install-failing-'));
await mkdir(join(failingInstallHome, 'prompts', 'explore.md'), { recursive: true });
runNodeScript(repoRoot, 'scripts/install-user.mjs', { ...process.env, CODEX_HOME: failingInstallHome });
assert(!(await pathMissing(join(failingInstallHome, 'CHEDEX_UNINSTALL.json'))), 'install should still persist uninstall state metadata before replacing a managed path conflict');
runNodeScript(repoRoot, 'scripts/uninstall-user.mjs', { ...process.env, CODEX_HOME: failingInstallHome });
assert(await pathMissing(join(failingInstallHome, 'AGENTS.md')), 'uninstall should remove AGENTS.md written during managed-path conflict replacement');
assert(await pathExists(join(failingInstallHome, 'prompts', 'explore.md')), 'uninstall should restore pre-existing managed path conflicts after a successful install');
assert(await pathMissing(join(failingInstallHome, 'CHEDEX_UNINSTALL.json')), 'uninstall should clear uninstall state after restoring a managed path conflict');

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

const reinstallDriftHome = await mkdtemp(join(tmpdir(), 'chedex-install-reinstall-drift-'));
const reinstallDriftEnv = { ...process.env, CODEX_HOME: reinstallDriftHome };
runNodeScript(repoRoot, 'scripts/install-user.mjs', reinstallDriftEnv);
await writeFile(join(reinstallDriftHome, 'skills', 'ralph', 'STALE.md'), '# stale managed file\n');
await mkdir(join(reinstallDriftHome, 'hooks', 'chedex', 'nested'), { recursive: true });
await writeFile(join(reinstallDriftHome, 'hooks', 'chedex', 'nested', 'STALE.md'), '# stale managed hook file\n');
runNodeScript(repoRoot, 'scripts/install-user.mjs', reinstallDriftEnv);
assert(
  await pathMissing(join(reinstallDriftHome, 'skills', 'ralph', 'STALE.md')),
  'reinstall should remove stale files inside managed skill directories',
);
assert(
  await pathMissing(join(reinstallDriftHome, 'hooks', 'chedex', 'nested', 'STALE.md')),
  'reinstall should remove stale files inside the managed hook asset directory',
);
runNodeScript(repoRoot, 'scripts/uninstall-user.mjs', reinstallDriftEnv);

await rm(installCheckRepoRoot, { recursive: true, force: true });
await rm(staleInstallRepoRoot, { recursive: true, force: true });

process.stdout.write('verify-install-ok\n');
