import { chmod, mkdir, readFile, readdir, rm, stat, writeFile, copyFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROLE_DEFINITIONS } from '../registry/agent-definitions.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const repoRoot = resolve(__dirname, '..');
export const chedexMarkerStart = '# BEGIN CHEDEX NATIVE AGENTS';
export const chedexMarkerEnd = '# END CHEDEX NATIVE AGENTS';
export const uninstallFileName = 'CHEDEX_UNINSTALL.md';
export const uninstallStateFileName = 'CHEDEX_UNINSTALL.json';
export const backupsDirName = '.chedex-backups';
export const chedexHooksFeature = 'codex_hooks';
export const chedexMinimumCodexVersion = '0.114.0';
export const chedexUserPromptSubmitMinimumCodexVersion = '0.116.0';
export const chedexLatestVerifiedCodexVersion = '0.120.0';
export const chedexHookStatusPrefix = 'Chedex governor:';
export const chedexSessionStartStatusMessage = `${chedexHookStatusPrefix} restore governed workflow context`;
export const chedexUserPromptSubmitStatusMessage = `${chedexHookStatusPrefix} guard governed prompt submission`;
export const chedexStopStatusMessage = `${chedexHookStatusPrefix} enforce terminal workflow state`;

export function codexHome() {
  return process.env.CODEX_HOME || join(homedir(), '.codex');
}

export function installTargets() {
  const home = codexHome();
  const hookAssetsDir = join(home, 'hooks', 'chedex');
  return {
    codexHome: home,
    backupsDir: join(home, backupsDirName),
    promptsDir: join(home, 'prompts'),
    skillsDir: join(home, 'skills'),
    agentsDir: join(home, 'agents'),
    hooksDir: join(home, 'hooks'),
    hookAssetsDir,
    hookRuntimePath: join(hookAssetsDir, 'chedex-governor.mjs'),
    hooksConfigPath: join(home, 'hooks.json'),
    workflowsDir: join(home, 'workflows'),
    activeWorkflowIndexPath: join(home, 'workflows', '_active.json'),
    agentsMdPath: join(home, 'AGENTS.md'),
    configPath: join(home, 'config.toml'),
    uninstallPath: join(home, uninstallFileName),
    uninstallStatePath: join(home, uninstallStateFileName),
  };
}

export function roleNames() {
  return Object.keys(ROLE_DEFINITIONS);
}

export async function ensureDir(path) {
  await mkdir(path, { recursive: true });
}

export async function fileExists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

export async function readTextIfExists(path) {
  try {
    return await readFile(path, 'utf8');
  } catch {
    return '';
  }
}

export function stripFrontmatter(content) {
  const match = content.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);
  return match ? content.slice(match[0].length).trim() : content.trim();
}

