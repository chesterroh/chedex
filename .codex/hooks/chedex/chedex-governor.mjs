#!/usr/bin/env node

import { realpathSync } from 'node:fs';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildReleaseAudit, renderReleaseAuditAdvisory } from './codex-release-audit.mjs';

export const GOVERNOR_SCHEMA_VERSION = 1;
export const ACTIVE_STATUS = 'active';
export const TERMINAL_STATUSES = new Set(['completed', 'paused', 'blocked', 'failed', 'cancelled']);
export const GOVERNED_MODES = new Set(['ralph', 'autopilot', 'ultrawork']);
export const VERIFICATION_SATISFIED = 'satisfied';
export const HANDOFF_REQUIRED_MODES = new Set(['ralph', 'autopilot']);

export function defaultCodexHome() {
  return process.env.CODEX_HOME || join(homedir(), '.codex');
}

export function workflowsRoot(codexHome = defaultCodexHome()) {
  return join(codexHome, 'workflows');
}

export function activeIndexPath(codexHome = defaultCodexHome()) {
  return join(workflowsRoot(codexHome), '_active.json');
}

export async function pathExists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

export async function readJsonIfExists(path, fallback = null) {
  try {
    const text = await readFile(path, 'utf8');
    return JSON.parse(text);
  } catch (error) {
    if (error && (error.code === 'ENOENT' || error.name === 'SyntaxError')) {
      if (error.name === 'SyntaxError') {
        throw new Error(`invalid JSON at ${path}`);
      }
      return fallback;
    }
    throw error;
  }
}

export async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  const content = `${JSON.stringify(value, null, 2)}\n`;
  await writeFile(path, content);
}

export function normalizeActiveIndex(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      schema_version: GOVERNOR_SCHEMA_VERSION,
      entries: {},
    };
  }

  const entries = raw.entries && typeof raw.entries === 'object' && !Array.isArray(raw.entries)
    ? raw.entries
    : {};

  return {
    schema_version: GOVERNOR_SCHEMA_VERSION,
    entries,
  };
}

export function resolvePathFrom(baseDir, candidate) {
  if (!candidate || typeof candidate !== 'string') return null;
  return resolve(baseDir, candidate);
}

export function parseIsoDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function validateGovernedProgress(progress) {
  const errors = [];
  const baseFields = [
    'schema_version',
    'mode',
    'task',
    'active',
    'phase',
    'status',
    'updated_at',
    'workflow_root',
    'next_step',
    'artifacts',
    'verification',
    'blocker',
    'risks',
  ];

  for (const field of baseFields) {
    if (!(field in progress)) {
      errors.push(`missing field: ${field}`);
    }
  }

  if (progress.schema_version !== GOVERNOR_SCHEMA_VERSION) {
    errors.push(`unsupported schema_version: ${progress.schema_version}`);
  }

  if (!GOVERNED_MODES.has(progress.mode)) {
    errors.push(`unsupported mode: ${progress.mode}`);
  }

  if (typeof progress.task !== 'string' || !progress.task.trim()) {
    errors.push('task must be a non-empty string');
  }

  const status = progress.status;
  if (status !== ACTIVE_STATUS && !TERMINAL_STATUSES.has(status)) {
    errors.push(`unsupported status: ${status}`);
  }

  if (typeof progress.active !== 'boolean') {
    errors.push('active must be boolean');
  } else if (status === ACTIVE_STATUS && !progress.active) {
    errors.push('active must be true when status is active');
  } else if (status !== ACTIVE_STATUS && progress.active) {
    errors.push(`active must be false when status is ${status}`);
  }

  if (!parseIsoDate(progress.updated_at)) {
    errors.push('updated_at must be ISO-8601');
  }

  if (typeof progress.workflow_root !== 'string' || !progress.workflow_root.trim()) {
    errors.push('workflow_root must be a non-empty string');
  }

  if (typeof progress.phase !== 'string' || !progress.phase.trim()) {
    errors.push('phase must be a non-empty string');
  }

  if (progress.next_step != null && typeof progress.next_step !== 'string') {
    errors.push('next_step must be a string or null');
  }

  if (progress.blocker != null && typeof progress.blocker !== 'string') {
    errors.push('blocker must be a string or null');
  }

  if (!progress.artifacts || typeof progress.artifacts !== 'object' || Array.isArray(progress.artifacts)) {
    errors.push('artifacts must be an object');
  }

  const handoff = progress.artifacts?.handoff;
  if (handoff != null && (typeof handoff !== 'string' || !handoff.trim())) {
    errors.push('artifacts.handoff must be a non-empty string when present');
  }
  if (HANDOFF_REQUIRED_MODES.has(progress.mode) && (typeof handoff !== 'string' || !handoff.trim())) {
    errors.push(`${progress.mode} workflows require artifacts.handoff`);
  }

  if (!progress.verification || typeof progress.verification !== 'object' || Array.isArray(progress.verification)) {
    errors.push('verification must be an object');
  }

  if (!Array.isArray(progress.risks)) {
    errors.push('risks must be an array');
  } else if (progress.risks.some((item) => typeof item !== 'string' || !item.trim())) {
    errors.push('risks entries must be non-empty strings');
  }

  const evidence = progress.verification?.evidence;
  if (!Array.isArray(evidence)) {
    errors.push('verification.evidence must be an array');
  } else if (evidence.some((item) => typeof item !== 'string' || !item.trim())) {
    errors.push('verification.evidence entries must be non-empty strings');
  }

  if (status === 'completed') {
    if (progress.verification?.state !== VERIFICATION_SATISFIED) {
      errors.push('completed workflows require verification.state = "satisfied"');
    }
    if (!Array.isArray(evidence) || evidence.length === 0) {
      errors.push('completed workflows require at least one verification evidence entry');
    }
  }

  if (TERMINAL_STATUSES.has(status) && status !== 'completed') {
    const hasNextStep = typeof progress.next_step === 'string' && progress.next_step.trim().length > 0;
    const hasBlocker = typeof progress.blocker === 'string' && progress.blocker.trim().length > 0;
    if (!hasNextStep && !hasBlocker) {
      errors.push(`${status} workflows require next_step or blocker`);
    }
  }

  return {
    ok: errors.length === 0,
    errors,
  };
}

