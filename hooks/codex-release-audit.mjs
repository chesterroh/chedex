import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

export const RELEASE_AUDIT_SCHEMA_VERSION = 1;
export const RELEASE_DELTA_SCHEMA_VERSION = 1;
export const DEFAULT_RELEASE_AUDIT_TIMEOUT_MS = 1500;
export const DEFAULT_RELEASE_AUDIT_CACHE_TTL_MS = 12 * 60 * 60 * 1000;
export const CODEX_PACKAGE_REGISTRY_URL = 'https://registry.npmjs.org/@openai%2Fcodex';
export const CODEX_CHANGELOG_URL = 'https://developers.openai.com/codex/changelog/';
export const CODEX_RELEASE_DELTAS_URL = 'https://raw.githubusercontent.com/chesterroh/chedex/main/hooks/codex-release-deltas.json';
export const CHEDEX_RELEASE_DELTA_COMPAT_VERSION = '0.124.0';

export function defaultCodexHome() {
  return process.env.CODEX_HOME || join(homedir(), '.codex');
}

export function releaseAuditCachePath(codexHome = defaultCodexHome()) {
  return join(codexHome, 'workflows', '_codex_release_audit.json');
}

export function releaseDeltaCachePath(codexHome = defaultCodexHome()) {
  return join(codexHome, 'workflows', '_codex_release_deltas.json');
}

export function parseSemver(text) {
  const match = String(text).match(/(\d+)\.(\d+)\.(\d+)/);
  if (!match) {
    return null;
  }
  return match.slice(1).map((value) => Number.parseInt(value, 10));
}

export function compareSemver(left, right) {
  for (let i = 0; i < Math.max(left.length, right.length); i += 1) {
    const a = left[i] || 0;
    const b = right[i] || 0;
    if (a > b) return 1;
    if (a < b) return -1;
  }
  return 0;
}

export async function readJsonIfExists(path, fallback = null) {
  try {
    const text = await readFile(path, 'utf8');
    return JSON.parse(text);
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return fallback;
    }
    throw error;
  }
}

export async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

export function normalizeInstalledVersion(raw) {
  const semver = parseSemver(raw);
  if (!semver) {
    throw new Error(`unable to parse codex version from: ${String(raw).trim()}`);
  }

  return {
    raw: String(raw).trim(),
    normalized: semver.join('.'),
    semver,
  };
}

export function readInstalledCodexVersion({ execFileSyncImpl = execFileSync } = {}) {
  const stdout = execFileSyncImpl('codex', ['--version'], { encoding: 'utf8' });
  return normalizeInstalledVersion(stdout);
}

function normalizeDelta(delta) {
  if (!delta || typeof delta !== 'object' || Array.isArray(delta)) {
    return null;
  }

  if (!parseSemver(delta.since)) {
    return null;
  }

  if (typeof delta.summary !== 'string' || !delta.summary.trim()) {
    return null;
  }

  if (!Array.isArray(delta.checks) || delta.checks.some((check) => typeof check !== 'string' || !check.trim())) {
    return null;
  }

  return {
    since: delta.since.trim(),
    summary: delta.summary.trim(),
    checks: delta.checks.map((check) => check.trim()),
  };
}

export function normalizeReleaseAuditCache(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }

  const latestVersion = typeof raw.latest_version === 'string' ? raw.latest_version.trim() : '';
  const checkedAt = typeof raw.checked_at === 'string' ? raw.checked_at.trim() : '';
  if (!parseSemver(latestVersion) || !checkedAt) {
    return null;
  }

  return {
    schema_version: RELEASE_AUDIT_SCHEMA_VERSION,
    latest_version: latestVersion,
    published_at: typeof raw.published_at === 'string' ? raw.published_at : null,
    checked_at: checkedAt,
    source: typeof raw.source === 'string' ? raw.source : 'npm-registry',
    stale: Boolean(raw.stale),
  };
}

