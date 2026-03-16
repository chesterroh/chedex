import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import {
  cleanupLegacyOmxAgents,
  installTargets,
  listSkills,
  readJsonIfExists,
  readTextIfExists,
  roleNames,
  stripChedexBlock,
  stripManagedHooksConfig,
  writeFileIfChanged,
  writeJsonIfChanged,
} from './lib.mjs';

const dryRun = process.argv.includes('--dry-run');
const targets = installTargets();

const currentConfig = await readTextIfExists(targets.configPath);
const nextConfig = stripChedexBlock(currentConfig).trimEnd();
const currentHooksConfig = await readJsonIfExists(targets.hooksConfigPath, null);
const nextHooksConfig = stripManagedHooksConfig(currentHooksConfig);

if (!dryRun) {
  if (currentConfig) {
    await writeFileIfChanged(targets.configPath, `${nextConfig}\n`);
  }

  if (currentHooksConfig) {
    await writeJsonIfChanged(targets.hooksConfigPath, nextHooksConfig);
  }

  for (const name of roleNames()) {
    await rm(join(targets.promptsDir, `${name}.md`), { force: true });
    await rm(join(targets.agentsDir, `${name}.toml`), { force: true });
  }

  for (const skill of listSkills()) {
    await rm(join(targets.skillsDir, skill), { recursive: true, force: true });
  }

  await rm(targets.agentsMdPath, { force: true });
  await rm(targets.hookRuntimePath, { force: true });
  await rm(targets.hookAssetsDir, { recursive: true, force: true });
  await rm(targets.uninstallPath, { force: true });

  await cleanupLegacyOmxAgents();
}

process.stdout.write(`dry_run=${dryRun ? 'true' : 'false'}\n`);