export function validateHandoff(handoff) {
  const errors = [];
  const requiredArrayFields = [
    'acceptance_criteria',
    'verification_targets',
    'delegation_roster',
    'source_artifacts',
  ];

  if (!handoff || typeof handoff !== 'object' || Array.isArray(handoff)) {
    return {
      ok: false,
      errors: ['handoff.json must contain an object'],
    };
  }

  if (typeof handoff.task !== 'string' || !handoff.task.trim()) {
    errors.push('handoff.task must be a non-empty string');
  }

  for (const field of requiredArrayFields) {
    if (!Array.isArray(handoff[field])) {
      errors.push(`handoff.${field} must be an array`);
    }
  }

  if (typeof handoff.execution_lane !== 'string' || !handoff.execution_lane.trim()) {
    errors.push('handoff.execution_lane must be a non-empty string');
  }

  if (!parseIsoDate(handoff.approved_at)) {
    errors.push('handoff.approved_at must be ISO-8601');
  }

  return {
    ok: errors.length === 0,
    errors,
  };
}

export async function validateGovernedWorkflow(progress, progressPath) {
  const errors = [...validateGovernedProgress(progress).errors];
  const progressDir = dirname(progressPath);
  const handoffPath = resolvePathFrom(progressDir, progress.artifacts?.handoff || null);

  if (!handoffPath) {
    return {
      ok: errors.length === 0,
      errors,
    };
  }

  try {
    const handoff = await readJsonIfExists(handoffPath, null);
    if (!handoff) {
      errors.push(`missing handoff.json at ${handoffPath}`);
    } else {
      const handoffValidation = validateHandoff(handoff);
      if (!handoffValidation.ok) {
        errors.push(...handoffValidation.errors);
      }
    }
  } catch (error) {
    errors.push(error.message);
  }

  return {
    ok: errors.length === 0,
    errors,
  };
}

export async function readProgress(progressPath) {
  const progress = await readJsonIfExists(progressPath, null);
  if (!progress) {
    throw new Error(`missing progress.json at ${progressPath}`);
  }
  return progress;
}

export function deriveActiveEntry({ cwd, progressPath, progress }) {
  const progressDir = dirname(progressPath);
  const workflowRoot = resolvePathFrom(progressDir, progress.workflow_root);
  const verifyPath = resolvePathFrom(progressDir, progress.artifacts?.verify || join(workflowRoot, 'verify.md'));
  const handoffPath = resolvePathFrom(progressDir, progress.artifacts?.handoff || null);

  return {
    mode: progress.mode,
    task: progress.task,
    workflow_root: workflowRoot,
    progress_path: progressPath,
    verify_path: verifyPath,
    handoff_path: handoffPath,
    status: progress.status,
    phase: progress.phase ?? null,
    next_step: progress.next_step ?? null,
    updated_at: progress.updated_at,
    cwd,
  };
}

