import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { ROLE_DEFINITIONS } from '../registry/agent-definitions.mjs';
import {
  ensureDir,
  escapeTomlMultiline,
  repoPath,
  roleNames,
  rolePromptPath,
  writeFileIfChanged,
  stripFrontmatter,
} from './lib.mjs';

function buildAgentToml(role, promptBody) {
  const content = [
    `# Chedex native agent: ${role.id}`,
    `model_reasoning_effort = "${role.default_effort}"`,
    'developer_instructions = """',
    escapeTomlMultiline([
      promptBody,
      '',
      '<metadata>',
      `- role: ${role.id}`,
      `- posture: ${role.posture}`,
      `- tool_policy: ${role.tool_policy}`,
      `- done_definition: ${role.done_definition}`,
      `- handoff_targets: ${role.handoff_targets.join(', ')}`,
      '</metadata>',
    ].join('\n')),
    '"""',
    '',
  ].join('\n');

  return content;
}

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
