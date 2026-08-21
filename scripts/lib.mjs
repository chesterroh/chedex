import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { copyFile, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROLE_DEFINITIONS } from '../registry/agent-definitions.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const repoRoot = resolve(__dirname, '..');
export const chedexMarkerStart = '<!-- BEGIN CHEDEX NATIVE -->';
export const chedexMarkerEnd = '<!-- END CHEDEX NATIVE -->';
export const legacyConfigMarkerStart = '# BEGIN CHEDEX NATIVE AGENTS';
export const legacyConfigMarkerEnd = '# END CHEDEX NATIVE AGENTS';
export const uninstallFileName = 'CHEDEX_UNINSTALL.md';
export const uninstallStateFileName = 'CHEDEX_UNINSTALL.json';
export const backupsDirName = '.chedex-backups';
export const chedexMinimumCodexVersion = '0.149.0';
export const chedexLatestVerifiedCodexVersion = '0.149.0';

export const chedexSkills = [
  'cdx-ai-slop-cleaner',
  'cdx-analyze',
  'cdx-autopilot',
  'cdx-autoresearch-loop',
  'cdx-autoresearch-plan',
  'cdx-best-practice-research',
  'cdx-clarify',
  'cdx-deep-interview',
  'cdx-design',
  'cdx-execute',
  'cdx-plan',
  'cdx-ralph',
  'cdx-refresh-upstreams',
  'cdx-review',
  'cdx-tdd',
  'cdx-ultraqa',
  'cdx-ultrawork',
  'cdx-visual-ralph',
];

export function repoPath(...parts) {
  return join(repoRoot, ...parts);
}

export function codexHome() {
  return process.env.CODEX_HOME || join(homedir(), '.codex');
}

export function agentsHome() {
  return process.env.CHEDEX_AGENTS_HOME || join(homedir(), '.agents');
}

export function installTargets() {
  const codexRoot = codexHome();
  const agentsRoot = agentsHome();
  return {
    codexHome: codexRoot,
    agentsHome: agentsRoot,
    backupsDir: join(codexRoot, backupsDirName),
    agentsDir: join(codexRoot, 'agents'),
    skillsDir: join(agentsRoot, 'skills'),
    agentsMdPath: join(codexRoot, 'AGENTS.md'),
    configPath: join(codexRoot, 'config.toml'),
    hooksConfigPath: join(codexRoot, 'hooks.json'),
    legacyHookAssetsDir: join(codexRoot, 'hooks', 'chedex'),
    uninstallPath: join(codexRoot, uninstallFileName),
    uninstallStatePath: join(codexRoot, uninstallStateFileName),
  };
}

export function installManifestPaths() {
  return {
    templateAgents: repoPath('AGENTS.template.md'),
    promptsDir: repoPath('prompts'),
    skillsDir: repoPath('.agents', 'skills'),
    agentsDir: repoPath('.codex', 'agents'),
  };
}

export function roleNames() {
  return Object.keys(ROLE_DEFINITIONS);
}