export function escapeTomlMultiline(value) {
  return value.replace(/"{3,}/g, (match) => match.split('').join('\\'));
}

export function buildAgentToml(role, promptBody) {
  return [
    `# Chedex native agent: ${role.id}`,
    `name = "${role.id}"`,
    `model_reasoning_effort = "${role.default_effort}"`,
    'developer_instructions = """',
    escapeTomlMultiline([
      promptBody,
      '',
      '<metadata>',
      `- role: ${role.id}`,
      `- posture: ${role.posture}`,
      `- tool_policy: ${role.tool_policy}`,
      `- done_definition: ${role.done_definition}`,
      `- handoff_targets: ${role.handoff_targets.join(', ')}`,
      '</metadata>',
    ].join('\n')),
    '"""',
    '',
  ].join('\n');
}

export async function expectedGeneratedAgentToml(name) {
  assertKnownRole(name);
  const role = ROLE_DEFINITIONS[name];
  const prompt = await readFile(rolePromptPath(name), 'utf8');
  return buildAgentToml(role, stripFrontmatter(prompt));
}

export async function staleGeneratedAgents(names = roleNames()) {
  const stale = [];

  for (const name of names) {
    const [expected, current] = await Promise.all([
      expectedGeneratedAgentToml(name),
      readTextIfExists(generatedAgentPath(name)),
    ]);
    if (expected !== current) {
      stale.push(name);
    }
  }

  return stale;
}

export async function copyTree(sourceDir, destDir) {
  await ensureDir(destDir);
  const entries = await readdir(sourceDir, { withFileTypes: true });
  for (const entry of entries) {
    const sourcePath = join(sourceDir, entry.name);
    const destPath = join(destDir, entry.name);
    if (entry.isDirectory()) {
      await copyTree(sourcePath, destPath);
    } else if (entry.isFile()) {
      await copyFile(sourcePath, destPath);
    }
  }
}

export async function listRelativeFiles(root, prefix = '') {
  const entries = await readdir(join(root, prefix), { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const relativePath = join(prefix, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listRelativeFiles(root, relativePath));
    } else if (entry.isFile()) {
      files.push(relativePath);
    }
  }

  return files.sort();
}

export async function copyPath(sourcePath, destPath) {
  const sourceStat = await stat(sourcePath);
  if (sourceStat.isDirectory()) {
    await copyTree(sourcePath, destPath);
    return 'directory';
  }

  await ensureDir(dirname(destPath));
  await copyFile(sourcePath, destPath);
  return 'file';
}

export async function ensureExecutable(path) {
  await chmod(path, 0o755);
}

export async function removeTree(path) {
  await rm(path, { recursive: true, force: true });
}

export async function removeDirIfEmpty(path) {
  try {
    const entries = await readdir(path);
    if (entries.length > 0) return false;
    await rm(path, { recursive: true, force: true });
    return true;
  } catch {
    return false;
  }
}

export function buildAgentConfigBlock(agentsDir) {
  const lines = [chedexMarkerStart];
  for (const name of roleNames()) {
    const role = ROLE_DEFINITIONS[name];
    const tableKey = name.includes('-') ? `agents."${name}"` : `agents.${name}`;
    lines.push(`[${tableKey}]`);
    lines.push(`description = "${role.summary}"`);
    lines.push(`config_file = "${join(agentsDir, `${name}.toml`)}"`);
    lines.push('');
  }
  lines.push(chedexMarkerEnd);
  return lines.join('\n');
}

export function upsertFeaturesSection(config) {
  const lines = config.split(/\r?\n/);
  const featuresStart = lines.findIndex((line) => /^\s*\[features\]\s*$/.test(line));

  if (featuresStart < 0) {
    const body = config.trimEnd();
    const featureBlock = [
      '[features]',
      'multi_agent = true',
      `${chedexHooksFeature} = true`,
    ].join('\n');
    return body ? `${body}\n\n${featureBlock}\n` : `${featureBlock}\n`;
  }

  let sectionEnd = lines.length;
  for (let i = featuresStart + 1; i < lines.length; i++) {
    if (/^\s*\[/.test(lines[i]) || lines[i].includes(chedexMarkerStart)) {
      sectionEnd = i;
      break;
    }
  }

  let foundMulti = false;
  let foundHooks = false;

  for (let i = featuresStart + 1; i < sectionEnd; i++) {
    if (/^\s*multi_agent\s*=/.test(lines[i])) {
      lines[i] = 'multi_agent = true';
      foundMulti = true;
    } else if (new RegExp(`^\\s*${chedexHooksFeature}\\s*=`).test(lines[i])) {
      lines[i] = `${chedexHooksFeature} = true`;
      foundHooks = true;
    }
  }

  const insertAt = sectionEnd;
  if (!foundMulti) {
    lines.splice(insertAt, 0, 'multi_agent = true');
    sectionEnd += 1;
  }
  if (!foundHooks) {
    lines.splice(sectionEnd, 0, `${chedexHooksFeature} = true`);
  }

  return `${lines.join('\n').replace(/\n+$/, '')}\n`;
}

export function stripChedexBlock(config) {
  const pattern = new RegExp(`${chedexMarkerStart}[\\s\\S]*?${chedexMarkerEnd}\\n?`, 'g');
  return config.replace(pattern, '').replace(/\n{3,}/g, '\n\n');
}

export function stripManagedFeaturesSection(config) {
  const lines = config.split(/\r?\n/);
  const featuresStart = lines.findIndex((line) => /^\s*\[features\]\s*$/.test(line));

  if (featuresStart < 0) {
    return config;
  }

  let sectionEnd = lines.length;
  for (let i = featuresStart + 1; i < lines.length; i += 1) {
    if (/^\s*\[/.test(lines[i]) || lines[i].includes(chedexMarkerStart)) {
      sectionEnd = i;
      break;
    }
  }

  const featurePattern = new RegExp(`^\\s*(multi_agent|${chedexHooksFeature})\\s*=`);
  const nextSectionLines = lines.slice(featuresStart + 1, sectionEnd).filter((line) => !featurePattern.test(line));
  const hasMeaningfulFeatureLines = nextSectionLines.some((line) => line.trim().length > 0);

  if (hasMeaningfulFeatureLines) {
    lines.splice(featuresStart + 1, sectionEnd - featuresStart - 1, ...nextSectionLines);
  } else {
    lines.splice(featuresStart, sectionEnd - featuresStart);
  }

  return lines.join('\n').replace(/\n{3,}/g, '\n\n');
}

export function renderUninstallNote(targets, options = {}) {
  const backupPaths = Array.isArray(options.backups) ? options.backups : [];
  const hookAssetPaths = Array.isArray(options.hookAssets) ? options.hookAssets : [];
  const promptFiles = roleNames().map((name) => `${targets.promptsDir}/${name}.md`);
  const agentFiles = roleNames().map((name) => `${targets.agentsDir}/${name}.toml`);
  const skillDirs = listSkills().map((name) => `${targets.skillsDir}/${name}`);
  const sections = [
    '# Chedex Uninstall Notes',
    '',
    'This installation was created by the Chedex repo install script.',
    '',
    '## Installed Paths',
    '',
    `- ${targets.agentsMdPath}`,
    ...promptFiles.map((path) => `- ${path}`),
    ...skillDirs.map((path) => `- ${path}`),
    ...agentFiles.map((path) => `- ${path}`),
    ...(hookAssetPaths.length > 0 ? hookAssetPaths.map((path) => `- ${path}`) : [`- ${targets.hookAssetsDir}/*`]),
    `- ${targets.hooksConfigPath}`,
    `- ${targets.uninstallStatePath}`,
    '',
    '## Config Changes',
    '',
    `- ${targets.configPath}`,
    `- managed block markers: ${chedexMarkerStart} / ${chedexMarkerEnd}`,
    '- features enforced: `multi_agent = true`, `codex_hooks = true`',
    '',
    '## Backup Root',
    '',
    `- ${targets.backupsDir}`,
  ];

  if (backupPaths.length > 0) {
    sections.push('', '## Backup', '', ...backupPaths.map((path) => `- ${path}`));
  }

  sections.push(
    '',
    '## Workflow State',
    '',
    `- ${targets.activeWorkflowIndexPath} is created later, on the first governed workflow sync`,
    '',
    '## Clean Uninstall',
    '',
    '1. Run `npm run uninstall:user` to restore backed-up managed files and remove install-created ones',
    '2. Remove any later-created workflow state such as workflows/_active.json if you no longer want it',
    '3. Remove any additional user-managed files you no longer want',
  );

  return sections.join('\n');
}

export function timestampSlug(date = new Date()) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

export function repoPath(...parts) {
  return join(repoRoot, ...parts);
}

export function installManifestPaths() {
  return {
    templateAgents: repoPath('AGENTS.template.md'),
    promptsDir: repoPath('prompts'),
    skillsDir: repoPath('skills'),
    agentsDir: repoPath('agents'),
    hooksDir: repoPath('hooks'),
  };
}

export function listSkills() {
  return ['clarify', 'deep-interview', 'autoresearch-plan', 'autoresearch-loop', 'plan', 'review', 'execute', 'tdd', 'ultrawork', 'ralph', 'autopilot'];
}

export async function writeFileIfChanged(path, content) {
  const current = await readTextIfExists(path);
  if (current === content) return false;
  await ensureDir(dirname(path));
  await writeFile(path, content);
  return true;
}

export async function readJsonIfExists(path, fallback = null) {
  const text = await readTextIfExists(path);
  if (!text) {
    return fallback;
  }
  return JSON.parse(text);
}

export async function writeJsonIfChanged(path, value) {
  const content = `${JSON.stringify(value, null, 2)}\n`;
  return writeFileIfChanged(path, content);
}

export function normalizeManagedHooksConfig(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { hooks: {} };
  }

  const hooks = raw.hooks && typeof raw.hooks === 'object' && !Array.isArray(raw.hooks)
    ? raw.hooks
    : {};

  return { ...raw, hooks };
}

export function isManagedHookHandler(handler) {
  if (!handler || typeof handler !== 'object' || Array.isArray(handler)) {
    return false;
  }

  const command = typeof handler.command === 'string' ? handler.command : '';
  const statusMessage = typeof handler.statusMessage === 'string' ? handler.statusMessage : '';
  if (!command.includes('chedex-governor.mjs')) {
    return false;
  }

  if (statusMessage === chedexSessionStartStatusMessage) {
    return handler.type === 'command' && command.includes(' session-start');
  }

  if (statusMessage === chedexUserPromptSubmitStatusMessage) {
    return handler.type === 'command' && command.includes(' user-prompt-submit');
  }

  if (statusMessage === chedexStopStatusMessage) {
    return handler.type === 'command' && command.includes(' stop');
  }

  return false;
}

export function stripManagedHooksConfig(raw) {
  const config = normalizeManagedHooksConfig(raw);
  const nextHooks = {};

  for (const [eventName, groups] of Object.entries(config.hooks)) {
    if (!Array.isArray(groups)) continue;
    const nextGroups = [];

    for (const group of groups) {
      if (!group || typeof group !== 'object' || Array.isArray(group)) continue;
      const handlers = Array.isArray(group.hooks) ? group.hooks.filter((handler) => !isManagedHookHandler(handler)) : [];
      if (handlers.length === 0) continue;
      nextGroups.push({
        ...group,
        hooks: handlers,
      });
    }

    if (nextGroups.length > 0) {
      nextHooks[eventName] = nextGroups;
    }
  }

  return {
    ...config,
    hooks: nextHooks,
  };
}

export function isEffectivelyEmptyHooksConfig(raw) {
  const config = normalizeManagedHooksConfig(raw);
  const nonHookKeys = Object.keys(config).filter((key) => key !== 'hooks' && config[key] != null);
  return nonHookKeys.length === 0 && Object.keys(config.hooks).length === 0;
}

export function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'\"'\"'`)}'`;
}

export function managedHookEventsForCodexVersion(rawVersion) {
  const installed = parseSemver(rawVersion);
  const userPromptSubmitMinimum = parseSemver(chedexUserPromptSubmitMinimumCodexVersion);
  const supportsUserPromptSubmit = Boolean(
    installed
    && userPromptSubmitMinimum
    && compareSemver(installed, userPromptSubmitMinimum) >= 0,
  );

  return [
    'SessionStart',
    ...(supportsUserPromptSubmit ? ['UserPromptSubmit'] : []),
    'Stop',
  ];
}

export function buildManagedHooksConfig(targets, options = {}) {
  const nodeCommand = shellQuote(process.execPath);
  const governorCommand = shellQuote(targets.hookRuntimePath);
  const supportedHookEvents = new Set(
    Array.isArray(options.supportedHookEvents) && options.supportedHookEvents.length > 0
      ? options.supportedHookEvents
      : ['SessionStart', 'UserPromptSubmit', 'Stop'],
  );
  const hooks = {};

  if (supportedHookEvents.has('SessionStart')) {
    hooks.SessionStart = [
      {
        matcher: '^(startup|resume)$',
        hooks: [
          {
            type: 'command',
            command: `${nodeCommand} ${governorCommand} session-start`,
            timeout: 5,
            statusMessage: chedexSessionStartStatusMessage,
          },
        ],
      },
    ];
  }

  if (supportedHookEvents.has('UserPromptSubmit')) {
    hooks.UserPromptSubmit = [
      {
        hooks: [
          {
            type: 'command',
            command: `${nodeCommand} ${governorCommand} user-prompt-submit`,
            timeout: 5,
            statusMessage: chedexUserPromptSubmitStatusMessage,
          },
        ],
      },
    ];
  }

  if (supportedHookEvents.has('Stop')) {
    hooks.Stop = [
      {
        hooks: [
          {
            type: 'command',
            command: `${nodeCommand} ${governorCommand} stop`,
            timeout: 5,
            statusMessage: chedexStopStatusMessage,
          },
        ],
      },
    ];
  }

  return { hooks };
}

export function mergeManagedHooksConfig(existing, targets, options = {}) {
  const stripped = stripManagedHooksConfig(existing);
  const managed = buildManagedHooksConfig(targets, options);
  const merged = normalizeManagedHooksConfig(stripped);

  for (const [eventName, groups] of Object.entries(managed.hooks)) {
    if (!Array.isArray(merged.hooks[eventName])) {
      merged.hooks[eventName] = [];
    }
    merged.hooks[eventName].push(...groups);
  }

  return merged;
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

export function readCodexVersion() {
  const stdout = execFileSync('codex', ['--version'], { encoding: 'utf8' });
  const version = parseSemver(stdout);
  if (!version) {
    throw new Error(`unable to parse codex version from: ${stdout.trim()}`);
  }
  return {
    raw: stdout.trim(),
    version,
  };
}

export function parseCodexFeatures(output) {
  const features = {};
  for (const line of output.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const parts = trimmed.split(/\s+/).filter(Boolean);
    if (parts.length < 3) continue;
    const enabled = parts.at(-1);
    if (!/^(true|false)$/i.test(enabled)) continue;
    const name = parts[0];
    const stage = parts.slice(1, -1).join(' ');
    if (!stage) continue;
    features[name] = {
      stage,
      enabled: enabled === 'true',
    };
  }
  return features;
}

export function readCodexFeatures() {
  const stdout = execFileSync('codex', ['features', 'list'], { encoding: 'utf8' });
  return parseCodexFeatures(stdout);
}

export function probeCodexHooksSupport() {
  const installed = readCodexVersion();
  const minimum = parseSemver(chedexMinimumCodexVersion);

  if (!minimum || compareSemver(installed.version, minimum) < 0) {
    return {
      ok: false,
      reason: `codex ${installed.raw} is older than required ${chedexMinimumCodexVersion}`,
      version: installed.raw,
    };
  }

  const features = readCodexFeatures();
  if (!(chedexHooksFeature in features)) {
    return {
      ok: false,
      reason: `codex ${installed.raw} does not expose the ${chedexHooksFeature} feature flag`,
      version: installed.raw,
      features,
    };
  }

  return {
    ok: true,
    version: installed.raw,
    feature: features[chedexHooksFeature],
    supportedHookEvents: managedHookEventsForCodexVersion(installed.raw),
  };
}

export function assertKnownRole(name) {
  if (!ROLE_DEFINITIONS[name]) {
    throw new Error(`Unknown role: ${name}`);
  }
}

export function rolePromptPath(name) {
  assertKnownRole(name);
  return repoPath('prompts', `${name}.md`);
}

export function generatedAgentPath(name) {
  assertKnownRole(name);
  return repoPath('agents', `${name}.toml`);
}

export function anyMissing(paths) {
  return paths.filter((path) => !existsSync(path));
}
