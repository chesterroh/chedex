import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { ROLE_DEFINITIONS } from '../registry/agent-definitions.mjs';
import {
  buildAgentToml,
  ensureDir,
  repoPath,
  roleNames,
  rolePromptPath,
  writeFileIfChanged,
  stripFrontmatter,
} from './lib.mjs';

let updated = 0;
await ensureDir(repoPath('agents'));

for (const name of roleNames()) {
  const role = ROLE_DEFINITIONS[name];
  const prompt = await readFile(rolePromptPath(name), 'utf8');
  const promptBody = stripFrontmatter(prompt);
  const outputPath = join(repoPath('agents'), `${name}.toml`);
  const changed = await writeFileIfChanged(outputPath, buildAgentToml(role, promptBody));
  if (changed) updated += 1;
}

process.stdout.write(`generated ${roleNames().length} agent toml files (${updated} updated)\n`);
