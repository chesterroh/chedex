import { mkdtemp, mkdir, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import {
  GOVERNOR_SCHEMA_VERSION,
  activeIndexPath,
  clearWorkflow,
  sessionStartHook,
  stopHook,
  syncWorkflow,
} from '../hooks/chedex-governor.mjs';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

async function makeWorkflow({ home, slug, mode = 'ralph', status = 'active', phase = 'execute', verificationState = 'pending', evidence = [], nextStep = 'Continue implementation', blocker = null }) {
  const workflowRoot = join(home, 'workflows', mode, slug);
  await mkdir(workflowRoot, { recursive: true });
  const progressPath = join(workflowRoot, 'progress.json');
  const verifyPath = join(workflowRoot, 'verify.md');
  const handoffPath = join(workflowRoot, 'handoff.json');

  await writeFile(verifyPath, '# verify\n');
  await writeJson(handoffPath, {
    task: `${slug} task`,
    acceptance_criteria: ['done'],
    verification_targets: ['npm run verify'],
    delegation_roster: ['executor', 'verifier'],
    execution_lane: 'default',
    source_artifacts: [],
    approved_at: '2026-03-16T00:00:00Z',
  });

  const progress = {
    schema_version: GOVERNOR_SCHEMA_VERSION,
    mode,
    task: `${slug} task`,
    active: status === 'active',
    status,
    phase,
    updated_at: '2026-03-16T00:00:00Z',
    workflow_root: workflowRoot,
    next_step: nextStep,
    artifacts: {
      plan: join(workflowRoot, 'plan.md'),
      handoff: handoffPath,
      verify: verifyPath,
    },
    verification: {
      state: verificationState,
      evidence,
    },
    blocker,
  };

  await writeJson(progressPath, progress);
  await writeFile(join(workflowRoot, 'plan.md'), '# plan\n');

  return {
    workflowRoot,
    progressPath,
  };
}

const home = await mkdtemp(join(tmpdir(), 'chedex-governor-'));
const cwd = join(home, 'workspace');
await mkdir(cwd, { recursive: true });

const activeWorkflow = await makeWorkflow({
  home,
  slug: 'active-run',
});

await syncWorkflow({
  codexHome: home,
  cwd,
  progressPath: activeWorkflow.progressPath,
});

const sessionContext = await sessionStartHook({
  codexHome: home,
  cwd,
});
assert(sessionContext.includes('Chedex governor restored a governed workflow'), 'session-start did not inject governed context');

const activeStop = await stopHook({
  codexHome: home,
  cwd,
});
assert(activeStop.action === 'block', 'active workflow stop should block');

const completedWorkflow = await makeWorkflow({
  home,
  slug: 'completed-missing-proof',
  status: 'active',
  phase: 'execute',
});

await syncWorkflow({
  codexHome: home,
  cwd,
  progressPath: completedWorkflow.progressPath,
});

await writeJson(completedWorkflow.progressPath, {
  schema_version: GOVERNOR_SCHEMA_VERSION,
  mode: 'ralph',
  task: 'completed-missing-proof task',
  active: false,
  status: 'completed',
  phase: 'validate',
  updated_at: '2026-03-16T00:00:00Z',
  workflow_root: completedWorkflow.workflowRoot,
  next_step: 'Report results',
  artifacts: {
    plan: join(completedWorkflow.workflowRoot, 'plan.md'),
    handoff: join(completedWorkflow.workflowRoot, 'handoff.json'),
    verify: join(completedWorkflow.workflowRoot, 'verify.md'),
  },
  verification: {
    state: 'pending',
    evidence: [],
  },
  blocker: null,
});

const completedBlocked = await stopHook({
  codexHome: home,
  cwd,
});
assert(completedBlocked.action === 'block', 'completed workflow without satisfied verification should block');

const completedValid = await makeWorkflow({
  home,
  slug: 'completed-verified',
  status: 'completed',
  phase: 'validate',
  verificationState: 'satisfied',
  evidence: ['npm run verify'],
  nextStep: 'Report results',
});

await syncWorkflow({
  codexHome: home,
  cwd,
  progressPath: completedValid.progressPath,
});

const completedAllowed = await stopHook({
  codexHome: home,
  cwd,
});
assert(completedAllowed.action === 'allow', 'completed workflow with satisfied verification should allow stop');

const indexAfterCompleted = JSON.parse(await readFile(activeIndexPath(home), 'utf8'));
assert(!(cwd in indexAfterCompleted.entries), 'completed workflow should be cleared from the active index');

const pausedWorkflow = await makeWorkflow({
  home,
  slug: 'paused-resume',
  status: 'paused',
  phase: 'execute',
  verificationState: 'pending',
  evidence: [],
  nextStep: 'Resume after dependency lands',
});

await syncWorkflow({
  codexHome: home,
  cwd,
  progressPath: pausedWorkflow.progressPath,
});

const pausedAllowed = await stopHook({
  codexHome: home,
  cwd,
});
assert(pausedAllowed.action === 'allow', 'paused workflow with next_step should allow stop');

const resumedContext = await sessionStartHook({
  codexHome: home,
  cwd,
});
assert(resumedContext.includes('status: paused'), 'paused workflow should still rehydrate on session start');

const cleared = await clearWorkflow({
  codexHome: home,
  cwd,
});
assert(cleared, 'workflow-clear should remove the indexed workflow');

process.stdout.write('verify-governor-ok\n');
