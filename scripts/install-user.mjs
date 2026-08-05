import { copyFile, rm } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import {
  chedexMinimumCodexVersion,
  compareSemver,
  copyPath,
  copyTree,
  ensureDir,
  fileExists,
  installManifestPaths,
  installTargets,
  isEffectivelyEmptyHooksConfig,
  listSkills,
  parseSemver,
  readCodexVersion,
  readJsonIfExists,
  readTextIfExists,
  removeDirIfEmpty,
  removeTree,
  renderUninstallNote,
  roleNames,
  staleGeneratedAgents,
  stripLegacyChedexConfig,
  stripLegacyChedexHooks,
  mergeManagedAgentsBlock,
  timestampSlug,
  writeFileIfChanged,
  writeJsonIfChanged,
} from './lib.mjs';

const dryRun = process.argv.includes('--dry-run');
const targets = installTargets();
const manifest = installManifestPaths();
const previousState = await readJsonIfExists(targets.uninstallStatePath, null);
const versionText = readCodexVersion();
const installedVersion = parseSemver(versionText);

if (!installedVersion || compareSemver(installedVersion, chedexMinimumCodexVersion) < 0) {
  throw new Error(`Chedex requires Codex CLI >= ${chedexMinimumCodexVersion}; found ${versionText || 'unavailable'}`);
}

const staleAgents = await staleGeneratedAgents();
if (staleAgents.length > 0) {
  throw new Error(`generated native agents are stale: ${staleAgents.join(', ')}\nRun npm run generate:agents.`);
}

const backupRoot = join(targets.backupsDir, timestampSlug());
const managedAgentPaths = roleNames().map((name) => join(targets.agentsDir, `${name}.toml`));
const managedSkillPaths = listSkills().map((name) => join(targets.skillsDir, name));
const state = {
  schema_version: 2,
  managed_paths: { agents: [], skills: [] },
};

function previousEntry(bucket, targetPath) {
  return previousState?.managed_paths?.[bucket]?.find((entry) => entry?.target_path === targetPath) || null;
}

function backupDestinationFor(targetPath) {
  const root = targetPath.startsWith(`${targets.agentsHome}/`) ? targets.agentsHome : targets.codexHome;
  const relativePath = relative(root, targetPath);
  if (!relativePath || relativePath.startsWith('..')) throw new Error(`backup path escapes managed home: ${targetPath}`);
  const namespace = root === targets.agentsHome ? 'agents-home' : 'codex-home';
  return join(backupRoot, namespace, relativePath);
}

async function recordManagedPath(bucket, targetPath) {
  const existingEntry = previousEntry(bucket, targetPath);
  if (existingEntry) {
    state.managed_paths[bucket].push(existingEntry);
    return;
  }
  if (!(await fileExists(targetPath))) {
    state.managed_paths[bucket].push({ target_path: targetPath, backup_path: null, type: null });
    return;
  }
  const backupPath = backupDestinationFor(targetPath);
  const type = await copyPath(targetPath, backupPath);
  state.managed_paths[bucket].push({ target_path: targetPath, backup_path: backupPath, type });
}

async function restoreRetiredEntries(entries = []) {
  let restoredBackup = false;
  for (const entry of entries) {
    if (!entry?.target_path) continue;
    await removeTree(entry.target_path);
    if (!entry.backup_path || !(await fileExists(entry.backup_path))) continue;
    restoredBackup = true;
    if (entry.type === 'directory') await copyTree(entry.backup_path, entry.target_path);
    else {
      await ensureDir(dirname(entry.target_path));
      await copyFile(entry.backup_path, entry.target_path);
    }
  }
  return restoredBackup;
}

function retiredEntries(entries = [], currentPaths = []) {
  const current = new Set(currentPaths);
  return entries.filter((entry) => entry?.target_path && !current.has(entry.target_path));
}

if (!dryRun) {
  await ensureDir(targets.codexHome);
  await ensureDir(targets.agentsHome);
  await ensureDir(targets.agentsDir);
  await ensureDir(targets.skillsDir);
  await ensureDir(targets.backupsDir);

  // Migrate surfaces managed by Chedex <=0.130 but no longer installed.
  await restoreRetiredEntries(previousState?.managed_paths?.prompts);
  const restoredLegacyHookBackup = await restoreRetiredEntries(previousState?.managed_paths?.hooks);

  // Restore or remove agents and skills retired by later native-subtraction
  // reviews before writing the current manifest and rollback state.
  await restoreRetiredEntries(retiredEntries(previousState?.managed_paths?.agents, managedAgentPaths));
  await restoreRetiredEntries(retiredEntries(previousState?.managed_paths?.skills, managedSkillPaths));

  for (const targetPath of managedAgentPaths) await recordManagedPath('agents', targetPath);
  for (const targetPath of managedSkillPaths) await recordManagedPath('skills', targetPath);

  // Persist rollback state before replacing managed files.
  await writeJsonIfChanged(targets.uninstallStatePath, state);

  for (const targetPath of managedAgentPaths) await removeTree(targetPath);
  for (const targetPath of managedSkillPaths) await removeTree(targetPath);

  await copyTree(manifest.agentsDir, targets.agentsDir);
  for (const skill of listSkills()) {
    await copyTree(join(manifest.skillsDir, skill), join(targets.skillsDir, skill));
  }

  let currentAgents = await readTextIfExists(targets.agentsMdPath);
  if (previousState?.schema_version === 1) {
    const oldBackup = previousState?.backups?.agentsMd;
    if (oldBackup && await fileExists(oldBackup)) currentAgents = await readTextIfExists(oldBackup);
    else if (previousState?.existing_before?.agentsMd === false) currentAgents = '';
  }
  const template = await readTextIfExists(manifest.templateAgents);
  await writeFileIfChanged(targets.agentsMdPath, mergeManagedAgentsBlock(currentAgents, template));

  const currentConfig = await readTextIfExists(targets.configPath);
  const cleanConfig = stripLegacyChedexConfig(currentConfig, {
    stripFeatureFlags: Boolean(previousState),
  });
  if (cleanConfig !== currentConfig.trim()) {
    if (cleanConfig) await writeFileIfChanged(targets.configPath, `${cleanConfig}\n`);
    else await rm(targets.configPath, { force: true });
  }

  const currentHooks = await readJsonIfExists(targets.hooksConfigPath, null);
  if (currentHooks) {
    const cleanHooks = stripLegacyChedexHooks(currentHooks);
    if (JSON.stringify(cleanHooks) !== JSON.stringify(currentHooks)) {
      if (isEffectivelyEmptyHooksConfig(cleanHooks)) await rm(targets.hooksConfigPath, { force: true });
      else await writeJsonIfChanged(targets.hooksConfigPath, cleanHooks);
    }
  }

  if (!restoredLegacyHookBackup) {
    for (const filename of ['chedex-governor.mjs', 'codex-release-audit.mjs', 'codex-release-deltas.json', 'workflow-mode-schemas.mjs']) {
      await rm(join(targets.legacyHookAssetsDir, filename), { force: true });
    }
  }
  await removeDirIfEmpty(targets.legacyHookAssetsDir);
  await removeDirIfEmpty(dirname(targets.legacyHookAssetsDir));

  await writeFileIfChanged(targets.uninstallPath, renderUninstallNote(targets));
}

process.stdout.write([
  `dry_run=${dryRun}`,
  `codex_version=${versionText}`,
  `agents=${roleNames().length}`,
  `skills=${listSkills().length}`,
  `agents_home=${targets.agentsHome}`,
  `runtime_hooks=none`,
  `feature_flags=none`,
].join('\n') + '\n');
