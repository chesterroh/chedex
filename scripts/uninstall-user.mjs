import { copyFile, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import {
  copyTree,
  ensureDir,
  fileExists,
  installTargets,
  isEffectivelyEmptyHooksConfig,
  readJsonIfExists,
  readTextIfExists,
  removeDirIfEmpty,
  removeTree,
  stripLegacyChedexConfig,
  stripLegacyChedexHooks,
  stripManagedAgentsBlock,
  writeFileIfChanged,
  writeJsonIfChanged,
} from './lib.mjs';

const dryRun = process.argv.includes('--dry-run');
const targets = installTargets();
const state = await readJsonIfExists(targets.uninstallStatePath, null);

if (!state) {
  process.stderr.write('warning: rollback state is missing; preserving agent and skill files because ownership cannot be proven\n');
}

async function restoreEntry(entry) {
  if (!entry?.target_path) return;
  await removeTree(entry.target_path);
  if (!entry.backup_path || !(await fileExists(entry.backup_path))) return;
  if (entry.type === 'directory') await copyTree(entry.backup_path, entry.target_path);
  else {
    await ensureDir(dirname(entry.target_path));
    await copyFile(entry.backup_path, entry.target_path);
  }
}

if (!dryRun) {
  const entriesByBucket = state?.managed_paths || {};
  for (const entry of entriesByBucket.agents || []) await restoreEntry(entry);
  for (const entry of entriesByBucket.skills || []) await restoreEntry(entry);
  for (const entry of entriesByBucket.prompts || []) await restoreEntry(entry);

  let restoredLegacyHookBackup = false;
  for (const entry of entriesByBucket.hooks || []) {
    await restoreEntry(entry);
    if (entry?.backup_path && await fileExists(entry.backup_path)) restoredLegacyHookBackup = true;
  }

  if (state?.schema_version === 1 && state?.backups?.agentsMd && await fileExists(state.backups.agentsMd)) {
    await copyFile(state.backups.agentsMd, targets.agentsMdPath);
  } else if (state?.schema_version === 1 && state?.existing_before?.agentsMd === false) {
    await rm(targets.agentsMdPath, { force: true });
  } else {
    const currentAgents = await readTextIfExists(targets.agentsMdPath);
    const cleanAgents = stripManagedAgentsBlock(currentAgents);
    if (cleanAgents) await writeFileIfChanged(targets.agentsMdPath, `${cleanAgents}\n`);
    else await rm(targets.agentsMdPath, { force: true });
  }

  const currentConfig = await readTextIfExists(targets.configPath);
  const cleanConfig = stripLegacyChedexConfig(currentConfig, {
    stripFeatureFlags: Boolean(state),
  });
  if (cleanConfig !== currentConfig.trim()) {
    if (cleanConfig) await writeFileIfChanged(targets.configPath, `${cleanConfig}\n`);
    else await rm(targets.configPath, { force: true });
  }

  const currentHooks = await readJsonIfExists(targets.hooksConfigPath, null);
  if (currentHooks) {
    const cleanHooks = stripLegacyChedexHooks(currentHooks);
    if (isEffectivelyEmptyHooksConfig(cleanHooks)) await rm(targets.hooksConfigPath, { force: true });
    else await writeJsonIfChanged(targets.hooksConfigPath, cleanHooks);
  }

  if (!restoredLegacyHookBackup) {
    for (const filename of ['chedex-governor.mjs', 'codex-release-audit.mjs', 'codex-release-deltas.json', 'workflow-mode-schemas.mjs']) {
      await rm(join(targets.legacyHookAssetsDir, filename), { force: true });
    }
  }
  await removeDirIfEmpty(targets.legacyHookAssetsDir);
  await removeDirIfEmpty(dirname(targets.legacyHookAssetsDir));
  await removeDirIfEmpty(targets.agentsDir);
  await removeDirIfEmpty(targets.skillsDir);

  await rm(targets.uninstallPath, { force: true });
  await rm(targets.uninstallStatePath, { force: true });
}

process.stdout.write(`dry_run=${dryRun}\n`);
