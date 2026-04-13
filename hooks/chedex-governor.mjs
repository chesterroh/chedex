#!/usr/bin/env node

import { createHash, randomUUID } from 'node:crypto';
import { realpathSync } from 'node:fs';
import { mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  APPROVAL_VERDICTS,
  MODE_SCHEMAS,
  VERIFICATION_REVIEW_VERDICTS,
} from './workflow-mode-schemas.mjs';
import { buildReleaseAudit, renderReleaseAuditAdvisory } from './codex-release-audit.mjs';

export const GOVERNOR_SCHEMA_VERSION = 1;
export const GOVERNOR_ARCHIVE_SCHEMA_VERSION = 1;
export const ACTIVE_STATUS = 'active';
export const TERMINAL_STATUSES = new Set(['completed', 'paused', 'blocked', 'failed', 'cancelled']);
export const GOVERNED_MODES = new Set(Object.keys(MODE_SCHEMAS));
export const VERIFICATION_SATISFIED = 'satisfied';
export const ACTIVE_INDEX_LOCK_TIMEOUT_MS = 5000;
export const ACTIVE_INDEX_LOCK_RETRY_MS = 25;

export function defaultCodexHome() {
  return process.env.CODEX_HOME || join(homedir(), '.codex');
}

export function workflowsRoot(codexHome = defaultCodexHome()) {
  return join(codexHome, 'workflows');
}

export function activeIndexPath(codexHome = defaultCodexHome()) {
  return join(workflowsRoot(codexHome), '_active.json');
}

export function archivePath(codexHome = defaultCodexHome()) {
  return join(workflowsRoot(codexHome), '_archive.json');
}

export function activeIndexLockPath(codexHome = defaultCodexHome()) {
  return join(workflowsRoot(codexHome), '_active.lock');
}

export function archiveLockPath(codexHome = defaultCodexHome()) {
  return join(workflowsRoot(codexHome), '_archive.lock');
}

export function workflowLockId(input) {
  return createHash('sha1').update(String(input)).digest('hex').slice(0, 16);
}

export function workflowLockPath(codexHome = defaultCodexHome(), workflowId) {
  return join(workflowsRoot(codexHome), `_lock_${workflowLockId(workflowId)}`);
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
  const tempPath = join(
    dirname(path),
    `.${basename(path)}.${process.pid}.${Date.now()}.${Math.random().toString(16).slice(2)}.tmp`,
  );
  try {
    await writeFile(tempPath, content);
    await rename(tempPath, path);
  } catch (error) {
    await rm(tempPath, { force: true }).catch(() => {});
    throw error;
  }
}

function sleep(ms) {
  return new Promise((resolvePromise) => {
    setTimeout(resolvePromise, ms);
  });
}

async function acquireDirectoryLock(lockPath, { timeoutMs, retryMs }) {
  const deadline = Date.now() + timeoutMs;

  for (;;) {
    try {
      await mkdir(lockPath);
      let released = false;
      return {
        lockPath,
        async release() {
          if (released) return;
          released = true;
          await rm(lockPath, { recursive: true, force: true });
        },
      };
    } catch (error) {
      if (error?.code !== 'EEXIST') {
        throw error;
      }
      if (Date.now() >= deadline) {
        throw new Error(`timed out waiting for active index lock at ${lockPath}`);
      }
      await sleep(retryMs);
    }
  }
}

export async function acquireActiveIndexLock(
  codexHome = defaultCodexHome(),
  {
    timeoutMs = ACTIVE_INDEX_LOCK_TIMEOUT_MS,
    retryMs = ACTIVE_INDEX_LOCK_RETRY_MS,
  } = {},
) {
  await mkdir(workflowsRoot(codexHome), { recursive: true });
  return acquireDirectoryLock(activeIndexLockPath(codexHome), { timeoutMs, retryMs });
}

export async function acquireArchiveLock(
  codexHome = defaultCodexHome(),
  {
    timeoutMs = ACTIVE_INDEX_LOCK_TIMEOUT_MS,
    retryMs = ACTIVE_INDEX_LOCK_RETRY_MS,
  } = {},
) {
  await mkdir(workflowsRoot(codexHome), { recursive: true });
  return acquireDirectoryLock(archiveLockPath(codexHome), { timeoutMs, retryMs });
}