export function listSkills() {
  return [...chedexSkills];
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

export async function readJsonIfExists(path, fallback = null) {
  const content = await readTextIfExists(path);
  return content ? JSON.parse(content) : fallback;
}

export async function writeFileIfChanged(path, content) {
  const current = await readTextIfExists(path);
  if (current === content) return false;
  await ensureDir(dirname(path));
  await writeFile(path, content);
  return true;
}

export async function writeJsonIfChanged(path, value) {
  return writeFileIfChanged(path, `${JSON.stringify(value, null, 2)}\n`);
}

export async function removeTree(path) {
  await rm(path, { recursive: true, force: true });
}

export async function removeDirIfEmpty(path) {
  try {
    if ((await readdir(path)).length > 0) return false;
    await rm(path, { recursive: true, force: true });
    return true;
  } catch {
    return false;
  }
}

export async function copyTree(sourceDir, destDir) {
  await ensureDir(destDir);
  for (const entry of await readdir(sourceDir, { withFileTypes: true })) {
    const sourcePath = join(sourceDir, entry.name);
    const destPath = join(destDir, entry.name);
    if (entry.isDirectory()) await copyTree(sourcePath, destPath);
    if (entry.isFile()) await copyFile(sourcePath, destPath);
  }
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

export async function listRelativeFiles(root, prefix = '') {
  const files = [];
  for (const entry of await readdir(join(root, prefix), { withFileTypes: true })) {
    const relativePath = join(prefix, entry.name);
    if (entry.isDirectory()) files.push(...await listRelativeFiles(root, relativePath));
    if (entry.isFile()) files.push(relativePath);
  }
  return files.sort();
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
    `# Generated from prompts/${role.id}.md and registry/agent-definitions.mjs`,
    `name = "${role.id}"`,
    `description = "${role.summary}"`,
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

export function generatedAgentPath(name) {
  return repoPath('.codex', 'agents', `${name}.toml`);
}

export function rolePromptPath(name) {
  return repoPath('prompts', `${name}.md`);
}

export async function expectedGeneratedAgentToml(name) {
  const prompt = await readFile(rolePromptPath(name), 'utf8');
  return buildAgentToml(ROLE_DEFINITIONS[name], stripFrontmatter(prompt));
}

export async function staleGeneratedAgents(names = roleNames()) {
  const stale = [];
  for (const name of names) {
    if (await expectedGeneratedAgentToml(name) !== await readTextIfExists(generatedAgentPath(name))) {
      stale.push(name);
    }
  }
  return stale;
}

export function renderManagedAgentsBlock(template) {
  return [chedexMarkerStart, template.trim(), chedexMarkerEnd].join('\n');
}

export function stripManagedAgentsBlock(content) {
  const escapedStart = chedexMarkerStart.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const escapedEnd = chedexMarkerEnd.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return String(content || '')
    .replace(new RegExp(`(?:^|\\n)${escapedStart}[\\s\\S]*?${escapedEnd}(?:\\n|$)`, 'g'), '\n')
    .replace(/^\s+|\s+$/g, '')
    .replace(/\n{3,}/g, '\n\n');
}

export function mergeManagedAgentsBlock(existing, template) {
  const base = stripManagedAgentsBlock(existing);
  const block = renderManagedAgentsBlock(template);
  return `${base ? `${base}\n\n` : ''}${block}\n`;
}

export function stripLegacyChedexConfig(config, { stripFeatureFlags = false } = {}) {
  const markerPattern = new RegExp(
    `${legacyConfigMarkerStart.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?${legacyConfigMarkerEnd.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\n?`,
    'g',
  );
  const lines = String(config || '').replace(markerPattern, '').split(/\r?\n/);
  const featuresStart = stripFeatureFlags
    ? lines.findIndex((line) => /^\s*\[features\]\s*(?:#.*)?$/.test(line))
    : -1;
  if (featuresStart >= 0) {
    let end = lines.length;
    for (let index = featuresStart + 1; index < lines.length; index += 1) {
      if (/^\s*\[/.test(lines[index])) { end = index; break; }
    }
    const legacyTrue = /^\s*(?:goals|multi_agent|codex_hooks)\s*=\s*true\s*(?:#.*)?$/;
    const retained = lines.slice(featuresStart + 1, end).filter((line) => !legacyTrue.test(line));
    if (retained.some((line) => line.trim())) {
      lines.splice(featuresStart + 1, end - featuresStart - 1, ...retained);
    } else {
      lines.splice(featuresStart, end - featuresStart);
    }
  }
  return lines.join('\n').trim().replace(/\n{3,}/g, '\n\n');
}

function isLegacyChedexHook(hook) {
  const command = String(hook?.command || '');
  const status = String(hook?.statusMessage || hook?.status_message || '');
  return status.startsWith('Chedex governor:') || /hooks[\\/]chedex[\\/]chedex-governor\.mjs/.test(command);
}

export function stripLegacyChedexHooks(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return raw;
  const next = structuredClone(raw);
  if (!next.hooks || typeof next.hooks !== 'object' || Array.isArray(next.hooks)) return next;
  for (const [event, groups] of Object.entries(next.hooks)) {
    if (!Array.isArray(groups)) continue;
    const retainedGroups = groups
      .map((group) => {
        if (!group || !Array.isArray(group.hooks)) return group;
        const hooks = group.hooks.filter((hook) => !isLegacyChedexHook(hook));
        return hooks.length > 0 ? { ...group, hooks } : null;
      })
      .filter(Boolean);
    if (retainedGroups.length > 0) next.hooks[event] = retainedGroups;
    else delete next.hooks[event];
  }
  return next;
}

export function isEffectivelyEmptyHooksConfig(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return true;
  const keys = Object.keys(raw).filter((key) => key !== 'hooks');
  return keys.length === 0 && (!raw.hooks || Object.keys(raw.hooks).length === 0);
}

export function timestampSlug(date = new Date()) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

export function renderUninstallNote(targets) {
  return [
    '# Chedex Uninstall',
    '',
    'Run the following command from the Chedex repository:',
    '',
    '```bash',
    'npm run uninstall:user',
    '```',
    '',
    `Installed agents: ${targets.agentsDir}`,
    `Installed skills: ${targets.skillsDir}`,
    `Rollback state: ${targets.uninstallStatePath}`,
    '',
  ].join('\n');
}

export function parseSemver(value) {
  const match = String(value || '').match(/(\d+)\.(\d+)\.(\d+)/);
  return match ? match.slice(1).map(Number) : null;
}

export function compareSemver(left, right) {
  const a = Array.isArray(left) ? left : parseSemver(left);
  const b = Array.isArray(right) ? right : parseSemver(right);
  if (!a || !b) return null;
  for (let index = 0; index < 3; index += 1) {
    if (a[index] !== b[index]) return a[index] < b[index] ? -1 : 1;
  }
  return 0;
}

export function readCodexVersion() {
  try {
    return execFileSync('codex', ['--version'], { encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
}

export function parseCodexFeatures(output) {
  const features = new Map();
  for (const line of String(output || '').split(/\r?\n/)) {
    const match = line.trim().match(/^(\S+)\s+(.+?)\s+(true|false)$/);
    if (match) features.set(match[1], { name: match[1], stage: match[2], enabled: match[3] === 'true' });
  }
  return features;
}

export function readCodexFeatures() {
  try {
    return parseCodexFeatures(execFileSync('codex', ['features', 'list'], { encoding: 'utf8' }));
  } catch {
    return new Map();
  }
}

export function resolveCodexFeature(features, canonical, aliases = []) {
  for (const name of [canonical, ...aliases]) {
    if (features.has(name)) return features.get(name);
  }
  return null;
}

export function formatCodexFeatureStatus(feature) {
  return feature ? `${feature.name}:${feature.stage}:${feature.enabled}` : 'missing';
}

export function anyMissing(paths) {
  return paths.filter((path) => !existsSync(path));
}
