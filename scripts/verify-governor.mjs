import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import {
  acquireActiveIndexLock,
  GOVERNOR_SCHEMA_VERSION,
  activeIndexPath,
  clearWorkflow,
  sessionStartHook,
  stopHook,
  syncWorkflow,
  userPromptSubmitHook,
} from '../hooks/chedex-governor.mjs';
import {
  buildReleaseAudit,
  releaseAuditCachePath,
} from '../hooks/codex-release-audit.mjs';
import {
  chedexLatestVerifiedCodexVersion,
  chedexMinimumCodexVersion,
  parseSemver,
} from './lib.mjs';

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
  const specPath = mode === 'autoresearch-loop' ? join(workflowRoot, 'spec.md') : null;
  const resultsPath = mode === 'autoresearch-loop' ? join(workflowRoot, 'results.tsv') : null;

  await writeFile(verifyPath, '# verify\n');
  if (specPath) {
    await writeFile(specPath, '# spec\n');
  }
  if (resultsPath) {
    await writeFile(resultsPath, 'run_id\tmetric\tstatus\tcost\tnotes\nbaseline\t0\tkept\t0\tseed\n');
  }
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
  if (specPath) {
    progress.artifacts.spec = specPath;
  }
  if (resultsPath) {
    progress.artifacts.results = resultsPath;
  }

  await writeJson(progressPath, progress);
  await writeFile(join(workflowRoot, 'plan.md'), '# plan\n');

  return {
    workflowRoot,
    progressPath,
  };
}

function sleep(ms) {
  return new Promise((resolvePromise) => {
    setTimeout(resolvePromise, ms);
  });
}

const latestVerifiedSemver = parseSemver(chedexLatestVerifiedCodexVersion);
const minimumSupportedSemver = parseSemver(chedexMinimumCodexVersion);

assert(latestVerifiedSemver, 'expected latest verified Codex version to be valid semver');
assert(minimumSupportedSemver, 'expected minimum supported Codex version to be valid semver');

const home = await mkdtemp(join(tmpdir(), 'chedex-governor-'));
const cwd = join(home, 'workspace');
await mkdir(cwd, { recursive: true });

