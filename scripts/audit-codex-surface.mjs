import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  chedexHooksFeature,
  chedexHooksFeatureAliases,
  chedexMinimumCodexVersion,
  chedexMultiAgentFeature,
  chedexRequiredFeatureStage,
  compareSemver,
  formatCodexFeatureStatus,
  parseSemver,
  readCodexFeatures,
  readCodexVersion,
  resolveCodexFeature,
} from './lib.mjs';

const skipSchema = process.argv.includes('--skip-schema');

const requiredFeatureChecks = [
  {
    feature: chedexHooksFeature,
    aliases: chedexHooksFeatureAliases,
    requiredStage: chedexRequiredFeatureStage,
    reason: 'Chedex lifecycle governor hooks',
  },
  {
    feature: chedexMultiAgentFeature,
    requiredStage: chedexRequiredFeatureStage,
    reason: 'Chedex native role registry',
  },
];

const optionalReleaseFeatureChecks = [
  {
    feature: 'goals',
    surface: 'persisted /goal workflows',
  },
  {
    feature: 'browser_use_external',
    surface: 'external browser-use integration',
  },
  {
    feature: 'builtin_mcp',
    surface: 'product-owned built-in MCP servers',
  },
  {
    feature: 'auth_elicitation',
    surface: 'Codex Apps auth elicitation',
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
  {
    feature: 'remote_compaction_v2',
    surface: 'remote compaction v2 request path',
  },
  {
    feature: 'responses_websocket_response_processed',
    surface: 'Responses websocket response.processed notification',
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
    file: 'v2/HooksListResponse.json',
    surface: 'hook list, toggle, trust, and compact event metadata',
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
    file: 'v2/PluginShareSaveParams.json',
    surface: 'plugin sharing save API',
  },
  {
    file: 'v2/PluginShareListParams.json',
    surface: 'plugin sharing list API',
  },
  {
    file: 'v2/PluginSkillReadParams.json',
    surface: 'remote plugin skill read API',
  },
  {
    file: 'v2/ProcessSpawnParams.json',
    surface: 'app-server process spawn API',
  },
  {
    file: 'v2/WindowsSandboxReadinessResponse.json',
    surface: 'Windows sandbox readiness API',
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

const schemaContentChecks = [
  {
    file: 'v2/HooksListResponse.json',
    snippets: ['preCompact', 'postCompact', 'HookTrustStatus', 'currentHash'],
    surface: '0.129 hook compact and trust metadata',
  },
  {
    file: 'v2/PluginListParams.json',
    snippets: ['marketplaceKinds', 'workspace-directory', 'shared-with-me'],
    surface: '0.129 plugin marketplace source filtering',
  },
  {
    file: 'v2/PluginListResponse.json',
    snippets: ['PluginAvailability', 'PluginShareContext', 'keywords'],
    surface: '0.129 plugin availability and share metadata',
  },
  {
    file: 'v2/ProcessSpawnParams.json',
    snippets: ['processHandle', 'streamStdoutStderr', 'timeoutMs'],
    surface: '0.129 app-server process spawn contract',
  },
  {
    file: 'v2/ThreadReadResponse.json',
    snippets: ['sessionId', 'threadSource', 'itemsView'],
    surface: '0.129 thread history metadata',
  },
];

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

    const missingFiles = schemaChecks
      .filter((check) => !existsSync(join(schemaRoot, check.file)))
      .map((check) => check.file);
    const missingContent = [];

    for (const check of schemaContentChecks) {
      const path = join(schemaRoot, check.file);
      if (!existsSync(path)) {
        missingContent.push(`${check.file}:missing`);
        continue;
      }
      const content = readFileSync(path, 'utf8');
      const missingSnippets = check.snippets.filter((snippet) => !content.includes(snippet));
      if (missingSnippets.length > 0) {
        missingContent.push(`${check.file}:${missingSnippets.join('+')}`);
      }
    }

    const missing = [...missingFiles, ...missingContent];

    return {
      ok: missing.length === 0,
      checked: schemaChecks.length + schemaContentChecks.length,
      missing,
    };
  } catch (error) {
    return {
      ok: false,
      checked: schemaChecks.length + schemaContentChecks.length,
      missing: [
        ...schemaChecks.map((check) => check.file),
        ...schemaContentChecks.map((check) => check.file),
      ],
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
  const current = resolveCodexFeature(features, check.feature, check.aliases);
  requiredFeatureStatuses.push(formatCodexFeatureStatus(features, check.feature, check.aliases));
  if (!current) {
    const accepted = [check.feature, ...(check.aliases || [])].join(', ');
    failures.push(`missing required feature ${check.feature}: ${check.reason}; accepted keys: ${accepted}`);
    continue;
  }
  if (current.feature.stage !== check.requiredStage) {
    failures.push(`required feature ${check.feature} should be ${check.requiredStage}; got ${current.feature.stage}`);
  }
  if (!current.feature.enabled) {
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
  failures.push(`app-server schema missing verified Codex surfaces: ${schemaResult.missing.join(', ')}`);
}

const optionalFeatureStatuses = optionalReleaseFeatureChecks.map((check) => formatCodexFeatureStatus(features, check.feature));
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