export function normalizeReleaseDeltaBundle(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }

  const deltas = Array.isArray(raw.deltas)
    ? raw.deltas.map(normalizeDelta).filter(Boolean)
    : [];
  if (deltas.length === 0) {
    return null;
  }

  return {
    schema_version: RELEASE_DELTA_SCHEMA_VERSION,
    deltas,
    checked_at: typeof raw.checked_at === 'string' ? raw.checked_at : null,
    source: typeof raw.source === 'string' ? raw.source : null,
    min_chedex_version: typeof raw.min_chedex_version === 'string' && parseSemver(raw.min_chedex_version)
      ? raw.min_chedex_version
      : null,
    max_chedex_version: typeof raw.max_chedex_version === 'string' && parseSemver(raw.max_chedex_version)
      ? raw.max_chedex_version
      : null,
    stale: Boolean(raw.stale),
  };
}

export function isReleaseDeltaBundleCompatible(
  bundle,
  chedexVersion = CHEDEX_RELEASE_DELTA_COMPAT_VERSION,
) {
  const current = parseSemver(chedexVersion);
  if (!bundle || !current) return false;
  const min = bundle.min_chedex_version ? parseSemver(bundle.min_chedex_version) : null;
  const max = bundle.max_chedex_version ? parseSemver(bundle.max_chedex_version) : null;
  if (min && compareSemver(current, min) < 0) return false;
  if (max && compareSemver(current, max) > 0) return false;
  return true;
}

export async function readReleaseAuditCache(codexHome = defaultCodexHome()) {
  const cache = await readJsonIfExists(releaseAuditCachePath(codexHome), null);
  return normalizeReleaseAuditCache(cache);
}

export async function readReleaseDeltaCache(codexHome = defaultCodexHome()) {
  const cache = await readJsonIfExists(releaseDeltaCachePath(codexHome), null);
  return normalizeReleaseDeltaBundle(cache);
}

export async function writeReleaseAuditCache(codexHome, payload) {
  await writeJson(releaseAuditCachePath(codexHome), {
    schema_version: RELEASE_AUDIT_SCHEMA_VERSION,
    ...payload,
  });
}

export async function writeReleaseDeltaCache(codexHome, payload) {
  await writeJson(releaseDeltaCachePath(codexHome), {
    schema_version: RELEASE_DELTA_SCHEMA_VERSION,
    ...payload,
  });
}

