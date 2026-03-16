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
export const chedexHooksFeature = 'codex_hooks';
export const chedexMinimumCodexVersion = '0.114.0';
export const chedexHookStatusPrefix = 'Chedex governor:';

export function codexHome() {
  return process.env.CODEX_HOME || join(homedir(), '.codex');
}

export function legacyOmxHome() {
  return join(homedir(), '.omx');
}

export function legacyOmxAgentsDir() {
  return join(legacyOmxHome(), 'agents');
}

export function installTargets() {
  const home = codexHome();
  const hookAssetsDir = join(home, 'hooks', 'chedex');
  return {
    codexHome: home,
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

export async function cleanupLegacyOmxAgents() {
  const legacyAgentsDir = legacyOmxAgentsDir();
  let removedFiles = 0;

  for (const name of roleNames()) {
    const path = join(legacyAgentsDir, `${name}.toml`);
    if (await fileExists(path)) {
      await rm(path, { force: true });
      removedFiles += 1;
    }
  }

  const removedAgentsDir = await removeDirIfEmpty(legacyAgentsDir);
  const removedOmxHome = await removeDirIfEmpty(legacyOmxHome());

  return {
    removedFiles,
    removedAgentsDir,
    removedOmxHome,
  };
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
      'child_agents_md = true',
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
  let foundChild = false;
  let foundHooks = false;

  for (let i = featuresStart + 1; i < sectionEnd; i++) {
    if (/^\s*multi_agent\s*=/.test(lines[i])) {
      lines[i] = 'multi_agent = true';
      foundMulti = true;
    } else if (/^\s*child_agents_md\s*=/.test(lines[i])) {
      lines[i] = 'child_agents_md = true';
      foundChild = true;
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
  if (!foundChild) {
    lines.splice(sectionEnd, 0, 'child_agents_md = true');
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

export function renderUninstallNote(targets, options = {}) {
  const backupPaths = Array.isArray(options.backups) ? options.backups : [];
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
    `- ${targets.hookRuntimePath}`,
    `- ${targets.hooksConfigPath}`,
    '',
    '## Config Changes',
    '',
    `- ${targets.configPath}`,
    `- managed block markers: ${chedexMarkerStart} / ${chedexMarkerEnd}`,
    '- features enforced: `multi_agent = true`, `child_agents_md = true`, `codex_hooks = true`',
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
    '1. Restore any listed config backups or remove the managed Chedex block from config.toml',
    '2. Remove the installed prompt, skill, agent, and AGENTS files if you no longer want them',
    '3. Remove any later-created workflow state such as workflows/_active.json if you no longer want it',
    '4. Remove any leftover legacy agent files from older installs if they still exist',
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
  return ['clarify', 'plan', 'review', 'execute', 'tdd', 'ultrawork', 'ralph', 'autopilot'];
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
  return handler
    && typeof handler === 'object'
    && !Array.isArray(handler)
    && typeof handler.statusMessage === 'string'
    && handler.statusMessage.startsWith(chedexHookStatusPrefix);
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

export function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'\"'\"'`)}'`;
}

export function buildManagedHooksConfig(targets) {
  const nodeCommand = process.execPath;
  const governorCommand = targets.hookRuntimePath;
  return {
    hooks: {
      SessionStart: [
        {
          matcher: '^(startup|resume)$',
          hooks: [
            {
              type: 'command',
              command: `${nodeCommand} ${governorCommand} session-start`,
              timeout: 5,
              statusMessage: `${chedexHookStatusPrefix} restore governed workflow context`,
            },
          ],
        },
      ],
      Stop: [
        {
          hooks: [
            {
              type: 'command',
              command: `${nodeCommand} ${governorCommand} stop`,
              timeout: 5,
              statusMessage: `${chedexHookStatusPrefix} enforce terminal workflow state`,
            },
          ],
        },
      ],
    },
  };
}

export function mergeManagedHooksConfig(existing, targets) {
  const stripped = stripManagedHooksConfig(existing);
  const managed = buildManagedHooksConfig(targets);
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
