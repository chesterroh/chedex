# Chedex Repository Guidance

This repository develops a thin, native-first Codex customization layer.

## Product Boundary

Chedex contains:

- durable guidance in `AGENTS.template.md`
- reusable workflows in `.agents/skills/`
- source prompts in `prompts/`
- generated native agents in `.codex/agents/`
- a bounded repo-local native hook adapter in `hooks/`
- reversible user install and uninstall scripts
- development-time compatibility verification

Native Codex owns hook discovery, trust, dispatch, goals, subagents, skill discovery, permissions, and session lifecycle. Chedex hooks may enforce deterministic repository mechanics, but must not add orchestration daemons, hook-governed workflow state, terminal multiplexers, status UIs, or package/runtime dependencies to reproduce native behavior.

## Working Rules

- Keep hook handlers short-lived and dependency-free; do not add an always-on runtime unless the user explicitly expands scope.
- Prefer prompt and skill contracts over executable machinery.
- Keep skills focused; merge aliases and variants into existing skills where practical.
- Preserve install/uninstall reversibility and avoid hidden global changes.
- Use `.agents/skills` for canonical repo skills and `.codex/agents` for generated project agents.
- Generated agent TOMLs must contain `name`, `description`, and `developer_instructions`.
- If a role prompt or registry entry changes, run `npm run generate:agents`.
- If install paths change, update install, uninstall, docs, and verification together.
- Keep project hook registration in `.codex/hooks.json`, route events through one adapter, and never pre-trust non-managed hooks for the user.
- For cleanup/refactor work, write the plan and lock behavior with regression coverage before production edits when coverage is missing.
- Run `npm run verify` before claiming the repository is ready.