async function fetchJsonWithTimeout({
  fetchImpl = globalThis.fetch,
  url,
  timeoutMs = DEFAULT_RELEASE_AUDIT_TIMEOUT_MS,
}) {
  if (typeof fetchImpl !== 'function') {
    throw new Error('fetch is unavailable for release audit');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(url, {
      headers: {
        accept: 'application/json',
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`request failed with status ${response.status}`);
    }

    return response.json();
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchLatestCodexRelease({
  fetchImpl = globalThis.fetch,
  registryUrl = CODEX_PACKAGE_REGISTRY_URL,
  timeoutMs = DEFAULT_RELEASE_AUDIT_TIMEOUT_MS,
  now = new Date(),
} = {}) {
  const payload = await fetchJsonWithTimeout({
    fetchImpl,
    url: registryUrl,
    timeoutMs,
  });
  const latestVersion = payload?.['dist-tags']?.latest;
  const parsedLatestVersion = parseSemver(latestVersion);
  if (!parsedLatestVersion) {
    throw new Error('registry payload did not include a valid latest Codex version');
  }

  return {
    latest_version: parsedLatestVersion.join('.'),
    published_at: payload?.time?.[latestVersion] || null,
    checked_at: now.toISOString(),
    source: 'npm-registry',
  };
}

export async function fetchReleaseDeltas({
  fetchImpl = globalThis.fetch,
  deltasUrl = CODEX_RELEASE_DELTAS_URL,
  timeoutMs = DEFAULT_RELEASE_AUDIT_TIMEOUT_MS,
  now = new Date(),
} = {}) {
  const payload = normalizeReleaseDeltaBundle(await fetchJsonWithTimeout({
    fetchImpl,
    url: deltasUrl,
    timeoutMs,
  }));

  if (!payload) {
    throw new Error('release delta payload was invalid');
  }
  if (!isReleaseDeltaBundleCompatible(payload)) {
    throw new Error('release delta payload is incompatible with this Chedex version');
  }

  return {
    schema_version: RELEASE_DELTA_SCHEMA_VERSION,
    deltas: payload.deltas,
    checked_at: now.toISOString(),
    source: deltasUrl,
    min_chedex_version: payload.min_chedex_version,
    max_chedex_version: payload.max_chedex_version,
  };
}

export async function readBundledReleaseDeltas() {
  const bundled = normalizeReleaseDeltaBundle(JSON.parse(
    await readFile(new URL('./codex-release-deltas.json', import.meta.url), 'utf8'),
  ));
  if (!bundled) {
    throw new Error('bundled release deltas are invalid');
  }
  return bundled;
}

export function isFreshReleaseAudit(cache, { now = new Date(), ttlMs = DEFAULT_RELEASE_AUDIT_CACHE_TTL_MS } = {}) {
  if (!cache?.checked_at) {
    return false;
  }

  const checkedAt = new Date(cache.checked_at);
  if (Number.isNaN(checkedAt.getTime())) {
    return false;
  }

  return now.getTime() - checkedAt.getTime() <= ttlMs;
}

export async function getLatestCodexReleaseInfo({
  codexHome = defaultCodexHome(),
  now = new Date(),
  cacheTtlMs = DEFAULT_RELEASE_AUDIT_CACHE_TTL_MS,
  fetchLatest = fetchLatestCodexRelease,
} = {}) {
  const cached = await readReleaseAuditCache(codexHome);
  if (cached && isFreshReleaseAudit(cached, { now, ttlMs: cacheTtlMs })) {
    return cached;
  }

  try {
    const refreshed = await fetchLatest({ now });
    await writeReleaseAuditCache(codexHome, refreshed);
    return refreshed;
  } catch (error) {
    if (cached) {
      return {
        ...cached,
        stale: true,
        fetch_error: error.message,
      };
    }
    return null;
  }
}

export async function getReleaseDeltas({
  codexHome = defaultCodexHome(),
  now = new Date(),
  cacheTtlMs = DEFAULT_RELEASE_AUDIT_CACHE_TTL_MS,
  fetchDynamicDeltas = fetchReleaseDeltas,
  readBundledDeltas = readBundledReleaseDeltas,
} = {}) {
  let cached = null;
  try {
    cached = await readReleaseDeltaCache(codexHome);
    if (cached && isReleaseDeltaBundleCompatible(cached) && isFreshReleaseAudit(cached, { now, ttlMs: cacheTtlMs })) {
      return cached;
    }
  } catch {
    cached = null;
  }

  try {
    const refreshed = await fetchDynamicDeltas({ now });
    if (!isReleaseDeltaBundleCompatible(refreshed)) {
      throw new Error('release delta payload is incompatible with this Chedex version');
    }
    await writeReleaseDeltaCache(codexHome, refreshed);
    return refreshed;
  } catch (error) {
    if (cached && isReleaseDeltaBundleCompatible(cached)) {
      return {
        ...cached,
        stale: true,
        fetch_error: error.message,
      };
    }
    try {
      return {
        ...(await readBundledDeltas()),
        checked_at: now.toISOString(),
        source: 'bundled',
        stale: true,
        fetch_error: error.message,
      };
    } catch {
      return {
        schema_version: RELEASE_DELTA_SCHEMA_VERSION,
        deltas: [],
        checked_at: now.toISOString(),
        source: 'unavailable',
        stale: true,
        fetch_error: error.message,
      };
    }
  }
}

export function collectKnownReleaseDeltas({ installedVersion, latestVersion, deltas = [] }) {
  const installed = parseSemver(installedVersion);
  const latest = parseSemver(latestVersion);
  if (!installed || !latest) {
    return [];
  }

  return deltas.filter((delta) => {
    const since = parseSemver(delta.since);
    return since && compareSemver(installed, since) < 0 && compareSemver(since, latest) <= 0;
  });
}

export function buildUpgradeSteps({ latestVersion, deltaNotes }) {
  const steps = [
    `Upgrade Codex CLI to ${latestVersion} using your normal installation path.`,
    'Re-run `npm run verify` inside the Chedex repo.',
  ];

  for (const delta of deltaNotes) {
    for (const check of delta.checks) {
      if (!steps.includes(check)) {
        steps.push(check);
      }
    }
  }

  return steps;
}

export async function buildReleaseAudit({
  codexHome = defaultCodexHome(),
  now = new Date(),
  readInstalledVersion = readInstalledCodexVersion,
  getLatestReleaseInfo = getLatestCodexReleaseInfo,
  getDynamicReleaseDeltas = getReleaseDeltas,
} = {}) {
  let installed;
  try {
    installed = await readInstalledVersion();
  } catch {
    return null;
  }

  let latest;
  try {
    latest = await getLatestReleaseInfo({ codexHome, now });
  } catch {
    return null;
  }

  if (!latest?.latest_version || !parseSemver(latest.latest_version)) {
    return null;
  }

  let releaseDeltas = null;
  try {
    releaseDeltas = await getDynamicReleaseDeltas({ codexHome, now });
  } catch {
    releaseDeltas = null;
  }

  if (compareSemver(installed.semver, parseSemver(latest.latest_version)) >= 0) {
    return {
      state: 'current',
      installed_version: installed.normalized,
      latest_version: latest.latest_version,
      latest_published_at: latest.published_at,
      checked_at: latest.checked_at,
      source: latest.source,
      stale: Boolean(latest.stale),
      delta_source: releaseDeltas?.source || 'unavailable',
      delta_stale: Boolean(releaseDeltas?.stale),
    };
  }

  const deltaNotes = collectKnownReleaseDeltas({
    installedVersion: installed.normalized,
    latestVersion: latest.latest_version,
    deltas: releaseDeltas?.deltas || [],
  });

  return {
    state: 'outdated',
    installed_version: installed.normalized,
    latest_version: latest.latest_version,
    latest_published_at: latest.published_at,
    checked_at: latest.checked_at,
    source: latest.source,
    stale: Boolean(latest.stale),
    delta_source: releaseDeltas?.source || 'unavailable',
    delta_stale: Boolean(releaseDeltas?.stale),
    delta_notes: deltaNotes,
    upgrade_steps: buildUpgradeSteps({
      latestVersion: latest.latest_version,
      deltaNotes,
    }),
  };
}

export function renderReleaseAuditAdvisory(audit) {
  if (!audit || audit.state !== 'outdated') {
    return '';
  }

  const lines = [
    'Chedex release audit detected a newer Codex CLI release.',
    `installed_codex: ${audit.installed_version}`,
    `latest_codex: ${audit.latest_version}`,
  ];

  if (audit.latest_published_at) {
    lines.push(`latest_published_at: ${audit.latest_published_at}`);
  }

  if (audit.stale) {
    lines.push('note: latest release metadata came from a stale cache because the live refresh failed.');
  }

  if (audit.delta_stale) {
    lines.push(`note: release delta guidance came from a stale or bundled source: ${audit.delta_source}.`);
  }

  if (Array.isArray(audit.delta_notes) && audit.delta_notes.length > 0) {
    lines.push('known_delta:');
    for (const delta of audit.delta_notes) {
      lines.push(`- ${delta.summary}`);
    }
  }

  if (Array.isArray(audit.upgrade_steps) && audit.upgrade_steps.length > 0) {
    lines.push('upgrade_plan:');
    for (const step of audit.upgrade_steps) {
      lines.push(`- ${step}`);
    }
  }

  lines.push(`changelog: ${CODEX_CHANGELOG_URL}`);
  return `${lines.join('\n')}\n`;
}