export async function loadActiveIndex(codexHome = defaultCodexHome()) {
  const raw = await readJsonIfExists(activeIndexPath(codexHome), null);
  return normalizeActiveIndex(raw);
}

export async function saveActiveIndex(index, codexHome = defaultCodexHome()) {
  await writeJson(activeIndexPath(codexHome), index);
}

export async function syncWorkflow({ codexHome = defaultCodexHome(), cwd = process.cwd(), progressPath }) {
  const normalizedCwd = resolve(cwd);
  const normalizedProgressPath = resolve(progressPath);
  const progress = await readProgress(normalizedProgressPath);
  const validation = await validateGovernedWorkflow(progress, normalizedProgressPath);
  if (!validation.ok) {
    throw new Error(`invalid governed progress:\n${validation.errors.join('\n')}`);
  }

  const index = await loadActiveIndex(codexHome);
  index.entries[normalizedCwd] = deriveActiveEntry({
    cwd: normalizedCwd,
    progressPath: normalizedProgressPath,
    progress,
  });

  await saveActiveIndex(index, codexHome);
  return index.entries[normalizedCwd];
}

export async function clearWorkflow({ codexHome = defaultCodexHome(), cwd = process.cwd() }) {
  const normalizedCwd = resolve(cwd);
  const index = await loadActiveIndex(codexHome);
  if (!(normalizedCwd in index.entries)) {
    return false;
  }
  delete index.entries[normalizedCwd];
  await saveActiveIndex(index, codexHome);
  return true;
}

export async function pruneIndexForSessionStart(index) {
  let changed = false;
  for (const [cwd, entry] of Object.entries(index.entries)) {
    if (!entry || typeof entry !== 'object') {
      delete index.entries[cwd];
      changed = true;
      continue;
    }

    if (!(await pathExists(entry.workflow_root))) {
      delete index.entries[cwd];
      changed = true;
      continue;
    }

    if (!(await pathExists(entry.progress_path))) {
      delete index.entries[cwd];
      changed = true;
      continue;
    }

    try {
      const progress = await readProgress(entry.progress_path);
      const validation = await validateGovernedWorkflow(progress, entry.progress_path);
      if (!validation.ok || progress.status === 'completed' || progress.status === 'cancelled') {
        delete index.entries[cwd];
        changed = true;
      }
    } catch {
      delete index.entries[cwd];
      changed = true;
    }
  }

  return changed;
}

export function renderSessionStartContext(entry, progress) {
  const lines = [
    'Chedex governor restored a governed workflow for this workspace.',
    `mode: ${entry.mode}`,
    `status: ${progress.status}`,
  ];

  if (progress.phase) {
    lines.push(`phase: ${progress.phase}`);
  }
  lines.push(`task: ${progress.task}`);
  if (progress.next_step) {
    lines.push(`next_step: ${progress.next_step}`);
  }

  const artifacts = progress.artifacts || {};
  const artifactLines = [
    artifacts.context ? `context: ${artifacts.context}` : null,
    artifacts.spec ? `spec: ${artifacts.spec}` : null,
    artifacts.plan ? `plan: ${artifacts.plan}` : null,
    artifacts.handoff ? `handoff: ${artifacts.handoff}` : null,
    artifacts.verify ? `verify: ${artifacts.verify}` : null,
  ].filter(Boolean);

  if (artifactLines.length > 0) {
    lines.push('artifacts:');
    for (const line of artifactLines) {
      lines.push(`- ${line}`);
    }
  }

  lines.push('closeout rule: do not stop until progress.json is terminal and, when completed, verification is satisfied.');
  return `${lines.join('\n')}\n`;
}

export async function sessionStartHook({
  codexHome = defaultCodexHome(),
  cwd = process.cwd(),
  releaseAudit = {},
}) {
  const normalizedCwd = resolve(cwd);
  const index = await loadActiveIndex(codexHome);
  const changed = await pruneIndexForSessionStart(index);
  if (changed) {
    await saveActiveIndex(index, codexHome);
  }

  let releaseAuditContext = '';
  if (!releaseAudit.disabled && process.env.CHEDEX_DISABLE_RELEASE_AUDIT !== '1') {
    const audit = await buildReleaseAudit({
      codexHome,
      now: releaseAudit.now || new Date(),
      readInstalledVersion: releaseAudit.readInstalledVersion,
      getLatestReleaseInfo: releaseAudit.getLatestReleaseInfo,
    });
    releaseAuditContext = renderReleaseAuditAdvisory(audit);
  }

  const entry = index.entries[normalizedCwd];
  if (!entry) {
    return releaseAuditContext;
  }

  const progress = await readProgress(entry.progress_path);
  const workflowContext = renderSessionStartContext(entry, progress);
  if (!releaseAuditContext) {
    return workflowContext;
  }

  return `${workflowContext}\n${releaseAuditContext}`;
}

