import { copyFile, readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import {
  copyTree,
  ensureDir,
  ensureExecutable,
  installManifestPaths,
  listSkills,
  removeTree,
  repoPath,
  roleNames,
} from './lib.mjs';

const manifest = installManifestPaths();
const mirrorRoot = repoPath('.codex');
const mirrorPromptsDir = join(mirrorRoot, 'prompts');
const mirrorSkillsDir = join(mirrorRoot, 'skills');
const mirrorAgentsDir = join(mirrorRoot, 'agents');
const mirrorHookAssetsDir = join(mirrorRoot, 'hooks', 'chedex');
const mirrorConfigPath = join(mirrorRoot, 'config.toml');
const mirrorHooksConfigPath = join(mirrorRoot, 'hooks.json');
const mirrorUninstallPath = join(mirrorRoot, 'CHEDEX_UNINSTALL.md');
const mirrorUninstallStatePath = join(mirrorRoot, 'CHEDEX_UNINSTALL.json');
const mirrorWorkflowsDir = join(mirrorRoot, 'workflows');

await ensureDir(mirrorRoot);
await copyFile(manifest.templateAgents, join(mirrorRoot, 'AGENTS.md'));

await removeTree(mirrorPromptsDir);
await removeTree(mirrorSkillsDir);
await removeTree(mirrorAgentsDir);
await removeTree(mirrorHookAssetsDir);
await removeTree(mirrorConfigPath);
await removeTree(mirrorHooksConfigPath);
await removeTree(mirrorUninstallPath);
await removeTree(mirrorUninstallStatePath);
await removeTree(mirrorWorkflowsDir);

await copyTree(manifest.promptsDir, mirrorPromptsDir);
for (const skill of listSkills()) {
  await copyTree(join(manifest.skillsDir, skill), join(mirrorSkillsDir, skill));
}
await copyTree(manifest.agentsDir, mirrorAgentsDir);
await copyTree(manifest.hooksDir, mirrorHookAssetsDir);
await ensureExecutable(join(mirrorHookAssetsDir, 'chedex-governor.mjs'));

for (const name of await readdir(mirrorRoot)) {
  if (name.includes('.chedex.bak-')) {
    await rm(join(mirrorRoot, name), { force: true });
  }
}

process.stdout.write(`mirror-refreshed roles=${roleNames().length} skills=${listSkills().length}\n`);
