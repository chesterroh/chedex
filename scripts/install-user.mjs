import { copyFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildAgentConfigBlock,
  chedexMarkerEnd,
  chedexMarkerStart,
  cleanupLegacyOmxAgents,
  copyTree,
  ensureExecutable,
  ensureDir,
  fileExists,
  installManifestPaths,
  installTargets,
  legacyOmxAgentsDir,
  legacyOmxHome,
  listSkills,
  mergeManagedHooksConfig,
  probeCodexHooksSupport,
  readJsonIfExists,
  readTextIfExists,
  renderUninstallNote,
  repoPath,
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
const backupPath = `${targets.configPath}.chedex.bak-${timestampSlug()}`;
const hooksBackupPath = `${targets.hooksConfigPath}.chedex.bak-${timestampSlug()}`;
const legacyOmxHomePath = legacyOmxHome();
const legacyOmxAgentsPath = legacyOmxAgentsDir();
const legacyOmxHomePresentBefore = await fileExists(legacyOmxHomePath);
const legacyOmxAgentsPresentBefore = await fileExists(legacyOmxAgentsPath);
const hooksConfigPresentBefore = await fileExists(targets.hooksConfigPath);
const hookProbe = probeCodexHooksSupport();
const uninstallBackups = [];

if (!hookProbe.ok) {
  throw new Error(`Chedex requires Codex native hooks support: ${hookProbe.reason}`);
}

await import(fileURLToPath(new URL('./generate-agents.mjs', import.meta.url)));

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
  const existingConfig = await readTextIfExists(targets.configPath);
  if (existingConfig) {
    await copyFile(targets.configPath, backupPath);
    uninstallBackups.push(backupPath);
  }

  if (hooksConfigPresentBefore) {
    await copyFile(targets.hooksConfigPath, hooksBackupPath);
    uninstallBackups.push(hooksBackupPath);
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

const currentConfig = await readTextIfExists(targets.configPath);
let nextConfig = upsertFeaturesSection(currentConfig || '');
nextConfig = stripChedexBlock(nextConfig).trimEnd();
nextConfig = `${nextConfig}\n\n${buildAgentConfigBlock(targets.agentsDir)}\n`;
const currentHooksConfig = await readJsonIfExists(targets.hooksConfigPath, { hooks: {} });
const nextHooksConfig = mergeManagedHooksConfig(currentHooksConfig, targets);

if (!dryRun) {
  await writeFileIfChanged(targets.configPath, nextConfig);
  await writeJsonIfChanged(targets.hooksConfigPath, nextHooksConfig);
  const uninstall = renderUninstallNote(targets, { backups: uninstallBackups });
  await writeFileIfChanged(targets.uninstallPath, uninstall);
}

const legacyCleanup = dryRun
  ? { removedFiles: 0, removedAgentsDir: false, removedOmxHome: false }
  : await cleanupLegacyOmxAgents();

const summary = [
  `codex_home=${targets.codexHome}`,
  `legacy_omx_home=${legacyOmxHomePath}`,
  `legacy_omx_home_present_before=${legacyOmxHomePresentBefore ? 'true' : 'false'}`,
  `legacy_omx_agents_dir=${legacyOmxAgentsPath}`,
  `legacy_omx_agents_present_before=${legacyOmxAgentsPresentBefore ? 'true' : 'false'}`,
  `roles=${roleNames().length}`,
  `skills=${listSkills().length}`,
  `dry_run=${dryRun ? 'true' : 'false'}`,
  `legacy_omx_agents_removed=${legacyCleanup.removedFiles}`,
  `legacy_omx_agents_dir_removed=${legacyCleanup.removedAgentsDir ? 'true' : 'false'}`,
  `legacy_omx_home_removed=${legacyCleanup.removedOmxHome ? 'true' : 'false'}`,
  `codex_version=${hookProbe.version}`,
  `codex_hooks_feature_stage=${hookProbe.feature.stage}`,
  `codex_hooks_feature_enabled_before_install=${hookProbe.feature.enabled ? 'true' : 'false'}`,
  `hooks_config=${targets.hooksConfigPath}`,
  `hook_runtime=${targets.hookRuntimePath}`,
  `markers=${chedexMarkerStart} .. ${chedexMarkerEnd}`,
];

process.stdout.write(`${summary.join('\n')}\n`);
