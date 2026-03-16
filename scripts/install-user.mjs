import { copyFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  buildAgentConfigBlock,
  chedexMarkerEnd,
  chedexMarkerStart,
  copyPath,
  copyTree,
  ensureExecutable,
  ensureDir,
  fileExists,
  installManifestPaths,
  installTargets,
  listSkills,
  mergeManagedHooksConfig,
  probeCodexHooksSupport,
  readJsonIfExists,
  readTextIfExists,
  renderUninstallNote,
  roleNames,
  stripChedexBlock,
  timestampSlug,
  upsertFeaturesSection,
  writeFileIfChanged,
  writeJsonIfChanged,
} from './lib.mjs';

const dryRun = process.argv.includes('--dry-run');
const targets = installTargets();
const manifest = installManifestPaths();
const backupSlug = timestampSlug();
const backupPath = `${targets.configPath}.chedex.bak-${backupSlug}`;
const hooksBackupPath = `${targets.hooksConfigPath}.chedex.bak-${backupSlug}`;
const agentsMdBackupPath = `${targets.agentsMdPath}.chedex.bak-${backupSlug}`;
const hookRuntimeBackupPath = `${targets.hookRuntimePath}.chedex.bak-${backupSlug}`;
const configPresentBefore = await fileExists(targets.configPath);
const existingConfig = await readTextIfExists(targets.configPath);
const hooksConfigPresentBefore = await fileExists(targets.hooksConfigPath);
const agentsMdPresentBefore = await fileExists(targets.agentsMdPath);
const hookRuntimePresentBefore = await fileExists(targets.hookRuntimePath);
const managedPromptPaths = roleNames().map((name) => join(targets.promptsDir, `${name}.md`));
const managedAgentPaths = roleNames().map((name) => join(targets.agentsDir, `${name}.toml`));
const managedSkillPaths = listSkills().map((name) => join(targets.skillsDir, name));
const currentHooksConfig = await readJsonIfExists(targets.hooksConfigPath, { hooks: {} });
const hookProbe = probeCodexHooksSupport();
const uninstallBackups = [];
const uninstallState = {
  schema_version: 1,
  existing_before: {
    config: configPresentBefore,
    hooksConfig: hooksConfigPresentBefore,
    agentsMd: agentsMdPresentBefore,
    hookRuntime: hookRuntimePresentBefore,
  },
  backups: {
    config: null,
    hooksConfig: null,
    agentsMd: null,
    hookRuntime: null,
  },
  managed_paths: {
    prompts: [],
    agents: [],
    skills: [],
  },
};

async function backupManagedPath(targetPath, bucket) {
  if (!(await fileExists(targetPath))) {
    return;
  }

  const backupPath = `${targetPath}.chedex.bak-${backupSlug}`;
  const type = await copyPath(targetPath, backupPath);
  uninstallBackups.push(backupPath);
  uninstallState.managed_paths[bucket].push({
    target_path: targetPath,
    backup_path: backupPath,
    type,
  });
}

if (!hookProbe.ok) {
  throw new Error(`Chedex requires Codex native hooks support: ${hookProbe.reason}`);
}

if (!dryRun) {
  await import(new URL('./generate-agents.mjs', import.meta.url));
}

for (const dir of [
  targets.codexHome,
  targets.promptsDir,
  targets.skillsDir,
  targets.agentsDir,
  targets.hooksDir,
  targets.hookAssetsDir,
  targets.workflowsDir,
]) {
  if (!dryRun) await ensureDir(dir);
}

if (!dryRun) {
  if (configPresentBefore) {
    await copyFile(targets.configPath, backupPath);
    uninstallBackups.push(backupPath);
    uninstallState.backups.config = backupPath;
  }

  if (hooksConfigPresentBefore) {
    await copyFile(targets.hooksConfigPath, hooksBackupPath);
    uninstallBackups.push(hooksBackupPath);
    uninstallState.backups.hooksConfig = hooksBackupPath;
  }

  if (agentsMdPresentBefore) {
    await copyFile(targets.agentsMdPath, agentsMdBackupPath);
    uninstallBackups.push(agentsMdBackupPath);
    uninstallState.backups.agentsMd = agentsMdBackupPath;
  }

  if (hookRuntimePresentBefore) {
    await copyFile(targets.hookRuntimePath, hookRuntimeBackupPath);
    uninstallBackups.push(hookRuntimeBackupPath);
    uninstallState.backups.hookRuntime = hookRuntimeBackupPath;
  }

  for (const path of managedPromptPaths) {
    await backupManagedPath(path, 'prompts');
  }

  for (const path of managedAgentPaths) {
    await backupManagedPath(path, 'agents');
  }

  for (const path of managedSkillPaths) {
    await backupManagedPath(path, 'skills');
  }
}

const templateContent = await readTextIfExists(manifest.templateAgents);
if (!dryRun) {
  await writeFileIfChanged(targets.agentsMdPath, templateContent);
  await copyTree(manifest.promptsDir, targets.promptsDir);
  for (const skill of listSkills()) {
    await copyTree(join(manifest.skillsDir, skill), join(targets.skillsDir, skill));
  }
  await copyTree(manifest.agentsDir, targets.agentsDir);
  await copyTree(manifest.hooksDir, targets.hookAssetsDir);
  await ensureExecutable(targets.hookRuntimePath);
}

let nextConfig = upsertFeaturesSection(existingConfig || '');
nextConfig = stripChedexBlock(nextConfig).trimEnd();
nextConfig = `${nextConfig}\n\n${buildAgentConfigBlock(targets.agentsDir)}\n`;
const nextHooksConfig = mergeManagedHooksConfig(currentHooksConfig, targets);

if (!dryRun) {
  await writeFileIfChanged(targets.configPath, nextConfig);
  await writeJsonIfChanged(targets.hooksConfigPath, nextHooksConfig);
  const uninstall = renderUninstallNote(targets, { backups: uninstallBackups });
  await writeFileIfChanged(targets.uninstallPath, uninstall);
  await writeJsonIfChanged(targets.uninstallStatePath, uninstallState);
}

const summary = [
  `codex_home=${targets.codexHome}`,
  `roles=${roleNames().length}`,
  `skills=${listSkills().length}`,
  `dry_run=${dryRun ? 'true' : 'false'}`,
  `codex_version=${hookProbe.version}`,
  `codex_hooks_feature_stage=${hookProbe.feature.stage}`,
  `codex_hooks_feature_enabled_before_install=${hookProbe.feature.enabled ? 'true' : 'false'}`,
  `hooks_config=${targets.hooksConfigPath}`,
  `hook_runtime=${targets.hookRuntimePath}`,
  `uninstall_state=${targets.uninstallStatePath}`,
  `markers=${chedexMarkerStart} .. ${chedexMarkerEnd}`,
];

process.stdout.write(`${summary.join('\n')}\n`);
