# Chedex Uninstall Notes

This installation was created by the Chedex repo install script.

## Installed Paths

- /Users/chester/work/chedex/.codex/AGENTS.md
- /Users/chester/work/chedex/.codex/prompts/explore.md
- /Users/chester/work/chedex/.codex/prompts/planner.md
- /Users/chester/work/chedex/.codex/prompts/executor.md
- /Users/chester/work/chedex/.codex/prompts/architect.md
- /Users/chester/work/chedex/.codex/prompts/verifier.md
- /Users/chester/work/chedex/.codex/prompts/debugger.md
- /Users/chester/work/chedex/.codex/prompts/test-engineer.md
- /Users/chester/work/chedex/.codex/skills/clarify
- /Users/chester/work/chedex/.codex/skills/plan
- /Users/chester/work/chedex/.codex/skills/review
- /Users/chester/work/chedex/.codex/skills/execute
- /Users/chester/work/chedex/.codex/skills/tdd
- /Users/chester/work/chedex/.codex/skills/ultrawork
- /Users/chester/work/chedex/.codex/skills/ralph
- /Users/chester/work/chedex/.codex/skills/autopilot
- /Users/chester/work/chedex/.codex/agents/explore.toml
- /Users/chester/work/chedex/.codex/agents/planner.toml
- /Users/chester/work/chedex/.codex/agents/executor.toml
- /Users/chester/work/chedex/.codex/agents/architect.toml
- /Users/chester/work/chedex/.codex/agents/verifier.toml
- /Users/chester/work/chedex/.codex/agents/debugger.toml
- /Users/chester/work/chedex/.codex/agents/test-engineer.toml
- /Users/chester/work/chedex/.codex/hooks/chedex/chedex-governor.mjs
- /Users/chester/work/chedex/.codex/hooks.json
- /Users/chester/work/chedex/.codex/workflows/_active.json

## Config Changes

- /Users/chester/work/chedex/.codex/config.toml
- managed block markers: # BEGIN CHEDEX NATIVE AGENTS / # END CHEDEX NATIVE AGENTS
- features enforced: `multi_agent = true`, `child_agents_md = true`, `codex_hooks = true`

## Backup

- /Users/chester/work/chedex/.codex/config.toml.chedex.bak-20260316T143236Z
- /Users/chester/work/chedex/.codex/hooks.json.chedex.bak-20260316T143236Z

## Clean Uninstall

1. Restore the config backup or remove the managed Chedex block from config.toml
2. Remove the installed prompt, skill, agent, and AGENTS files if you no longer want them
3. Remove any leftover legacy agent files from older installs if they still exist