export async function acquireWorkflowLock(
  codexHome = defaultCodexHome(),
  workflowId,
  {
    timeoutMs = ACTIVE_INDEX_LOCK_TIMEOUT_MS,
    retryMs = ACTIVE_INDEX_LOCK_RETRY_MS,
  } = {},
) {
  await mkdir(workflowsRoot(codexHome), { recursive: true });
  return acquireDirectoryLock(workflowLockPath(codexHome, workflowId), { timeoutMs, retryMs });
}

export async function withActiveIndexLock(codexHome, fn, options) {
  const lock = await acquireActiveIndexLock(codexHome, options);
  try {
    return await fn();
  } finally {
    await lock.release();
  }
}

export async function withArchiveLock(codexHome, fn, options) {
  const lock = await acquireArchiveLock(codexHome, options);
  try {
    return await fn();
  } finally {
    await lock.release();
  }
}

export async function withWorkflowLock(codexHome, workflowId, fn, options) {
  const lock = await acquireWorkflowLock(codexHome, workflowId, options);
  try {
    return await fn();
  } finally {
    await lock.release();
  }
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

export function normalizeArchive(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      schema_version: GOVERNOR_ARCHIVE_SCHEMA_VERSION,
      entries: [],
    };
  }

  return {
    schema_version: GOVERNOR_ARCHIVE_SCHEMA_VERSION,
    entries: Array.isArray(raw.entries) ? raw.entries : [],
  };
}

export function validateActiveIndexEntry(entry) {
  const errors = [];
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
    return {
      ok: false,
      errors: ['active index entry must be an object'],
    };
  }

  for (const field of ['mode', 'task', 'workflow_root', 'progress_path', 'verify_path', 'status', 'updated_at', 'cwd']) {
    if (typeof entry[field] !== 'string' || !entry[field].trim()) {
      errors.push(`active index entry field ${field} must be a non-empty string`);
    }
  }

  if (typeof entry.completion_token !== 'string' || !entry.completion_token.trim()) {
    errors.push('active index entry field completion_token must be a non-empty string');
  }

  if (entry.handoff_path != null && (typeof entry.handoff_path !== 'string' || !entry.handoff_path.trim())) {
    errors.push('active index entry field handoff_path must be a non-empty string or null');
  }

  if (entry.phase != null && typeof entry.phase !== 'string') {
    errors.push('active index entry field phase must be a string or null');
  }

  if (entry.next_step != null && typeof entry.next_step !== 'string') {
    errors.push('active index entry field next_step must be a string or null');
  }

  return {
    ok: errors.length === 0,
    errors,
  };
}

export function resolvePathFrom(baseDir, candidate) {
  if (!candidate || typeof candidate !== 'string') return null;
  return resolve(baseDir, candidate);
}

export function normalizeTrackedPath(path) {
  try {
    return realpathSync(path);
  } catch {
    return resolve(path);
  }
}

export function parseIsoDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function modeSchemaFor(mode) {
  return mode ? MODE_SCHEMAS[mode] || null : null;
}

export function validateVerificationReview(review, { requiredRole = 'verifier' } = {}) {
  const errors = [];
  if (!review || typeof review !== 'object' || Array.isArray(review)) {
    return {
      ok: false,
      errors: ['verification.review must be an object'],
    };
  }

  if (typeof review.role !== 'string' || !review.role.trim()) {
    errors.push('verification.review.role must be a non-empty string');
  } else if (review.role !== requiredRole) {
    errors.push(`verification.review.role must be "${requiredRole}"`);
  }

  if (typeof review.verdict !== 'string' || !VERIFICATION_REVIEW_VERDICTS.has(review.verdict)) {
    errors.push('verification.review.verdict must be one of: pass, fail, incomplete');
  }

  if (typeof review.evidence_ref !== 'string' || !review.evidence_ref.trim()) {
    errors.push('verification.review.evidence_ref must be a non-empty string');
  }

  if (typeof review.completion_token !== 'string' || !review.completion_token.trim()) {
    errors.push('verification.review.completion_token must be a non-empty string');
  }

  if (!parseIsoDate(review.approved_at)) {
    errors.push('verification.review.approved_at must be ISO-8601');
  }

  return {
    ok: errors.length === 0,
    errors,
  };
}

