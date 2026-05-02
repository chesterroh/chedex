import { copyFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import {
  buildAgentConfigBlock,
  chedexMarkerEnd,
  chedexMarkerStart,
  copyPath,
  copyTree,
  detectInlineManagedHookDuplicates,
  ensureExecutable,
  ensureDir,
  fileExists,
  installManifestPaths,
  installTargets,
  legacySkillNames,
  listRelativeFiles,
  listSkills,
  mergeManagedHooksConfig,
  probeCodexHooksSupport,
  readJsonIfExists,
  readTextIfExists,
  removeTree,
  renderUninstallNote,
  roleNames,
  staleGeneratedAgents,
  stripChedexBlock,
  stripManagedFeaturesSection,
  timestampSlug,
  writeFileIfChanged,
  writeJsonIfChanged,
} from './lib.mjs';

const dryRun = process.argv.includes('--dry-run');
const targets = installTargets();
const manifest = installManifestPaths();
const backupSlug = timestampSlug();
const backupRoot = join(targets.backupsDir, backupSlug);
const configPresentBefore = await fileExists(targets.configPath);
const existingConfig = await readTextIfExists(targets.configPath);
const hooksConfigPresentBefore = await fileExists(targets.hooksConfigPath);
const agentsMdPresentBefore = await fileExists(targets.agentsMdPath);
const hookAssetsDirPresentBefore = await fileExists(targets.hookAssetsDir);
const hookRuntimePresentBefore = await fileExists(targets.hookRuntimePath);
const managedPromptPaths = roleNames().map((name) => join(targets.promptsDir, `${name}.md`));
const managedAgentPaths = roleNames().map((name) => join(targets.agentsDir, `${name}.toml`));
const managedSkillPaths = [...listSkills(), ...legacySkillNames()].map((name) => join(targets.skillsDir, name));
const managedHookPaths = (await listRelativeFiles(manifest.hooksDir)).map((relativePath) => join(targets.hookAssetsDir, relativePath));
const currentHooksConfig = await readJsonIfExists(targets.hooksConfigPath, { hooks: {} });
const previousUninstallState = await readJsonIfExists(targets.uninstallStatePath, null);
const hookProbe = probeCodexHooksSupport();
const inlineHookDuplicates = detectInlineManagedHookDuplicates(existingConfig, {
  supportedHookEvents: hookProbe.supportedHookEvents,
});
const uninstallBackups = [];
const uninstallState = {
  schema_version: 1,
  existing_before: {
    config: configPresentBefore,
    hooksConfig: hooksConfigPresentBefore,
    agentsMd: agentsMdPresentBefore,
    hookAssetsDir: hookAssetsDirPresentBefore,
    hookRuntime: hookRuntimePresentBefore,
  },
  backups: {
    config: null,
    hooksConfig: null,
    agentsMd: null,
    hookAssetsDir: null,
    hookRuntime: null,
  },
  managed_paths: {
    prompts: [],
    agents: [],
    skills: [],
    hooks: [],
  },
};

function unionManagedPaths(currentPaths, recordedEntries) {
  const allPaths = new Set(currentPaths);
  for (const entry of recordedEntries || []) {
    if (entry?.target_path) {
      allPaths.add(entry.target_path);
    }
  }
  return [...allPaths];
}

function backupDestinationFor(targetPath) {
  const relativePath = relative(targets.codexHome, targetPath);
  if (!relativePath || relativePath.startsWith('..')) {
    throw new Error(`refusing to write backup outside CODEX_HOME: ${targetPath}`);
  }
  return join(backupRoot, relativePath);
}

async function backupManagedPath(targetPath, bucket) {
  if (!(await fileExists(targetPath))) {
    uninstallState.managed_paths[bucket].push({
      target_path: targetPath,
      backup_path: null,
      type: null,
    });
    return;
  }

  const backupPath = backupDestinationFor(targetPath);
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

const inlineHookErrors = inlineHookDuplicates.filter((item) => item.severity === 'error');
if (inlineHookErrors.length > 0) {
  throw new Error([
    'Chedex managed hook duplicate detected in config.toml.',
    ...inlineHookErrors.map((item) => `- ${item.reason}`),
    'Remove the duplicate inline hook table or keep Chedex-managed lifecycle hooks in hooks.json only.',
  ].join('\n'));
}

for (const warning of inlineHookDuplicates.filter((item) => item.severity === 'warning')) {
  process.stderr.write(`warning: ${warning.reason}\n`);
}

const staleAgents = await staleGeneratedAgents();
if (staleAgents.length > 0) {
  throw new Error(
    `generated agents are stale for: ${staleAgents.join(', ')}\nRun npm run generate:agents before install.`,
  );
}

for (const dir of [
  targets.codexHome,
  targets.backupsDir,
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
    const backupPath = backupDestinationFor(targets.configPath);
    await ensureDir(dirname(backupPath));
    await copyFile(targets.configPath, backupPath);
    uninstallBackups.push(backupPath);
    uninstallState.backups.config = backupPath;
  }

  if (hooksConfigPresentBefore) {
    const backupPath = backupDestinationFor(targets.hooksConfigPath);
    await ensureDir(dirname(backupPath));
    await copyFile(targets.hooksConfigPath, backupPath);
    uninstallBackups.push(backupPath);
    uninstallState.backups.hooksConfig = backupPath;
  }

  if (agentsMdPresentBefore) {
    const backupPath = backupDestinationFor(targets.agentsMdPath);
    await ensureDir(dirname(backupPath));
    await copyFile(targets.agentsMdPath, backupPath);
    uninstallBackups.push(backupPath);
    uninstallState.backups.agentsMd = backupPath;
  }

  if (hookAssetsDirPresentBefore) {
    const backupPath = backupDestinationFor(targets.hookAssetsDir);
    const type = await copyPath(targets.hookAssetsDir, backupPath);
    uninstallBackups.push(backupPath);
    uninstallState.backups.hookAssetsDir = backupPath;
    uninstallState.managed_paths.hooks.push({
      target_path: targets.hookAssetsDir,
      backup_path: backupPath,
      type,
    });
    if (hookRuntimePresentBefore && type === 'directory') {
      uninstallState.backups.hookRuntime = join(backupPath, 'chedex-governor.mjs');
    }
  } else {
    uninstallState.managed_paths.hooks.push({
      target_path: targets.hookAssetsDir,
      backup_path: null,
      type: 'directory',
    });
  }

  for (const path of unionManagedPaths(managedPromptPaths, previousUninstallState?.managed_paths?.prompts)) {
    await backupManagedPath(path, 'prompts');
  }

  for (const path of unionManagedPaths(managedAgentPaths, previousUninstallState?.managed_paths?.agents)) {
    await backupManagedPath(path, 'agents');
  }

  for (const path of unionManagedPaths(managedSkillPaths, previousUninstallState?.managed_paths?.skills)) {
    await backupManagedPath(path, 'skills');
  }

  // Persist rollback metadata before managed files are copied so a later
  // install failure still leaves enough state for `uninstall:user`.
  await writeJsonIfChanged(targets.uninstallStatePath, uninstallState);

  for (const path of unionManagedPaths(managedPromptPaths, previousUninstallState?.managed_paths?.prompts)) {
    await removeTree(path);
  }

  for (const path of unionManagedPaths(managedAgentPaths, previousUninstallState?.managed_paths?.agents)) {
    await removeTree(path);
  }

  for (const path of unionManagedPaths(managedSkillPaths, previousUninstallState?.managed_paths?.skills)) {
    await removeTree(path);
  }

  await removeTree(targets.hookAssetsDir);
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

let nextConfig = stripManagedFeaturesSection(stripChedexBlock(existingConfig || '')).trimEnd();
const agentConfigBlock = buildAgentConfigBlock(targets.agentsDir);
nextConfig = nextConfig ? `${nextConfig}\n\n${agentConfigBlock}\n` : `${agentConfigBlock}\n`;
const nextHooksConfig = mergeManagedHooksConfig(currentHooksConfig, targets, {
  supportedHookEvents: hookProbe.supportedHookEvents,
});

if (!dryRun) {
  await writeFileIfChanged(targets.configPath, nextConfig);
  await writeJsonIfChanged(targets.hooksConfigPath, nextHooksConfig);
  const uninstall = renderUninstallNote(targets, {
    backups: uninstallBackups,
  });
  await writeFileIfChanged(targets.uninstallPath, uninstall);
}

const summary = [
  `codex_home=${targets.codexHome}`,
  `roles=${roleNames().length}`,
  `skills=${listSkills().length}`,
  `dry_run=${dryRun ? 'true' : 'false'}`,
  `codex_version=${hookProbe.version}`,
  `codex_hooks_feature_stage=${hookProbe.feature.stage}`,
  `codex_hooks_feature_enabled=${hookProbe.feature.enabled ? 'true' : 'false'}`,
  `multi_agent_feature_stage=${hookProbe.multiAgentFeature.stage}`,
  `multi_agent_feature_enabled=${hookProbe.multiAgentFeature.enabled ? 'true' : 'false'}`,
  'managed_feature_flags=not_written',
  `managed_hook_events=${hookProbe.supportedHookEvents.join(',')}`,
  `inline_hook_duplicate_check=${inlineHookDuplicates.length === 0 ? 'ok' : 'warning'}`,
  `hooks_config=${targets.hooksConfigPath}`,
  `hook_runtime=${targets.hookRuntimePath}`,
  `uninstall_state=${targets.uninstallStatePath}`,
  `markers=${chedexMarkerStart} .. ${chedexMarkerEnd}`,
];

process.stdout.write(`${summary.join('\n')}\n`);