for (const mode of ['ralph', 'autopilot', 'ultrawork', 'autoresearch-loop']) {
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
  if (mode === 'autoresearch-loop') {
    assert(sessionContext.includes('results:'), 'session-start should surface results.tsv for autoresearch-loop');
  }

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

for (const mode of ['ralph', 'autopilot', 'autoresearch-loop']) {
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

const completedResearchLoop = await makeWorkflow({
  home,
  slug: 'completed-autoresearch-loop',
  mode: 'autoresearch-loop',
  status: 'completed',
  phase: 'validate',
  verificationState: 'satisfied',
  evidence: ['npm run verify'],
  nextStep: 'Report results',
  risks: [],
  includeHandoff: true,
});

await syncWorkflow({
  codexHome: home,
  cwd,
  progressPath: completedResearchLoop.progressPath,
});

const completedResearchAllowed = await stopHook({
  codexHome: home,
  cwd,
});
assert(completedResearchAllowed.action === 'allow', 'completed autoresearch-loop with satisfied verification should allow stop');

const missingResearchSpecWorkflow = await makeWorkflow({
  home,
  slug: 'autoresearch-loop-missing-spec',
  mode: 'autoresearch-loop',
});
const missingResearchSpecProgress = JSON.parse(await readFile(missingResearchSpecWorkflow.progressPath, 'utf8'));
delete missingResearchSpecProgress.artifacts.spec;
await writeJson(missingResearchSpecWorkflow.progressPath, missingResearchSpecProgress);
let missingResearchSpecFailed = false;
try {
  await syncWorkflow({
    codexHome: home,
    cwd,
    progressPath: missingResearchSpecWorkflow.progressPath,
  });
} catch (error) {
  missingResearchSpecFailed = error.message.includes('autoresearch-loop workflows require artifacts.spec');
}
assert(missingResearchSpecFailed, 'autoresearch-loop should require a spec artifact');

const missingResearchResultsWorkflow = await makeWorkflow({
  home,
  slug: 'autoresearch-loop-missing-results',
  mode: 'autoresearch-loop',
});
const missingResearchResultsProgress = JSON.parse(await readFile(missingResearchResultsWorkflow.progressPath, 'utf8'));
delete missingResearchResultsProgress.artifacts.results;
await writeJson(missingResearchResultsWorkflow.progressPath, missingResearchResultsProgress);
let missingResearchResultsFailed = false;
try {
  await syncWorkflow({
    codexHome: home,
    cwd,
    progressPath: missingResearchResultsWorkflow.progressPath,
  });
} catch (error) {
  missingResearchResultsFailed = error.message.includes('autoresearch-loop workflows require artifacts.results');
}
assert(missingResearchResultsFailed, 'autoresearch-loop should require a results artifact');

const missingResearchVerifyFile = await makeWorkflow({
  home,
  slug: 'autoresearch-loop-missing-verify-file',
  mode: 'autoresearch-loop',
});
const missingResearchVerifyPath = join(missingResearchVerifyFile.workflowRoot, 'verify.md');
await writeFile(missingResearchVerifyPath, '');
const missingResearchVerifyProgress = JSON.parse(await readFile(missingResearchVerifyFile.progressPath, 'utf8'));
missingResearchVerifyProgress.artifacts.verify = join(missingResearchVerifyFile.workflowRoot, 'missing-verify.md');
await writeJson(missingResearchVerifyFile.progressPath, missingResearchVerifyProgress);
let missingResearchVerifyFailed = false;
try {
  await syncWorkflow({
    codexHome: home,
    cwd,
    progressPath: missingResearchVerifyFile.progressPath,
  });
} catch (error) {
  missingResearchVerifyFailed = error.message.includes('missing verify artifact');
}
assert(missingResearchVerifyFailed, 'autoresearch-loop should require an existing verify artifact');

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
assert(invalidResumeContext.includes('could not restore it safely'), 'invalid workflow should warn on session start');

const indexAfterInvalidResume = JSON.parse(await readFile(activeIndexPath(home), 'utf8'));
assert(cwd in indexAfterInvalidResume.entries, 'invalid resumed workflow should remain indexed so stop protection is preserved');

const invalidIndexedProgressCwd = join(home, 'invalid-indexed-progress');
await mkdir(invalidIndexedProgressCwd, { recursive: true });
const invalidIndexedProgressWorkflow = await makeWorkflow({
  home,
  slug: 'invalid-indexed-progress',
  mode: 'ralph',
});
await syncWorkflow({
  codexHome: home,
  cwd: invalidIndexedProgressCwd,
  progressPath: invalidIndexedProgressWorkflow.progressPath,
});
await writeFile(invalidIndexedProgressWorkflow.progressPath, '{bad json\n');
const invalidIndexedProgressContext = await sessionStartHook({
  codexHome: home,
  cwd: invalidIndexedProgressCwd,
  releaseAudit: {
    disabled: true,
  },
});
assert(invalidIndexedProgressContext.includes('could not restore it safely'), 'session-start should warn when indexed progress.json is malformed');
const indexAfterMalformedProgress = JSON.parse(await readFile(activeIndexPath(home), 'utf8'));
assert(invalidIndexedProgressCwd in indexAfterMalformedProgress.entries, 'session-start should preserve the index entry when progress.json is malformed');
const invalidIndexedProgressStop = await stopHook({
  codexHome: home,
  cwd: invalidIndexedProgressCwd,
});
assert(invalidIndexedProgressStop.action === 'block', 'stop should block when indexed progress.json is malformed');
assert(invalidIndexedProgressStop.reason.includes('progress.json is unreadable'), 'stop should explain malformed progress.json blocks');
const invalidIndexedProgressPrompt = await userPromptSubmitHook({
  codexHome: home,
  cwd: invalidIndexedProgressCwd,
});
assert(invalidIndexedProgressPrompt.decision === 'block', 'user-prompt-submit should block when indexed progress.json is malformed');
assert(invalidIndexedProgressPrompt.reason.includes('progress.json is unreadable'), 'user-prompt-submit should explain malformed progress.json blocks');

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

const invalidWorkflowRoot = await makeWorkflow({
  home,
  slug: 'invalid-workflow-root',
});
const invalidWorkflowRootProgress = JSON.parse(await readFile(invalidWorkflowRoot.progressPath, 'utf8'));
invalidWorkflowRootProgress.workflow_root = `${invalidWorkflowRoot.workflowRoot}-missing`;
await writeJson(invalidWorkflowRoot.progressPath, invalidWorkflowRootProgress);
let invalidWorkflowRootFailed = false;
try {
  await syncWorkflow({
    codexHome: home,
    cwd,
    progressPath: invalidWorkflowRoot.progressPath,
  });
} catch (error) {
  invalidWorkflowRootFailed = error.message.includes('workflow_root must resolve to the directory that contains progress.json');
}
assert(invalidWorkflowRootFailed, 'workflow_root must resolve to the directory that contains progress.json');

const corruptedIndexCwd = join(home, 'corrupted-index-workspace');
await mkdir(corruptedIndexCwd, { recursive: true });
const corruptedIndexWorkflow = await makeWorkflow({
  home,
  slug: 'corrupted-index-workflow',
  mode: 'ralph',
});
await syncWorkflow({
  codexHome: home,
  cwd: corruptedIndexCwd,
  progressPath: corruptedIndexWorkflow.progressPath,
});
const corruptedIndex = JSON.parse(await readFile(activeIndexPath(home), 'utf8'));
corruptedIndex.entries[corruptedIndexCwd].workflow_root = `${corruptedIndexWorkflow.workflowRoot}-missing`;
await writeJson(activeIndexPath(home), corruptedIndex);
const corruptedIndexStop = await stopHook({
  codexHome: home,
  cwd: corruptedIndexCwd,
});
assert(corruptedIndexStop.action === 'block', 'stop should still block when stale index metadata points at a missing workflow root');
assert(corruptedIndexStop.reason.includes('workflow is still active'), 'stop should rely on valid progress state rather than stale workflow_root metadata');

await writeFile(activeIndexPath(home), '{bad json\n');
const invalidIndexContext = await sessionStartHook({
  codexHome: home,
  cwd: corruptedIndexCwd,
  releaseAudit: {
    disabled: true,
  },
});
assert(invalidIndexContext.includes('could not read the active workflow index'), 'session-start should warn when _active.json is malformed');
const invalidIndexStop = await stopHook({
  codexHome: home,
  cwd: corruptedIndexCwd,
});
assert(invalidIndexStop.action === 'block', 'stop should block when _active.json is malformed');
assert(invalidIndexStop.reason.includes('active workflow index is invalid'), 'stop should explain malformed _active.json blocks');
const invalidIndexPrompt = await userPromptSubmitHook({
  codexHome: home,
  cwd: corruptedIndexCwd,
});
assert(invalidIndexPrompt.decision === 'block', 'user-prompt-submit should block when _active.json is malformed');
assert(invalidIndexPrompt.reason.includes('active workflow index is invalid'), 'user-prompt-submit should explain malformed _active.json blocks');
await writeJson(activeIndexPath(home), {
  schema_version: GOVERNOR_SCHEMA_VERSION,
  entries: {},
});

const repairedIndexCwd = join(home, 'repaired-index-workspace');
await mkdir(repairedIndexCwd, { recursive: true });
const repairedIndexWorkflow = await makeWorkflow({
  home,
  slug: 'repaired-index-workflow',
  mode: 'ralph',
});
await syncWorkflow({
  codexHome: home,
  cwd: repairedIndexCwd,
  progressPath: repairedIndexWorkflow.progressPath,
});
const repairedIndex = JSON.parse(await readFile(activeIndexPath(home), 'utf8'));
repairedIndex.entries[repairedIndexCwd].workflow_root = `${repairedIndexWorkflow.workflowRoot}-missing`;
await writeJson(activeIndexPath(home), repairedIndex);
const repairedIndexContext = await sessionStartHook({
  codexHome: home,
  cwd: repairedIndexCwd,
  releaseAudit: {
    disabled: true,
  },
});
assert(repairedIndexContext.includes('mode: ralph'), 'session-start should still rehydrate when active-index workflow_root metadata is stale');
const repairedIndexAfterSessionStart = JSON.parse(await readFile(activeIndexPath(home), 'utf8'));
assert(repairedIndexAfterSessionStart.entries[repairedIndexCwd].workflow_root === repairedIndexWorkflow.workflowRoot, 'session-start should repair stale workflow_root metadata in the active index');

const lockedHome = await mkdtemp(join(tmpdir(), 'chedex-governor-lock-'));
const lockedCwdA = join(lockedHome, 'workspace-a');
const lockedCwdB = join(lockedHome, 'workspace-b');
await mkdir(lockedCwdA, { recursive: true });
await mkdir(lockedCwdB, { recursive: true });
const lockedWorkflowA = await makeWorkflow({
  home: lockedHome,
  slug: 'locked-a',
  mode: 'ralph',
});
const lockedWorkflowB = await makeWorkflow({
  home: lockedHome,
  slug: 'locked-b',
  mode: 'ralph',
});
const heldLock = await acquireActiveIndexLock(lockedHome);
const blockedSyncA = syncWorkflow({
  codexHome: lockedHome,
  cwd: lockedCwdA,
  progressPath: lockedWorkflowA.progressPath,
});
const blockedSyncB = syncWorkflow({
  codexHome: lockedHome,
  cwd: lockedCwdB,
  progressPath: lockedWorkflowB.progressPath,
});
await sleep(100);
let lockHeldObserved = false;
try {
  await readFile(activeIndexPath(lockedHome), 'utf8');
} catch {
  lockHeldObserved = true;
}
assert(lockHeldObserved, 'sync should wait for the active index lock before writing');
await heldLock.release();
await Promise.all([blockedSyncA, blockedSyncB]);
const lockedIndex = JSON.parse(await readFile(activeIndexPath(lockedHome), 'utf8'));
assert(Object.keys(lockedIndex.entries).length === 2, 'serialized syncs should preserve both active index entries');

const currentReleaseAudit = await buildReleaseAudit({
  codexHome: home,
  readInstalledVersion() {
    return {
      raw: `codex-cli ${chedexLatestVerifiedCodexVersion}`,
      normalized: chedexLatestVerifiedCodexVersion,
      semver: latestVerifiedSemver,
    };
  },
  async getLatestReleaseInfo() {
    return {
      latest_version: chedexLatestVerifiedCodexVersion,
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
        raw: `codex-cli ${chedexMinimumCodexVersion}`,
        normalized: chedexMinimumCodexVersion,
        semver: minimumSupportedSemver,
      };
    },
    async getLatestReleaseInfo() {
      return {
        latest_version: chedexLatestVerifiedCodexVersion,
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
        raw: `codex-cli ${chedexMinimumCodexVersion}`,
        normalized: chedexMinimumCodexVersion,
        semver: minimumSupportedSemver,
      };
    },
    async getLatestReleaseInfo() {
      return {
        latest_version: chedexLatestVerifiedCodexVersion,
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
        raw: `codex-cli ${chedexMinimumCodexVersion}`,
        normalized: chedexMinimumCodexVersion,
        semver: minimumSupportedSemver,
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
  latest_version: chedexLatestVerifiedCodexVersion,
  published_at: '2026-03-16T00:00:00Z',
  checked_at: '2026-03-16T00:00:00Z',
  source: 'npm-registry',
});

const staleCacheAudit = await buildReleaseAudit({
  codexHome: home,
  readInstalledVersion() {
    return {
      raw: `codex-cli ${chedexMinimumCodexVersion}`,
      normalized: chedexMinimumCodexVersion,
      semver: minimumSupportedSemver,
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

const emptyPromptVerdict = await userPromptSubmitHook({
  codexHome: home,
  cwd: join(home, 'prompt-submit-empty'),
});
assert(emptyPromptVerdict.decision === 'allow', 'user-prompt-submit should allow prompts when no governed workflow is active');

const malformedSessionStartCli = execFileSync(process.execPath, [join(process.cwd(), 'hooks', 'chedex-governor.mjs'), 'session-start', '--codex-home', home], {
  cwd: process.cwd(),
  env: process.env,
  input: '{bad json\n',
  encoding: 'utf8',
});
assert(malformedSessionStartCli.includes('could not restore it safely'), 'session-start CLI should handle malformed hook input without crashing');

const malformedStopCli = execFileSync(process.execPath, [join(process.cwd(), 'hooks', 'chedex-governor.mjs'), 'stop', '--codex-home', home], {
  cwd: process.cwd(),
  env: process.env,
  input: '{bad json\n',
  encoding: 'utf8',
});
const malformedStopVerdict = JSON.parse(malformedStopCli);
assert(malformedStopVerdict.decision === 'block', 'stop CLI should block on malformed hook input');
assert(malformedStopVerdict.reason.includes('invalid hook JSON input'), 'stop CLI should explain malformed hook input blocks');

const malformedPromptSubmitCli = execFileSync(process.execPath, [join(process.cwd(), 'hooks', 'chedex-governor.mjs'), 'user-prompt-submit', '--codex-home', home], {
  cwd: process.cwd(),
  env: process.env,
  input: '{bad json\n',
  encoding: 'utf8',
});
const malformedPromptSubmitVerdict = JSON.parse(malformedPromptSubmitCli);
assert(malformedPromptSubmitVerdict.decision === 'block', 'user-prompt-submit CLI should block on malformed hook input');
assert(malformedPromptSubmitVerdict.reason.includes('invalid hook JSON input'), 'user-prompt-submit CLI should explain malformed hook input blocks');

process.stdout.write('verify-governor-ok\n');