export function validateGovernedProgress(progress) {
  const errors = [];
  const schema = modeSchemaFor(progress?.mode);
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

  if (!schema) {
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
  } else if (schema && !schema.phases.includes(progress.phase)) {
    errors.push(`unsupported ${progress.mode} phase: ${progress.phase}`);
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

  const modeRequiredArtifacts = schema?.required_artifacts || [];
  for (const field of modeRequiredArtifacts) {
    const artifactPath = progress.artifacts?.[field];
    if (typeof artifactPath !== 'string' || !artifactPath.trim()) {
      errors.push(`${progress.mode} workflows require artifacts.${field}`);
    }
  }

  const handoff = progress.artifacts?.handoff;
  if (handoff != null && (typeof handoff !== 'string' || !handoff.trim())) {
    errors.push('artifacts.handoff must be a non-empty string when present');
  }
  if (schema?.handoff_policy === 'required' && (typeof handoff !== 'string' || !handoff.trim())) {
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
    const reviewValidation = validateVerificationReview(progress.verification?.review, {
      requiredRole: schema?.completion_review_role || 'verifier',
    });
    if (!reviewValidation.ok) {
      errors.push(...reviewValidation.errors);
    } else if (progress.verification.review.verdict !== 'pass') {
      errors.push('completed workflows require verification.review.verdict = "pass"');
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

export function validateHandoffApproval(approval) {
  const errors = [];
  if (!approval || typeof approval !== 'object' || Array.isArray(approval)) {
    return {
      ok: false,
      errors: ['handoff.approvals entries must be objects'],
    };
  }

  if (typeof approval.role !== 'string' || !approval.role.trim()) {
    errors.push('handoff.approvals.role must be a non-empty string');
  }

  if (typeof approval.verdict !== 'string' || !APPROVAL_VERDICTS.has(approval.verdict)) {
    errors.push('handoff.approvals.verdict must be one of: approved, rejected, incomplete');
  }

  if (typeof approval.evidence_ref !== 'string' || !approval.evidence_ref.trim()) {
    errors.push('handoff.approvals.evidence_ref must be a non-empty string');
  }

  if (!parseIsoDate(approval.approved_at)) {
    errors.push('handoff.approvals.approved_at must be ISO-8601');
  }

  return {
    ok: errors.length === 0,
    errors,
  };
}

export function validateHandoff(handoff, { mode } = {}) {
  const errors = [];
  const schema = modeSchemaFor(mode);
  const requiredArrayFields = [
    'acceptance_criteria',
    'verification_targets',
    'delegation_roster',
    'source_artifacts',
    'approvals',
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

  if (Array.isArray(handoff.approvals)) {
    for (const approval of handoff.approvals) {
      const approvalValidation = validateHandoffApproval(approval);
      if (!approvalValidation.ok) {
        errors.push(...approvalValidation.errors);
      }
    }

    for (const role of schema?.required_handoff_approvals || []) {
      const approved = handoff.approvals.some((approval) => approval?.role === role && approval?.verdict === 'approved');
      if (!approved) {
        errors.push(`handoff.approvals must include an approved ${role} entry`);
      }
    }
  }

  return {
    ok: errors.length === 0,
    errors,
  };
}

export async function validateGovernedWorkflow(progress, progressPath) {
  const schema = modeSchemaFor(progress?.mode);
  const errors = [...validateGovernedProgress(progress).errors];
  const progressDir = dirname(progressPath);
  const normalizedProgressDir = normalizeTrackedPath(progressDir);
  const workflowRoot = resolvePathFrom(progressDir, progress.workflow_root || null);
  const handoffPath = resolvePathFrom(progressDir, progress.artifacts?.handoff || null);
  const specPath = resolvePathFrom(progressDir, progress.artifacts?.spec || null);
  const resultsPath = resolvePathFrom(progressDir, progress.artifacts?.results || null);
  const verifyPath = resolvePathFrom(progressDir, progress.artifacts?.verify || null);

  if (!workflowRoot) {
    errors.push('workflow_root must resolve to a directory');
  } else if (normalizeTrackedPath(workflowRoot) !== normalizedProgressDir) {
    errors.push('workflow_root must resolve to the directory that contains progress.json');
  }

  const requiredArtifactPaths = {
    spec: specPath,
    results: resultsPath,
    verify: verifyPath,
  };

  for (const field of schema?.required_disk_artifacts || []) {
    const artifactPath = requiredArtifactPaths[field];
    if (!artifactPath) {
      continue;
    }
    if (!(await pathExists(artifactPath))) {
      errors.push(`missing ${field} artifact at ${artifactPath}`);
    }
  }

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
      const handoffValidation = validateHandoff(handoff, { mode: progress.mode });
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

export function deriveActiveEntry({ cwd, progressPath, progress, completionToken }) {
  const progressDir = dirname(progressPath);
  const workflowRoot = normalizeTrackedPath(resolvePathFrom(progressDir, progress.workflow_root));
  const verifyPath = normalizeTrackedPath(resolvePathFrom(progressDir, progress.artifacts?.verify || join(workflowRoot, 'verify.md')));
  const handoffPath = resolvePathFrom(progressDir, progress.artifacts?.handoff || null);

  return {
    mode: progress.mode,
    task: progress.task,
    workflow_root: workflowRoot,
    progress_path: normalizeTrackedPath(progressPath),
    verify_path: verifyPath,
    handoff_path: handoffPath ? normalizeTrackedPath(handoffPath) : null,
    status: progress.status,
    phase: progress.phase ?? null,
    next_step: progress.next_step ?? null,
    updated_at: progress.updated_at,
    completion_token: completionToken,
    cwd,
  };
}

export async function loadActiveIndex(codexHome = defaultCodexHome()) {
  const raw = await readJsonIfExists(activeIndexPath(codexHome), null);
  return normalizeActiveIndex(raw);
}

export async function loadArchive(codexHome = defaultCodexHome()) {
  const raw = await readJsonIfExists(archivePath(codexHome), null);
  return normalizeArchive(raw);
}

export async function saveActiveIndex(index, codexHome = defaultCodexHome()) {
  await writeJson(activeIndexPath(codexHome), index);
}

export async function saveArchive(archive, codexHome = defaultCodexHome()) {
  await writeJson(archivePath(codexHome), archive);
}

export async function loadActiveIndexResult(codexHome = defaultCodexHome()) {
  try {
    return {
      ok: true,
      index: await loadActiveIndex(codexHome),
      error: null,
    };
  } catch (error) {
    return {
      ok: false,
      index: null,
      error,
    };
  }
}

export function buildArchiveEntry({ cwd, entry, progress, archivedAt = new Date().toISOString() }) {
  return {
    archive_key: workflowLockId(`${entry.workflow_root}:${progress.status}:${progress.updated_at}`),
    archived_at: archivedAt,
    cwd,
    entry,
    progress,
  };
}

export async function archiveWorkflow({
  codexHome = defaultCodexHome(),
  cwd,
  entry,
  progress,
  archivedAt = new Date().toISOString(),
}) {
  return withArchiveLock(codexHome, async () => {
    const archive = await loadArchive(codexHome);
    const archiveEntry = buildArchiveEntry({
      cwd,
      entry,
      progress,
      archivedAt,
    });
    const alreadyArchived = archive.entries.some((item) => item?.archive_key === archiveEntry.archive_key);
    if (!alreadyArchived) {
      archive.entries.push(archiveEntry);
      await saveArchive(archive, codexHome);
    }
    return archiveEntry;
  });
}

function formatErrorReason(error) {
  return error instanceof Error ? error.message : String(error);
}

function buildIndexInvalidReason(codexHome, error) {
  return `Chedex governor could not read the active workflow index at ${activeIndexPath(codexHome)}.\nReason: ${formatErrorReason(error)}`;
}

function buildLockBusyReason(codexHome, error, workflowId = null) {
  const lockPaths = [
    workflowId ? workflowLockPath(codexHome, workflowId) : null,
    activeIndexLockPath(codexHome),
  ].filter(Boolean);
  return `Chedex governor could not safely access governed state locks at ${lockPaths.join(', ')}.\nReason: ${formatErrorReason(error)}`;
}

export function shouldArchiveWorkflow(progress) {
  return progress?.status === 'completed' || progress?.status === 'cancelled';
}

export function findWorkflowOwnershipConflict(index, { cwd, progressPath, workflowRoot }) {
  for (const [entryCwd, entry] of Object.entries(index.entries || {})) {
    if (entryCwd === cwd || entry?.cwd === cwd) {
      continue;
    }

    const indexedProgressPath = typeof entry?.progress_path === 'string'
      ? normalizeTrackedPath(entry.progress_path)
      : null;
    const indexedWorkflowRoot = typeof entry?.workflow_root === 'string'
      ? normalizeTrackedPath(entry.workflow_root)
      : null;

    if (
      (progressPath && indexedProgressPath === progressPath)
      || (workflowRoot && indexedWorkflowRoot === workflowRoot)
    ) {
      return entry;
    }
  }

  return null;
}

export async function inspectIndexedWorkflowEntry(entry) {
  const entryValidation = validateActiveIndexEntry(entry);
  if (!entryValidation.ok) {
    return {
      ok: false,
      reason: `the active workflow index entry is invalid:\n- ${entryValidation.errors.join('\n- ')}`,
    };
  }

  if (!(await pathExists(entry.progress_path))) {
    return {
      ok: false,
      reason: `the active workflow is missing progress.json at ${entry.progress_path}. Restore the file or clear the workflow explicitly.`,
    };
  }

  let progress;
  try {
    progress = await readProgress(entry.progress_path);
  } catch (error) {
    return {
      ok: false,
      reason: `progress.json is unreadable:\n- ${formatErrorReason(error)}`,
    };
  }

  const validation = await validateGovernedWorkflow(progress, entry.progress_path);
  if (!validation.ok) {
    return {
      ok: false,
      reason: `progress.json is invalid:\n- ${validation.errors.join('\n- ')}`,
    };
  }

  const normalizedEntry = deriveActiveEntry({
    cwd: entry.cwd,
    progressPath: entry.progress_path,
    progress,
    completionToken: entry.completion_token,
  });
  if (!(await pathExists(normalizedEntry.workflow_root))) {
    return {
      ok: false,
      reason: `the active workflow root is missing at ${normalizedEntry.workflow_root}. Restore the workflow directory or clear the workflow explicitly.`,
    };
  }

  if (
    progress.status === 'completed'
    && progress.verification?.review?.completion_token !== normalizedEntry.completion_token
  ) {
    return {
      ok: false,
      reason: 'completed workflow verification provenance does not match the governor-issued completion token. Re-run verification-complete before closeout.',
    };
  }

  return {
    ok: true,
    progress,
    normalizedEntry,
  };
}

export async function syncWorkflow({ codexHome = defaultCodexHome(), cwd = process.cwd(), progressPath }) {
  const normalizedCwd = resolve(cwd);
  const normalizedProgressPath = resolve(progressPath);
  return withWorkflowLock(codexHome, normalizedCwd, async () => {
    const progress = await readProgress(normalizedProgressPath);
    const validation = await validateGovernedWorkflow(progress, normalizedProgressPath);
    if (!validation.ok) {
      throw new Error(`invalid governed progress:\n${validation.errors.join('\n')}`);
    }

    return withActiveIndexLock(codexHome, async () => {
      const index = await loadActiveIndex(codexHome);
      const existingEntry = index.entries[normalizedCwd] || null;
      const nextEntry = deriveActiveEntry({
        cwd: normalizedCwd,
        progressPath: normalizedProgressPath,
        progress,
        completionToken: existingEntry?.completion_token || randomUUID(),
      });
      const conflictingEntry = findWorkflowOwnershipConflict(index, {
        cwd: normalizedCwd,
        progressPath: nextEntry.progress_path,
        workflowRoot: nextEntry.workflow_root,
      });
      if (conflictingEntry) {
        throw new Error(
          `workflow root ${nextEntry.workflow_root} is already indexed for workspace ${conflictingEntry.cwd}; clear or complete that workflow before reusing it from another workspace.`,
        );
      }
      if (
        progress.status === 'completed'
        && (!existingEntry || normalizeTrackedPath(existingEntry.progress_path) !== nextEntry.progress_path)
      ) {
        throw new Error('completed workflows must transition from an already indexed governed workflow and finalize through verification-complete');
      }
      if (
        progress.status === 'completed'
        && progress.verification?.review?.completion_token !== existingEntry?.completion_token
      ) {
        throw new Error('completed workflow verification provenance does not match the governor-issued completion token. Re-run verification-complete before syncing closeout state.');
      }
      index.entries[normalizedCwd] = nextEntry;

      await saveActiveIndex(index, codexHome);
      return index.entries[normalizedCwd];
    });
  });
}

export async function clearWorkflow({ codexHome = defaultCodexHome(), cwd = process.cwd() }) {
  const normalizedCwd = resolve(cwd);
  return withWorkflowLock(codexHome, normalizedCwd, async () => {
    return withActiveIndexLock(codexHome, async () => {
      const index = await loadActiveIndex(codexHome);
      if (!(normalizedCwd in index.entries)) {
        return false;
      }
      delete index.entries[normalizedCwd];
      await saveActiveIndex(index, codexHome);
      return true;
    });
  });
}

export async function pruneIndexForSessionStart(index, { codexHome = defaultCodexHome() } = {}) {
  let changed = false;
  for (const [cwd, entry] of Object.entries(index.entries)) {
    const inspection = await inspectIndexedWorkflowEntry(entry);
    if (!inspection.ok) {
      continue;
    }

    const { progress, normalizedEntry } = inspection;
    if (shouldArchiveWorkflow(progress)) {
      await archiveWorkflow({
        codexHome,
        cwd,
        entry: normalizedEntry,
        progress,
      });
      delete index.entries[cwd];
      changed = true;
      continue;
    }

    if (JSON.stringify(entry) !== JSON.stringify(normalizedEntry)) {
      index.entries[cwd] = normalizedEntry;
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
    artifacts.results ? `results: ${artifacts.results}` : null,
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

  lines.push('closeout rule: do not stop until progress.json is terminal and, when completed, verification is satisfied with a verifier pass carrying the governor-stamped completion token.');
  return `${lines.join('\n')}\n`;
}

export function renderSessionStartClearNotice(entry, progress) {
  const lines = [
    'Chedex governor kept governed workflow protection after chat clear.',
    'chat history was cleared, but this workspace still has governed workflow state.',
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

  lines.push('closeout rule: governed workflow state is still tracked for this workspace until it is terminal or explicitly cleared, and when completed, verification is satisfied with a verifier pass carrying the governor-stamped completion token.');
  return `${lines.join('\n')}\n`;
}

export function renderSessionStartWarning(reason) {
  return [
    'Chedex governor found governed workflow state for this workspace, but it could not restore it safely.',
    reason,
    'closeout rule: stop will remain blocked until the workflow state is repaired or cleared, and when completed, verification is satisfied with a verifier pass carrying the governor-stamped completion token.',
    '',
  ].join('\n');
}

export async function sessionStartHook({
  codexHome = defaultCodexHome(),
  cwd = process.cwd(),
  source = 'startup',
  releaseAudit = {},
}) {
  const normalizedCwd = resolve(cwd);
  const isClearSource = typeof source === 'string' && source.trim().toLowerCase() === 'clear';
  let workflowContext = '';

  try {
    workflowContext = await withWorkflowLock(codexHome, normalizedCwd, async () => {
      return withActiveIndexLock(codexHome, async () => {
        const loadResult = await loadActiveIndexResult(codexHome);
        if (!loadResult.ok) {
          return renderSessionStartWarning(buildIndexInvalidReason(codexHome, loadResult.error));
        }

        const index = loadResult.index;
        const changed = await pruneIndexForSessionStart(index, { codexHome });
        const entry = index.entries[normalizedCwd];

        if (!entry) {
          if (changed) {
            await saveActiveIndex(index, codexHome);
          }
          return '';
        }

        const inspection = await inspectIndexedWorkflowEntry(entry);
        if (!inspection.ok) {
          if (changed) {
            await saveActiveIndex(index, codexHome);
          }
          return renderSessionStartWarning(inspection.reason);
        }

        const normalizedEntry = inspection.normalizedEntry;
        if (JSON.stringify(entry) !== JSON.stringify(normalizedEntry)) {
          index.entries[normalizedCwd] = normalizedEntry;
        }
        if (changed || JSON.stringify(entry) !== JSON.stringify(normalizedEntry)) {
          await saveActiveIndex(index, codexHome);
        }
        return isClearSource
          ? renderSessionStartClearNotice(normalizedEntry, inspection.progress)
          : renderSessionStartContext(normalizedEntry, inspection.progress);
      });
    });
  } catch (error) {
    workflowContext = renderSessionStartWarning(buildLockBusyReason(codexHome, error, normalizedCwd));
  }

  let releaseAuditContext = '';
  if (!releaseAudit.disabled && process.env.CHEDEX_DISABLE_RELEASE_AUDIT !== '1') {
    const audit = await buildReleaseAudit({
      codexHome,
      now: releaseAudit.now || new Date(),
      readInstalledVersion: releaseAudit.readInstalledVersion,
      getLatestReleaseInfo: releaseAudit.getLatestReleaseInfo,
      getDynamicReleaseDeltas: releaseAudit.getDynamicReleaseDeltas,
    });
    releaseAuditContext = renderReleaseAuditAdvisory(audit);
  }

  if (!releaseAuditContext) {
    return workflowContext;
  }
  return `${workflowContext}\n${releaseAuditContext}`;
}

export async function stopHook({ codexHome = defaultCodexHome(), cwd = process.cwd() }) {
  const normalizedCwd = resolve(cwd);
  try {
    return await withWorkflowLock(codexHome, normalizedCwd, async () => {
      return withActiveIndexLock(codexHome, async () => {
        const loadResult = await loadActiveIndexResult(codexHome);
        if (!loadResult.ok) {
          return {
            action: 'block',
            reason: `Chedex governor blocked stop because the active workflow index is invalid:\n- ${buildIndexInvalidReason(codexHome, loadResult.error)}`,
          };
        }

        const index = loadResult.index;
        const entry = index.entries[normalizedCwd];
        if (!entry) {
          return { action: 'allow' };
        }

        const inspection = await inspectIndexedWorkflowEntry(entry);
        if (!inspection.ok) {
          return {
            action: 'block',
            reason: `Chedex governor blocked stop because ${inspection.reason}`,
          };
        }

        const progress = inspection.progress;
        if (progress.status === ACTIVE_STATUS) {
          const nextStep = typeof progress.next_step === 'string' && progress.next_step.trim()
            ? progress.next_step.trim()
            : 'continue the governed workflow';
          return {
            action: 'block',
            reason: `Chedex governor blocked stop because the workflow is still active in phase ${progress.phase || 'unspecified'}. Next step: ${nextStep}.`,
          };
        }

        if (shouldArchiveWorkflow(progress)) {
          await archiveWorkflow({
            codexHome,
            cwd: normalizedCwd,
            entry: inspection.normalizedEntry,
            progress,
          });
          delete index.entries[normalizedCwd];
          await saveActiveIndex(index, codexHome);
        }

        return { action: 'allow' };
      });
    });
  } catch (error) {
    return {
      action: 'block',
      reason: `Chedex governor blocked stop because it could not safely access governed state:\n- ${buildLockBusyReason(codexHome, error, normalizedCwd)}`,
    };
  }
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
  if (!raw) {
    return {};
  }
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`invalid hook JSON input: ${formatErrorReason(error)}`);
  }
}

export function blockResponse(reason) {
  return JSON.stringify({
    decision: 'block',
    reason,
  });
}

export async function verificationComplete({
  codexHome = defaultCodexHome(),
  cwd = process.cwd(),
  progressPath,
  verdict = 'pass',
  evidenceRef,
  approvedAt = new Date().toISOString(),
}) {
  const normalizedCwd = resolve(cwd);
  const normalizedProgressPath = resolve(progressPath);
  return withWorkflowLock(codexHome, normalizedCwd, async () => {
    return withActiveIndexLock(codexHome, async () => {
      const loadResult = await loadActiveIndexResult(codexHome);
      if (!loadResult.ok) {
        throw new Error(buildIndexInvalidReason(codexHome, loadResult.error));
      }

      const entry = loadResult.index.entries[normalizedCwd];
      if (!entry || normalizeTrackedPath(entry.progress_path) !== normalizeTrackedPath(normalizedProgressPath)) {
        throw new Error('verification-complete requires an active indexed workflow for the same cwd and progress path');
      }

      const progress = await readProgress(normalizedProgressPath);
      if (progress.status !== 'completed') {
        throw new Error('verification-complete only applies to completed workflows');
      }

      const updatedProgress = {
        ...progress,
        updated_at: approvedAt,
        verification: {
          ...progress.verification,
          state: verdict === 'pass' ? VERIFICATION_SATISFIED : 'pending',
          evidence: Array.isArray(progress.verification?.evidence)
            ? [...new Set([...(progress.verification.evidence || []), evidenceRef].filter(Boolean))]
            : evidenceRef ? [evidenceRef] : [],
          review: {
            role: modeSchemaFor(progress.mode)?.completion_review_role || 'verifier',
            verdict,
            evidence_ref: evidenceRef,
            completion_token: entry.completion_token,
            approved_at: approvedAt,
          },
        },
      };

      const validation = await validateGovernedWorkflow(updatedProgress, normalizedProgressPath);
      if (!validation.ok) {
        throw new Error(`invalid governed progress:\n${validation.errors.join('\n')}`);
      }

      await writeJson(normalizedProgressPath, updatedProgress);
      return updatedProgress.verification.review;
    });
  });
}

export async function userPromptSubmitHook({
  codexHome = defaultCodexHome(),
  cwd = process.cwd(),
} = {}) {
  const normalizedCwd = resolve(cwd);

  try {
    return await withWorkflowLock(codexHome, normalizedCwd, async () => {
      return withActiveIndexLock(codexHome, async () => {
        const loadResult = await loadActiveIndexResult(codexHome);
        if (!loadResult.ok) {
          return {
            decision: 'block',
            reason: `Chedex governor blocked prompt submission because the active workflow index is invalid:\n- ${buildIndexInvalidReason(codexHome, loadResult.error)}`,
          };
        }

        const index = loadResult.index;
        const changed = await pruneIndexForSessionStart(index, { codexHome });
        const entry = index.entries[normalizedCwd];

        if (!entry) {
          if (changed) {
            await saveActiveIndex(index, codexHome);
          }
          return { decision: 'allow' };
        }

        const inspection = await inspectIndexedWorkflowEntry(entry);
        if (!inspection.ok) {
          if (changed) {
            await saveActiveIndex(index, codexHome);
          }
          return {
            decision: 'block',
            reason: `Chedex governor blocked prompt submission because ${inspection.reason}`,
          };
        }

        const normalizedEntry = inspection.normalizedEntry;
        if (JSON.stringify(entry) !== JSON.stringify(normalizedEntry)) {
          index.entries[normalizedCwd] = normalizedEntry;
        }
        if (changed || JSON.stringify(entry) !== JSON.stringify(normalizedEntry)) {
          await saveActiveIndex(index, codexHome);
        }

        return { decision: 'allow' };
      });
    });
  } catch (error) {
    return {
      decision: 'block',
      reason: `Chedex governor blocked prompt submission because it could not safely access governed state:\n- ${buildLockBusyReason(codexHome, error, normalizedCwd)}`,
    };
  }
}

async function runCli() {
  const args = parseArgs(process.argv.slice(2));
  const [command] = args._;
  const codexHome = args.codex_home ? resolve(args.codex_home) : defaultCodexHome();

  if (!command) {
    throw new Error('usage: chedex-governor.mjs <session-start|user-prompt-submit|stop|workflow-sync|workflow-clear|verification-complete>');
  }

  switch (command) {
    case 'session-start': {
      let input;
      try {
        input = await readHookInput();
      } catch (error) {
        process.stdout.write(renderSessionStartWarning(formatErrorReason(error)));
        return;
      }
      const output = await sessionStartHook({
        codexHome,
        cwd: input.cwd || process.cwd(),
        source: input.source,
      });
      process.stdout.write(output);
      return;
    }
    case 'stop': {
      let input;
      try {
        input = await readHookInput();
      } catch (error) {
        process.stdout.write(blockResponse(`Chedex governor blocked stop because ${formatErrorReason(error)}`));
        return;
      }
      const verdict = await stopHook({
        codexHome,
        cwd: input.cwd || process.cwd(),
      });
      if (verdict.action === 'block') {
        process.stdout.write(blockResponse(verdict.reason));
      }
      return;
    }
    case 'user-prompt-submit': {
      let input;
      try {
        input = await readHookInput();
      } catch (error) {
        process.stdout.write(blockResponse(`Chedex governor blocked prompt submission because ${formatErrorReason(error)}`));
        return;
      }
      const verdict = await userPromptSubmitHook({
        codexHome,
        cwd: input.cwd || process.cwd(),
      });
      if (verdict.decision === 'block') {
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
    case 'verification-complete': {
      if (!args.progress) {
        throw new Error('--progress is required for verification-complete');
      }
      if (!args.cwd) {
        throw new Error('--cwd is required for verification-complete');
      }
      if (!args.evidence_ref) {
        throw new Error('--evidence-ref is required for verification-complete');
      }
      const review = await verificationComplete({
        codexHome,
        cwd: args.cwd,
        progressPath: args.progress,
        verdict: args.verdict || 'pass',
        evidenceRef: args.evidence_ref,
        approvedAt: args.approved_at || new Date().toISOString(),
      });
      process.stdout.write(`${JSON.stringify(review, null, 2)}\n`);
      return;
    }
    default:
      throw new Error(`unknown command: ${command}`);
  }
}

const isMain = process.argv[1] && normalizeTrackedPath(process.argv[1]) === normalizeTrackedPath(fileURLToPath(import.meta.url));
if (isMain) {
  runCli().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  });
}