export async function stopHook({ codexHome = defaultCodexHome(), cwd = process.cwd() }) {
  const normalizedCwd = resolve(cwd);
  const index = await loadActiveIndex(codexHome);
  const entry = index.entries[normalizedCwd];

  if (!entry) {
    return { action: 'allow' };
  }

  if (!(await pathExists(entry.workflow_root))) {
    delete index.entries[normalizedCwd];
    await saveActiveIndex(index, codexHome);
    return { action: 'allow' };
  }

  if (!(await pathExists(entry.progress_path))) {
    return {
      action: 'block',
      reason: `Chedex governor blocked stop because the active workflow is missing progress.json at ${entry.progress_path}. Restore the file or clear the workflow explicitly.`,
    };
  }

  const progress = await readProgress(entry.progress_path);
  const validation = await validateGovernedWorkflow(progress, entry.progress_path);
  if (!validation.ok) {
    return {
      action: 'block',
      reason: `Chedex governor blocked stop because progress.json is invalid:\n- ${validation.errors.join('\n- ')}`,
    };
  }

  if (progress.status === ACTIVE_STATUS) {
    const nextStep = typeof progress.next_step === 'string' && progress.next_step.trim()
      ? progress.next_step.trim()
      : 'continue the governed workflow';
    return {
      action: 'block',
      reason: `Chedex governor blocked stop because the workflow is still active in phase ${progress.phase || 'unspecified'}. Next step: ${nextStep}.`,
    };
  }

  if (progress.status === 'completed' || progress.status === 'cancelled') {
    delete index.entries[normalizedCwd];
    await saveActiveIndex(index, codexHome);
  }

  return { action: 'allow' };
}

export function parseArgs(argv) {
  const result = {
    _: [],
  };

  for (let i = 0; i < argv.length; i += 1) {
    const part = argv[i];
    if (part.startsWith('--')) {
      const key = part.slice(2).replace(/-/g, '_');
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) {
        result[key] = true;
      } else {
        result[key] = next;
        i += 1;
      }
    } else {
      result._.push(part);
    }
  }

  return result;
}

export async function readHookInput() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  return raw ? JSON.parse(raw) : {};
}

export function blockResponse(reason) {
  return JSON.stringify({
    decision: 'block',
    reason,
  });
}

async function runCli() {
  const args = parseArgs(process.argv.slice(2));
  const [command] = args._;
  const codexHome = args.codex_home ? resolve(args.codex_home) : defaultCodexHome();

  if (!command) {
    throw new Error('usage: chedex-governor.mjs <session-start|stop|workflow-sync|workflow-clear>');
  }

  switch (command) {
    case 'session-start': {
      const input = await readHookInput();
      const output = await sessionStartHook({
        codexHome,
        cwd: input.cwd || process.cwd(),
      });
      process.stdout.write(output);
      return;
    }
    case 'stop': {
      const input = await readHookInput();
      const verdict = await stopHook({
        codexHome,
        cwd: input.cwd || process.cwd(),
      });
      if (verdict.action === 'block') {
        process.stdout.write(blockResponse(verdict.reason));
      }
      return;
    }
    case 'workflow-sync': {
      if (!args.progress) {
        throw new Error('--progress is required for workflow-sync');
      }
      const entry = await syncWorkflow({
        codexHome,
        cwd: args.cwd || process.cwd(),
        progressPath: args.progress,
      });
      process.stdout.write(`${JSON.stringify(entry, null, 2)}\n`);
      return;
    }
    case 'workflow-clear': {
      const removed = await clearWorkflow({
        codexHome,
        cwd: args.cwd || process.cwd(),
      });
      process.stdout.write(`removed=${removed ? 'true' : 'false'}\n`);
      return;
    }
    default:
      throw new Error(`unknown command: ${command}`);
  }
}

function resolveCliPath(path) {
  try {
    return realpathSync(path);
  } catch {
    return resolve(path);
  }
}

const isMain = process.argv[1] && resolveCliPath(process.argv[1]) === resolveCliPath(fileURLToPath(import.meta.url));
if (isMain) {
  runCli().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  });
}
