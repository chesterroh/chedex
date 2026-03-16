import { copyFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import {
  copyTree,
  fileExists,
  installTargets,
  isEffectivelyEmptyHooksConfig,
  listSkills,
  readJsonIfExists,
  readTextIfExists,
  removeDirIfEmpty,
  roleNames,
  stripChedexBlock,
  stripManagedFeaturesSection,
  stripManagedHooksConfig,
  writeFileIfChanged,
  writeJsonIfChanged,
} from './lib.mjs';

const dryRun = process.argv.includes('--dry-run');
const targets = installTargets();

const configPresent = await fileExists(targets.configPath);
const currentConfig = await readTextIfExists(targets.configPath);
const configWithoutManagedBlock = stripChedexBlock(currentConfig).trimEnd();
const nextConfig = stripManagedFeaturesSection(configWithoutManagedBlock).trimEnd();
const currentHooksConfig = await readJsonIfExists(targets.hooksConfigPath, null);
const nextHooksConfig = stripManagedHooksConfig(currentHooksConfig);
const uninstallState = await readJsonIfExists(targets.uninstallStatePath, null);
const managedPromptPaths = roleNames().map((name) => join(targets.promptsDir, `${name}.md`));
const managedAgentPaths = roleNames().map((name) => join(targets.agentsDir, `${name}.toml`));
const managedSkillPaths = listSkills().map((name) => join(targets.skillsDir, name));

async function restoreBackupIfPresent(backupPath, targetPath) {
  if (!backupPath || !(await fileExists(backupPath))) {
    return false;
  }
  await copyFile(backupPath, targetPath);
  return true;
}

async function restoreManagedPath(targetPath, entry) {
  if (!entry || !entry.backup_path || !(await fileExists(entry.backup_path))) {
    await rm(targetPath, { recursive: true, force: true });
    return;
  }

  await rm(targetPath, { recursive: true, force: true });
  if (entry.type === 'directory') {
    await copyTree(entry.backup_path, targetPath);
  } else {
    await copyFile(entry.backup_path, targetPath);
  }
}

if (!dryRun) {
  if (configPresent) {
    const restoredConfig = await restoreBackupIfPresent(uninstallState?.backups?.config, targets.configPath);
    if (!restoredConfig) {
      if (nextConfig) {
        await writeFileIfChanged(targets.configPath, `${nextConfig}\n`);
      } else {
        await rm(targets.configPath, { force: true });
      }
    }
  }

  if (currentHooksConfig) {
    const restoredHooks = await restoreBackupIfPresent(uninstallState?.backups?.hooksConfig, targets.hooksConfigPath);
    if (!restoredHooks) {
      if (isEffectivelyEmptyHooksConfig(nextHooksConfig)) {
        await rm(targets.hooksConfigPath, { force: true });
      } else {
        await writeJsonIfChanged(targets.hooksConfigPath, nextHooksConfig);
      }
    }
  }

  for (const targetPath of managedPromptPaths) {
    const entry = uninstallState?.managed_paths?.prompts?.find((candidate) => candidate.target_path === targetPath);
    await restoreManagedPath(targetPath, entry);
  }

  for (const targetPath of managedAgentPaths) {
    const entry = uninstallState?.managed_paths?.agents?.find((candidate) => candidate.target_path === targetPath);
    await restoreManagedPath(targetPath, entry);
  }

  for (const targetPath of managedSkillPaths) {
    const entry = uninstallState?.managed_paths?.skills?.find((candidate) => candidate.target_path === targetPath);
    await restoreManagedPath(targetPath, entry);
  }

  const restoredAgentsMd = await restoreBackupIfPresent(uninstallState?.backups?.agentsMd, targets.agentsMdPath);
  if (!restoredAgentsMd) {
    await rm(targets.agentsMdPath, { force: true });
  }

  const restoredHookRuntime = await restoreBackupIfPresent(uninstallState?.backups?.hookRuntime, targets.hookRuntimePath);
  if (!restoredHookRuntime) {
    await rm(targets.hookRuntimePath, { force: true });
  }

  await removeDirIfEmpty(targets.hookAssetsDir);
  await removeDirIfEmpty(targets.hooksDir);

  await rm(targets.uninstallPath, { force: true });
  await rm(targets.uninstallStatePath, { force: true });
}

process.stdout.write(`dry_run=${dryRun ? 'true' : 'false'}\n`);
