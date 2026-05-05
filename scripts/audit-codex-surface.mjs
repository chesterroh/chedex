import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  chedexMinimumCodexVersion,
  compareSemver,
  parseSemver,
  readCodexFeatures,
  readCodexVersion,
} from './lib.mjs';

const skipSchema = process.argv.includes('--skip-schema');

const requiredFeatureChecks = [
  {
    feature: 'codex_hooks',
    requiredStage: 'stable',
    reason: 'Chedex lifecycle governor hooks',
  },
  {
    feature: 'multi_agent',
    requiredStage: 'stable',
    reason: 'Chedex native role registry',
  },
];

const optionalReleaseFeatureChecks = [
  {
    feature: 'goals',
    surface: 'persisted /goal workflows',
  },
  {
    feature: 'plugin_hooks',
    surface: 'plugin-bundled hooks and hook enablement state',
  },
  {
    feature: 'external_migration',
    surface: 'external-agent config/session import',
  },
  {
    feature: 'multi_agent_v2',
    surface: 'MultiAgentV2 thread/depth controls',
  },
  {
    feature: 'remote_plugin',
    surface: 'remote plugin bundle/cache flows',
  },
  {
    feature: 'request_permissions_tool',
    surface: 'model-visible permission requests',
  },
  {
    feature: 'exec_permission_approvals',
    surface: 'permission approval plumbing',
  },
];

const commandChecks = [
  {
    id: 'codex_update',
    args: ['update', '--help'],
    snippets: ['Usage: codex update'],
  },
  {
    id: 'plugin_marketplace',
    args: ['plugin', 'marketplace', '--help'],
    snippets: ['add', 'upgrade', 'remove'],
  },
  {
    id: 'app_server_json_schema',
    args: ['app-server', 'generate-json-schema', '--help'],
    snippets: ['--out <DIR>', '--experimental'],
  },
  {
    id: 'app_server_ts_bindings',
    args: ['app-server', 'generate-ts', '--help'],
    snippets: ['--out <DIR>', '--experimental'],
  },
  {
    id: 'permission_profile_cli',
    args: ['--help'],
    snippets: ['--profile <CONFIG_PROFILE>', '--sandbox <SANDBOX_MODE>', '--cd <DIR>'],
  },
  {
    id: 'exec_json_usage',
    args: ['exec', '--help'],
    snippets: ['--json'],
  },
];

const schemaChecks = [
  {
    file: 'v2/ThreadGoalSetParams.json',
    surface: 'thread goal set API',
  },
  {
    file: 'v2/ThreadGoalClearParams.json',
    surface: 'thread goal clear API',
  },
  {
    file: 'v2/MarketplaceAddParams.json',
    surface: 'marketplace add API',
  },
  {
    file: 'v2/MarketplaceUpgradeParams.json',
    surface: 'marketplace upgrade API',
  },
  {
    file: 'v2/MarketplaceRemoveParams.json',
    surface: 'marketplace remove API',
  },
  {
    file: 'v2/PluginInstallParams.json',
    surface: 'plugin install API',
  },
  {
    file: 'v2/PluginUninstallParams.json',
    surface: 'plugin uninstall API',
  },
  {
    file: 'v2/ExternalAgentConfigImportParams.json',
    surface: 'external-agent config import API',
  },
  {
    file: 'PermissionsRequestApprovalParams.json',
    surface: 'permission approval request schema',
  },
  {
    file: 'v2/ThreadMetadataUpdateParams.json',
    surface: 'thread metadata and subagent hints',
  },
];

function formatFeatureStatus(features, feature) {
  const current = features[feature];
  if (!current) {
    return `${feature}:missing:false`;
  }
  return `${feature}:${current.stage}:${current.enabled ? 'true' : 'false'}`;
}

