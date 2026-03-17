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
import {
  buildReleaseAudit,
  releaseAuditCachePath,
} from '../hooks/codex-release-audit.mjs';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

async function makeWorkflow({
  home,
  slug,
  mode = 'ralph',
  status = 'active',
  phase = 'execute',
  verificationState = 'pending',
  evidence = [],
  nextStep = 'Continue implementation',
  blocker = null,
  risks = ['Pending verification'],
  includeHandoff = true,
}) {
  const workflowRoot = join(home, 'workflows', mode, slug);
  await mkdir(workflowRoot, { recursive: true });
  const progressPath = join(workflowRoot, 'progress.json');
  const verifyPath = join(workflowRoot, 'verify.md');
  const handoffPath = includeHandoff ? join(workflowRoot, 'handoff.json') : null;

  await writeFile(verifyPath, '# verify\n');
  if (handoffPath) {
    await writeJson(handoffPath, {
      task: `${slug} task`,
      acceptance_criteria: ['done'],
      verification_targets: ['npm run verify'],
      delegation_roster: ['executor', 'verifier'],
      execution_lane: 'default',
      source_artifacts: [],
      approved_at: '2026-03-16T00:00:00Z',
    });
  }

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
      verify: verifyPath,
    },
    verification: {
      state: verificationState,
      evidence,
    },
    blocker,
    risks,
  };

  if (handoffPath) {
    progress.artifacts.handoff = handoffPath;
  }

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

for (const mode of ['ralph', 'autopilot', 'ultrawork']) {
  const activeWorkflow = await makeWorkflow({
    home,
    slug: `${mode}-active-run`,
    mode,
    includeHandoff: mode !== 'ultrawork',
  });

  await syncWorkflow({
    codexHome: home,
    cwd,
    progressPath: activeWorkflow.progressPath,
  });

  const sessionContext = await sessionStartHook({
    codexHome: home,
    cwd,
    releaseAudit: {
      disabled: true,
    },
  });
  assert(sessionContext.includes(`mode: ${mode}`), `session-start did not inject governed context for ${mode}`);

  const activeStop = await stopHook({
    codexHome: home,
    cwd,
  });
  assert(activeStop.action === 'block', `active workflow stop should block for ${mode}`);

  const index = JSON.parse(await readFile(activeIndexPath(home), 'utf8'));
  const entry = index.entries[cwd];
  assert(entry.mode === mode, `active index mode mismatch for ${mode}`);
  if (mode === 'ultrawork') {
    assert(entry.handoff_path === null, 'top-level ultrawork should not require a handoff path');
  } else {
    assert(typeof entry.handoff_path === 'string' && entry.handoff_path.endsWith('handoff.json'), `expected handoff path for ${mode}`);
  }
}

for (const mode of ['ralph', 'autopilot']) {
  const missingHandoffWorkflow = await makeWorkflow({
    home,
    slug: `${mode}-missing-handoff`,
    mode,
    includeHandoff: false,
  });

  let missingHandoffFailed = false;
  try {
    await syncWorkflow({
      codexHome: home,
      cwd,
      progressPath: missingHandoffWorkflow.progressPath,
    });
  } catch (error) {
    missingHandoffFailed = error.message.includes(`${mode} workflows require artifacts.handoff`);
  }
  assert(missingHandoffFailed, `${mode} should require a handoff artifact`);
}

const completedWorkflow = await makeWorkflow({
  home,
  slug: 'completed-missing-proof',
  mode: 'autopilot',
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
  mode: 'autopilot',
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
  risks: ['Need independent validation'],
});

const completedBlocked = await stopHook({
  codexHome: home,
  cwd,
});
assert(completedBlocked.action === 'block', 'completed workflow without satisfied verification should block');

const completedValid = await makeWorkflow({
  home,
  slug: 'completed-verified',
  mode: 'ultrawork',
  status: 'completed',
  phase: 'validate',
  verificationState: 'satisfied',
  evidence: ['npm run verify'],
  nextStep: 'Report results',
  risks: [],
  includeHandoff: false,
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
  mode: 'ralph',
  status: 'paused',
  phase: 'execute',
  verificationState: 'pending',
  evidence: [],
  nextStep: 'Resume after dependency lands',
  risks: ['Waiting on dependency'],
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
  releaseAudit: {
    disabled: true,
  },
});
assert(resumedContext.includes('status: paused'), 'paused workflow should still rehydrate on session start');

const cleared = await clearWorkflow({
  codexHome: home,
  cwd,
});
assert(cleared, 'workflow-clear should remove the indexed workflow');

const invalidResumeWorkflow = await makeWorkflow({
  home,
  slug: 'invalid-resume',
  mode: 'autopilot',
});
await syncWorkflow({
  codexHome: home,
  cwd,
  progressPath: invalidResumeWorkflow.progressPath,
});
const invalidResumeProgress = JSON.parse(await readFile(invalidResumeWorkflow.progressPath, 'utf8'));
delete invalidResumeProgress.risks;
await writeJson(invalidResumeWorkflow.progressPath, invalidResumeProgress);

const invalidResumeContext = await sessionStartHook({
  codexHome: home,
  cwd,
  releaseAudit: {
    disabled: true,
  },
});
assert(invalidResumeContext === '', 'invalid workflow should not rehydrate on session start');

const indexAfterInvalidResume = JSON.parse(await readFile(activeIndexPath(home), 'utf8'));
assert(!(cwd in indexAfterInvalidResume.entries), 'invalid resumed workflow should be pruned from the active index');

