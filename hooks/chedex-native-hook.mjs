#!/usr/bin/env node

import { realpath } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const MAX_INPUT_BYTES = 1024 * 1024;
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const generatedAgentsRoot = resolve(repoRoot, '.codex', 'agents');
const promptsRoot = resolve(repoRoot, 'prompts');
const agentRegistryPath = resolve(repoRoot, 'registry', 'agent-definitions.mjs');

function isWithin(parent, child) {
  const path = relative(parent, child);
  return path === '' || (!isAbsolute(path) && path !== '..' && !path.startsWith(`..${sep}`));
}

async function isChedexWorkingDirectory(cwd) {
  if (typeof cwd !== 'string' || !cwd.trim()) return false;
  try {
    const [actualRoot, actualCwd] = await Promise.all([realpath(repoRoot), realpath(resolve(cwd))]);
    return isWithin(actualRoot, actualCwd);
  } catch {
    return false;
  }
}

async function readHookInput() {
  process.stdin.setEncoding('utf8');
  let source = '';
  let size = 0;
  for await (const chunk of process.stdin) {
    size += Buffer.byteLength(chunk);
    if (size > MAX_INPUT_BYTES) throw new Error('hook input exceeds 1 MiB');
    source += chunk;
  }
  const value = JSON.parse(source);
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('hook input must be a JSON object');
  }
  return value;
}

function patchPaths(input) {
  if (input.tool_name !== 'apply_patch' || typeof input.tool_input?.command !== 'string') return [];
  const paths = [];
  const pattern = /^\*\*\* (?:Add|Update|Delete) File:\s*(.+?)\s*$/gm;
  for (const match of input.tool_input.command.matchAll(pattern)) {
    paths.push(resolve(input.cwd, match[1]));
  }
  return paths;
}

function isGeneratedAgent(path) {
  return isWithin(generatedAgentsRoot, path) && path.endsWith('.toml');
}

function isAgentSource(path) {
  return (isWithin(promptsRoot, path) && path.endsWith('.md')) || path === agentRegistryPath;
}

function sessionStartOutput() {
  return {
    hookSpecificOutput: {
      hookEventName: 'SessionStart',
      additionalContext: [
        'Chedex repository hook active.',
        'Treat prompts/*.md and registry/agent-definitions.mjs as custom-agent sources.',
        'Do not edit generated .codex/agents/*.toml files directly.',
        'After changing an agent source, run npm run generate:agents and npm run verify.',
        'Hooks enforce repository mechanics only; native Codex owns goals, subagents, permissions, and workflow state.',
      ].join(' '),
    },
  };
}

function preToolUseOutput(paths) {
  const generated = paths.filter(isGeneratedAgent);
  if (generated.length === 0) return null;
  return {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: [
        'Direct edits to generated .codex/agents/*.toml files are not allowed.',
        'Edit prompts/<role>.md or registry/agent-definitions.mjs, then run npm run generate:agents.',
      ].join(' '),
    },
  };
}

function postToolUseOutput(paths) {
  if (!paths.some(isAgentSource)) return null;
  return {
    hookSpecificOutput: {
      hookEventName: 'PostToolUse',
      additionalContext: 'A Chedex custom-agent source changed. Run npm run generate:agents, then npm run verify before claiming completion.',
    },
  };
}

async function main() {
  const input = await readHookInput();
  if (!(await isChedexWorkingDirectory(input.cwd))) return;

  let output = null;
  switch (input.hook_event_name) {
    case 'SessionStart':
      output = sessionStartOutput();
      break;
    case 'PreToolUse':
      output = preToolUseOutput(patchPaths(input));
      break;
    case 'PostToolUse':
      output = postToolUseOutput(patchPaths(input));
      break;
    default:
      break;
  }

  if (output) process.stdout.write(`${JSON.stringify(output)}\n`);
}

main().catch((error) => {
  process.stderr.write(`Chedex hook failed: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