function checkCommand({ id, args, snippets }) {
  try {
    const stdout = execFileSync('codex', args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const missing = snippets.filter((snippet) => !stdout.includes(snippet));
    return {
      id,
      ok: missing.length === 0,
      missing,
    };
  } catch (error) {
    return {
      id,
      ok: false,
      missing: snippets,
      error: error.stderr || error.message,
    };
  }
}

async function checkAppServerSchema() {
  const schemaRoot = await mkdtemp(join(tmpdir(), 'chedex-codex-schema-'));
  try {
    execFileSync('codex', ['app-server', 'generate-json-schema', '--experimental', '--out', schemaRoot], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const missing = schemaChecks
      .filter((check) => !existsSync(join(schemaRoot, check.file)))
      .map((check) => check.file);

    return {
      ok: missing.length === 0,
      checked: schemaChecks.length,
      missing,
    };
  } catch (error) {
    return {
      ok: false,
      checked: schemaChecks.length,
      missing: schemaChecks.map((check) => check.file),
      error: error.stderr || error.message,
    };
  } finally {
    await rm(schemaRoot, { recursive: true, force: true });
  }
}

const failures = [];
const installed = readCodexVersion();
const installedSemver = installed.version;
const minimumSemver = parseSemver(chedexMinimumCodexVersion);
const features = readCodexFeatures();

if (!minimumSemver || compareSemver(installedSemver, minimumSemver) < 0) {
  failures.push(`codex ${installed.raw} is older than required ${chedexMinimumCodexVersion}`);
}

const requiredFeatureStatuses = [];
for (const check of requiredFeatureChecks) {
  const current = features[check.feature];
  requiredFeatureStatuses.push(formatFeatureStatus(features, check.feature));
  if (!current) {
    failures.push(`missing required feature ${check.feature}: ${check.reason}`);
    continue;
  }
  if (current.stage !== check.requiredStage) {
    failures.push(`required feature ${check.feature} should be ${check.requiredStage}; got ${current.stage}`);
  }
  if (!current.enabled) {
    failures.push(`required feature ${check.feature} is disabled: ${check.reason}`);
  }
}

const commandResults = commandChecks.map(checkCommand);
for (const result of commandResults) {
  if (!result.ok) {
    failures.push(`missing Codex CLI surface ${result.id}: ${result.missing.join(', ')}`);
  }
}

const schemaResult = skipSchema
  ? { ok: true, checked: 0, missing: [], skipped: true }
  : await checkAppServerSchema();
if (!schemaResult.ok) {
  failures.push(`app-server schema missing 0.128 surfaces: ${schemaResult.missing.join(', ')}`);
}

const optionalFeatureStatuses = optionalReleaseFeatureChecks.map((check) => formatFeatureStatus(features, check.feature));
const optionalDisabled = optionalReleaseFeatureChecks
  .filter((check) => features[check.feature] && !features[check.feature].enabled)
  .map((check) => `${check.feature}(${check.surface})`);
const optionalMissing = optionalReleaseFeatureChecks
  .filter((check) => !features[check.feature])
  .map((check) => `${check.feature}(${check.surface})`);

const lines = [
  `codex_surface_audit=${failures.length === 0 ? 'ok' : 'fail'}`,
  `codex_version=${installed.raw}`,
  `required_features=${requiredFeatureStatuses.join(',')}`,
  `optional_release_features=${optionalFeatureStatuses.join(',')}`,
  `optional_disabled=${optionalDisabled.length ? optionalDisabled.join(',') : 'none'}`,
  `optional_missing=${optionalMissing.length ? optionalMissing.join(',') : 'none'}`,
  `command_checks=${commandResults.map((result) => `${result.id}:${result.ok ? 'ok' : 'fail'}`).join(',')}`,
  `app_server_schema=${schemaResult.skipped ? 'skipped' : schemaResult.ok ? `ok:${schemaResult.checked}` : `fail:${schemaResult.missing.join(',')}`}`,
];

process.stdout.write(`${lines.join('\n')}\n`);

if (failures.length > 0) {
  process.stderr.write(`codex surface audit failed:\n- ${failures.join('\n- ')}\n`);
  process.exitCode = 1;
}