const invalidMissingPhase = await makeWorkflow({
  home,
  slug: 'invalid-missing-phase',
});
const invalidMissingPhaseProgress = JSON.parse(await readFile(invalidMissingPhase.progressPath, 'utf8'));
delete invalidMissingPhaseProgress.phase;
await writeJson(invalidMissingPhase.progressPath, invalidMissingPhaseProgress);
let missingPhaseFailed = false;
try {
  await syncWorkflow({
    codexHome: home,
    cwd,
    progressPath: invalidMissingPhase.progressPath,
  });
} catch (error) {
  missingPhaseFailed = error.message.includes('missing field: phase');
}
assert(missingPhaseFailed, 'missing phase should fail governed validation');

const invalidMissingRisks = await makeWorkflow({
  home,
  slug: 'invalid-missing-risks',
});
const invalidMissingRisksProgress = JSON.parse(await readFile(invalidMissingRisks.progressPath, 'utf8'));
delete invalidMissingRisksProgress.risks;
await writeJson(invalidMissingRisks.progressPath, invalidMissingRisksProgress);
let missingRisksFailed = false;
try {
  await syncWorkflow({
    codexHome: home,
    cwd,
    progressPath: invalidMissingRisks.progressPath,
  });
} catch (error) {
  missingRisksFailed = error.message.includes('missing field: risks');
}
assert(missingRisksFailed, 'missing risks should fail governed validation');

const currentReleaseAudit = await buildReleaseAudit({
  codexHome: home,
  readInstalledVersion() {
    return {
      raw: 'codex-cli 0.115.0',
      normalized: '0.115.0',
      semver: [0, 115, 0],
    };
  },
  async getLatestReleaseInfo() {
    return {
      latest_version: '0.115.0',
      published_at: '2026-03-16T00:00:00Z',
      checked_at: '2026-03-17T00:00:00Z',
      source: 'npm-registry',
    };
  },
});
assert(currentReleaseAudit.state === 'current', 'matching installed/latest versions should report current');

const releaseAuditOnlyContext = await sessionStartHook({
  codexHome: home,
  cwd: join(home, 'release-audit-only'),
  releaseAudit: {
    readInstalledVersion() {
      return {
        raw: 'codex-cli 0.114.0',
        normalized: '0.114.0',
        semver: [0, 114, 0],
      };
    },
    async getLatestReleaseInfo() {
      return {
        latest_version: '0.115.0',
        published_at: '2026-03-16T00:00:00Z',
        checked_at: '2026-03-17T00:00:00Z',
        source: 'npm-registry',
      };
    },
  },
});
assert(releaseAuditOnlyContext.includes('Chedex release audit detected a newer Codex CLI release.'), 'session-start should render a release advisory when Codex is outdated');
assert(releaseAuditOnlyContext.includes('known_delta:'), 'release advisory should include known delta notes');
assert(releaseAuditOnlyContext.includes('upgrade_plan:'), 'release advisory should include an upgrade plan');

const combinedWorkflowCwd = join(home, 'release-audit-combined');
await mkdir(combinedWorkflowCwd, { recursive: true });
const combinedWorkflow = await makeWorkflow({
  home,
  slug: 'release-audit-combined',
  mode: 'ralph',
});
await syncWorkflow({
  codexHome: home,
  cwd: combinedWorkflowCwd,
  progressPath: combinedWorkflow.progressPath,
});

const workflowAndAuditContext = await sessionStartHook({
  codexHome: home,
  cwd: combinedWorkflowCwd,
  releaseAudit: {
    readInstalledVersion() {
      return {
        raw: 'codex-cli 0.114.0',
        normalized: '0.114.0',
        semver: [0, 114, 0],
      };
    },
    async getLatestReleaseInfo() {
      return {
        latest_version: '0.115.0',
        published_at: '2026-03-16T00:00:00Z',
        checked_at: '2026-03-17T00:00:00Z',
        source: 'npm-registry',
      };
    },
  },
});
assert(workflowAndAuditContext.includes('mode: ralph'), 'workflow context should still render when a release advisory is present');
assert(workflowAndAuditContext.includes('Chedex release audit detected a newer Codex CLI release.'), 'workflow context should append the release advisory when Codex is outdated');

const releaseAuditFailureContext = await sessionStartHook({
  codexHome: home,
  cwd: join(home, 'release-audit-failure'),
  releaseAudit: {
    readInstalledVersion() {
      return {
        raw: 'codex-cli 0.114.0',
        normalized: '0.114.0',
        semver: [0, 114, 0],
      };
    },
    async getLatestReleaseInfo() {
      throw new Error('network down');
    },
  },
});
assert(releaseAuditFailureContext === '', 'release audit failures should fail open on session start');

await writeJson(releaseAuditCachePath(home), {
  schema_version: 1,
  latest_version: '0.115.0',
  published_at: '2026-03-16T00:00:00Z',
  checked_at: '2026-03-16T00:00:00Z',
  source: 'npm-registry',
});

const staleCacheAudit = await buildReleaseAudit({
  codexHome: home,
  readInstalledVersion() {
    return {
      raw: 'codex-cli 0.114.0',
      normalized: '0.114.0',
      semver: [0, 114, 0],
    };
  },
  async getLatestReleaseInfo({ codexHome }) {
    const cache = JSON.parse(await readFile(releaseAuditCachePath(codexHome), 'utf8'));
    return {
      ...cache,
      stale: true,
    };
  },
});
assert(staleCacheAudit.stale, 'release audit should preserve stale cache metadata when live refresh is unavailable');

process.stdout.write('verify-governor-ok\n');
