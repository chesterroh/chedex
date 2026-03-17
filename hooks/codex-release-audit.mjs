import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

export const RELEASE_AUDIT_SCHEMA_VERSION = 1;
export const DEFAULT_RELEASE_AUDIT_TIMEOUT_MS = 1500;
export const DEFAULT_RELEASE_AUDIT_CACHE_TTL_MS = 12 * 60 * 60 * 1000;
export const CODEX_PACKAGE_REGISTRY_URL = 'https://registry.npmjs.org/@openai%2Fcodex';
export const CODEX_CHANGELOG_URL = 'https://developers.openai.com/codex/changelog/';

export const KNOWN_CODEX_RELEASE_DELTAS = [
  {
    since: '0.115.0',
    summary: 'Codex 0.115.x changes the visible feature surface and promotes `multi_agent` to stable.',
    checks: [
      'Re-run `npm run verify` after upgrading Codex CLI.',
      'Recheck `hooks.json` and the `SessionStart` / `Stop` hook smoke path after upgrading.',
      'Reinstall Chedex with `npm run install:user` if the hook runtime or managed hook config changed.',
    ],
  },
];

export function defaultCodexHome() {
  return process.env.CODEX_HOME || join(homedir(), '.codex');
}

export function releaseAuditCachePath(codexHome = defaultCodexHome()) {
  return join(codexHome, 'workflows', '_codex_release_audit.json');
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

export async function readReleaseAuditCache(codexHome = defaultCodexHome()) {
  const cache = await readJsonIfExists(releaseAuditCachePath(codexHome), null);
  return normalizeReleaseAuditCache(cache);
}

export async function writeReleaseAuditCache(codexHome, payload) {
  await writeJson(releaseAuditCachePath(codexHome), {
    schema_version: RELEASE_AUDIT_SCHEMA_VERSION,
    ...payload,
  });
}

export async function fetchLatestCodexRelease({
  fetchImpl = globalThis.fetch,
  registryUrl = CODEX_PACKAGE_REGISTRY_URL,
  timeoutMs = DEFAULT_RELEASE_AUDIT_TIMEOUT_MS,
  now = new Date(),
} = {}) {
  if (typeof fetchImpl !== 'function') {
    throw new Error('fetch is unavailable for release audit');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(registryUrl, {
      headers: {
        accept: 'application/json',
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`registry request failed with status ${response.status}`);
    }

    const payload = await response.json();
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
  } finally {
    clearTimeout(timeout);
  }
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

export function collectKnownReleaseDeltas({ installedVersion, latestVersion }) {
  const installed = parseSemver(installedVersion);
  const latest = parseSemver(latestVersion);
  if (!installed || !latest) {
    return [];
  }

  return KNOWN_CODEX_RELEASE_DELTAS.filter((delta) => {
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

  if (compareSemver(installed.semver, parseSemver(latest.latest_version)) >= 0) {
    return {
      state: 'current',
      installed_version: installed.normalized,
      latest_version: latest.latest_version,
      latest_published_at: latest.published_at,
      checked_at: latest.checked_at,
      source: latest.source,
      stale: Boolean(latest.stale),
    };
  }

  const deltaNotes = collectKnownReleaseDeltas({
    installedVersion: installed.normalized,
    latestVersion: latest.latest_version,
  });

  return {
    state: 'outdated',
    installed_version: installed.normalized,
    latest_version: latest.latest_version,
    latest_published_at: latest.published_at,
    checked_at: latest.checked_at,
    source: latest.source,
    stale: Boolean(latest.stale),
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
