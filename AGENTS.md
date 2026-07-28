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

## Default Upstream Workflow

Any capability refresh, Chedex release, or skill/hook addition, change, or
removal starts with the upstream review in `docs/upstream-review.md`:

1. Resolve the latest stable Codex CLI, read its official release notes and
   changelog, refresh the Codex manual, retrieve the exact release source, and
   run `npm run audit:codex`.
2. Resolve the latest stable Oh My Codex package and current default-branch
   commit, retrieve both source snapshots into a temporary directory, and read
   the changelog plus relevant skill and hook changes.
3. Compare current Codex, current Chedex, and the retrieved upstream. Treat a
   clean stable Codex install with default-enabled features as the native
   baseline; optional experimental flags and third-party plugins do not count.
4. Prefer `NATIVE` or deletion when Codex already covers the behavior. Merge
   into an existing skill before adding a new one. Add a hook only for a
   deterministic lifecycle gap that guidance, a skill, or native permissions
   cannot enforce.
5. Re-specify retained behavior against native Codex contracts; do not vendor,
   copy, or depend on the reviewed implementation.
6. Record versions, immutable commits, the complete disposition, and a
   no-change result when applicable in the delta audits, then run the required
   generation and verification gates.

Do not begin extraction from a stale recorded snapshot. The current retrieval
and native-capability audit are evidence prerequisites, not optional follow-up.
Existing Chedex surfaces have no grandfathered status; revalidate the complete
installed skill and hook set for each release.

## Working Rules

- Keep hook handlers short-lived and dependency-free; do not add an always-on runtime unless the user explicitly expands scope.
- Keep the primary product surface limited to differentiated native skills and bounded hooks; guidance, agents, installers, and audits support those surfaces.
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
