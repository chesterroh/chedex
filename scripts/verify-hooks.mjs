import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { repoPath } from './lib.mjs';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const hookPath = repoPath('hooks', 'chedex-native-hook.mjs');
const configPath = repoPath('.codex', 'hooks.json');

function invoke(input) {
  const result = spawnSync(process.execPath, [hookPath], {
    cwd: repoPath(),
    input: `${JSON.stringify(input)}\n`,
    encoding: 'utf8',
  });
  assert(result.status === 0, `hook failed: ${result.stderr || result.stdout}`);
  return result.stdout.trim() ? JSON.parse(result.stdout) : null;
}

const config = JSON.parse(await readFile(configPath, 'utf8'));
assert(config.description?.includes('Chedex'), 'hook config should describe its ownership');
assert(
  JSON.stringify(Object.keys(config.hooks).sort()) === JSON.stringify(['PostToolUse', 'PreToolUse', 'SessionStart']),
  'hook config should register only the three bounded Chedex events',
);

for (const [event, groups] of Object.entries(config.hooks)) {
  assert(Array.isArray(groups) && groups.length === 1, `${event} should have one matcher group`);
  assert(groups[0].hooks?.length === 1, `${event} should have one command handler`);
  assert(
    groups[0].hooks[0].command.includes('hooks/chedex-native-hook.mjs'),
    `${event} should route through the shared adapter`,
  );
}

const sessionStart = invoke({
  session_id: 'session-test',
  cwd: repoPath(),
  hook_event_name: 'SessionStart',
  source: 'startup',
});
assert(
  sessionStart?.hookSpecificOutput?.hookEventName === 'SessionStart',
  'SessionStart should emit native hook context',
);
assert(
  sessionStart.hookSpecificOutput.additionalContext.includes('npm run generate:agents'),
  'SessionStart should identify the generated-agent workflow',
);

const generatedPatchCommand = '*** Begin Patch\n*** Update File: .codex/agents/executor.toml\n@@\n-old\n+new\n*** End Patch';
const generatedPatch = invoke({
  session_id: 'session-test',
  turn_id: 'turn-test',
  cwd: repoPath(),
  hook_event_name: 'PreToolUse',
  tool_name: 'apply_patch',
  tool_input: {
    command: generatedPatchCommand,
  },
});
assert(
  generatedPatch?.hookSpecificOutput?.permissionDecision === 'deny',
  'PreToolUse should deny direct generated-agent edits',
);

const generatedPatchFromSubdirectory = invoke({
  session_id: 'session-test',
  turn_id: 'turn-test',
  cwd: join(repoPath(), 'docs'),
  hook_event_name: 'PreToolUse',
  tool_name: 'apply_patch',
  tool_input: {
    command: '*** Begin Patch\n*** Update File: ../.codex/agents/planner.toml\n@@\n-old\n+new\n*** End Patch',
  },
});
assert(
  generatedPatchFromSubdirectory?.hookSpecificOutput?.permissionDecision === 'deny',
  'PreToolUse should resolve protected paths from a Chedex subdirectory',
);

const sourcePatch = {
  session_id: 'session-test',
  turn_id: 'turn-test',
  cwd: repoPath(),
  tool_name: 'apply_patch',
  tool_input: {
    command: '*** Begin Patch\n*** Update File: prompts/executor.md\n@@\n-old\n+new\n*** End Patch',
  },
};
assert(
  invoke({ ...sourcePatch, hook_event_name: 'PreToolUse' }) === null,
  'PreToolUse should allow edits to canonical agent sources',
);
const postSourcePatch = invoke({ ...sourcePatch, hook_event_name: 'PostToolUse', tool_response: 'Done!' });
assert(
  postSourcePatch?.hookSpecificOutput?.additionalContext.includes('npm run verify'),
  'PostToolUse should remind Codex to regenerate and verify after source edits',
);

assert(
  invoke({
    session_id: 'session-test',
    turn_id: 'turn-test',
    cwd: join(repoPath(), '..'),
    hook_event_name: 'PreToolUse',
    tool_name: 'apply_patch',
    tool_input: { command: generatedPatchCommand },
  }) === null,
  'the Chedex hook should be inert outside the Chedex repository',
);

process.stdout.write('verify-hooks-ok events=3\n');
