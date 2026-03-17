import { copyFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import {
  copyTree,
  fileExists,
  installManifestPaths,
  installTargets,
  isEffectivelyEmptyHooksConfig,
  listRelativeFiles,
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
const manifest = installManifestPaths();

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
const managedHookPaths = (await listRelativeFiles(manifest.hooksDir)).map((relativePath) => join(targets.hookAssetsDir, relativePath));

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

function unionManagedPaths(currentPaths, recordedEntries) {
  const allPaths = new Set(currentPaths);
  for (const entry of recordedEntries || []) {
    if (entry?.target_path) {
      allPaths.add(entry.target_path);
    }
  }
  return [...allPaths];
}

const hookEntries = Array.isArray(uninstallState?.managed_paths?.hooks)
  ? [...uninstallState.managed_paths.hooks]
  : [];

if (!hookEntries.some((entry) => entry?.target_path === targets.hookRuntimePath) && uninstallState?.backups?.hookRuntime) {
  hookEntries.push({
    target_path: targets.hookRuntimePath,
    backup_path: uninstallState.backups.hookRuntime,
    type: 'file',
  });
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

  for (const targetPath of unionManagedPaths(managedPromptPaths, uninstallState?.managed_paths?.prompts)) {
    const entry = uninstallState?.managed_paths?.prompts?.find((candidate) => candidate.target_path === targetPath);
    await restoreManagedPath(targetPath, entry);
  }

  for (const targetPath of unionManagedPaths(managedAgentPaths, uninstallState?.managed_paths?.agents)) {
    const entry = uninstallState?.managed_paths?.agents?.find((candidate) => candidate.target_path === targetPath);
    await restoreManagedPath(targetPath, entry);
  }

  for (const targetPath of unionManagedPaths(managedSkillPaths, uninstallState?.managed_paths?.skills)) {
    const entry = uninstallState?.managed_paths?.skills?.find((candidate) => candidate.target_path === targetPath);
    await restoreManagedPath(targetPath, entry);
  }

  const restoredAgentsMd = await restoreBackupIfPresent(uninstallState?.backups?.agentsMd, targets.agentsMdPath);
  if (!restoredAgentsMd) {
    await rm(targets.agentsMdPath, { force: true });
  }

  for (const targetPath of unionManagedPaths(managedHookPaths, hookEntries)) {
    const entry = hookEntries.find((candidate) => candidate.target_path === targetPath);
    await restoreManagedPath(targetPath, entry);
  }

  await removeDirIfEmpty(targets.hookAssetsDir);
  await removeDirIfEmpty(targets.hooksDir);

  await rm(targets.uninstallPath, { recursive: true, force: true });
  await rm(targets.uninstallStatePath, { force: true });
}

process.stdout.write(`dry_run=${dryRun ? 'true' : 'false'}\n`);
