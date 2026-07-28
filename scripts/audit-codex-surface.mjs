import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  chedexLatestVerifiedCodexVersion,
  chedexMinimumCodexVersion,
  compareSemver,
  formatCodexFeatureStatus,
  parseSemver,
  readCodexFeatures,
  readCodexVersion,
  resolveCodexFeature,
} from './lib.mjs';

const skipSchema = process.argv.includes('--skip-schema');
const versionText = readCodexVersion();
const version = parseSemver(versionText);
const features = readCodexFeatures();
const failures = [];
const advisories = [];

if (!version) failures.push(`unable to parse Codex version from ${versionText || 'empty output'}`);
else if (compareSemver(version, chedexMinimumCodexVersion) < 0) {
  failures.push(`Codex ${versionText} is older than required ${chedexMinimumCodexVersion}`);
}

for (const check of [
  { name: 'goals', reason: 'native long-running work' },
  { name: 'multi_agent', reason: 'native subagents and custom agent routing' },
]) {
  const feature = resolveCodexFeature(features, check.name);
  if (!feature || feature.stage !== 'stable' || !feature.enabled) {
    failures.push(`${check.reason} requires ${check.name}:stable:true; found ${formatCodexFeatureStatus(feature)}`);
  }
}

const hooks = resolveCodexFeature(features, 'hooks', ['codex_hooks']);
if (!hooks || hooks.stage !== 'stable') advisories.push(`hooks surface is ${formatCodexFeatureStatus(hooks)}`);

function commandOutput(args) {
  try {
    return execFileSync('codex', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (error) {
    return `${error.stdout || ''}\n${error.stderr || ''}`;
  }
}

const commandChecks = [
  { id: 'update', args: ['update', '--help'], all: ['Usage: codex update'] },
  { id: 'doctor', args: ['doctor', '--help'], all: ['Usage: codex doctor'] },
  { id: 'schema', args: ['app-server', 'generate-json-schema', '--help'], all: ['--out <DIR>', '--experimental'] },
  { id: 'exec_json', args: ['exec', '--help'], all: ['--json'] },
  {
    id: 'permission_profile',
    args: ['--help'],
    all: ['--sandbox <SANDBOX_MODE>', '--cd <DIR>'],
    any: ['--profile <CONFIG_PROFILE_V2>', '--profile <CONFIG_PROFILE>'],
  },
];
const commandResults = [];
for (const check of commandChecks) {
  const output = commandOutput(check.args);
  const missingAll = (check.all || []).filter((snippet) => !output.includes(snippet));
  const anyOk = !check.any || check.any.some((snippet) => output.includes(snippet));
  const ok = missingAll.length === 0 && anyOk;
  commandResults.push({ id: check.id, ok });
  if (!ok) failures.push(`Codex command surface ${check.id} is missing expected help markers`);
}

const schemaChecks = [
  ['v2/ThreadGoalSetParams.json', 'native goal set API'],
  ['v2/ThreadGoalClearParams.json', 'native goal clear API'],
  ['v2/HooksListResponse.json', 'native hook metadata'],
  ['v2/ThreadStartParams.json', 'thread and collaboration settings'],
  ['v2/SkillsListResponse.json', 'native skill discovery'],
  ['v2/ExternalAgentConfigImportParams.json', 'external-agent migration'],
  ['v2/PermissionProfileListResponse.json', 'native permission profiles'],
];
const schemaResults = [];
if (!skipSchema) {
  const schemaDir = await mkdtemp(join(tmpdir(), 'chedex-codex-schema-'));
  try {
    execFileSync('codex', ['app-server', 'generate-json-schema', '--experimental', '--out', schemaDir], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    for (const [relativePath, surface] of schemaChecks) {
      const ok = existsSync(join(schemaDir, relativePath));
      schemaResults.push({ relativePath, ok });
      if (!ok) failures.push(`missing ${surface}: ${relativePath}`);
    }
  } catch (error) {
    failures.push(`unable to generate app-server schema: ${error.message}`);
  } finally {
    await rm(schemaDir, { recursive: true, force: true });
  }
}

const optionalFeatures = [
  'auth_elicitation',
  'multi_agent_v2',
  'remote_plugin',
  'remote_compaction_v2',
  'request_permissions_tool',
  'exec_permission_approvals',
].map((name) => {
  const feature = resolveCodexFeature(features, name);
  return [name, feature ? `${feature.stage}:${feature.enabled}` : 'missing'];
});

process.stdout.write([
  `codex_version=${versionText}`,
  `minimum=${chedexMinimumCodexVersion}`,
  `latest_verified=${chedexLatestVerifiedCodexVersion}`,
  `goals=${formatCodexFeatureStatus(resolveCodexFeature(features, 'goals'))}`,
  `multi_agent=${formatCodexFeatureStatus(resolveCodexFeature(features, 'multi_agent'))}`,
  `hooks=${formatCodexFeatureStatus(hooks)}`,
  `command_checks=${commandResults.map((result) => `${result.id}:${result.ok ? 'ok' : 'fail'}`).join(',')}`,
  `schema_checks=${skipSchema ? 'skipped' : schemaResults.map((result) => `${result.relativePath}:${result.ok ? 'ok' : 'fail'}`).join(',')}`,
  `optional_features=${optionalFeatures.map(([name, status]) => `${name}:${status}`).join(',')}`,
  `advisories=${advisories.length ? advisories.join(' | ') : 'none'}`,
].join('\n') + '\n');

if (failures.length > 0) {
  throw new Error(`Codex surface audit failed:\n- ${failures.join('\n- ')}`);
}
