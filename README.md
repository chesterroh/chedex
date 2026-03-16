# Chedex v0.2

Native-first agentic harness scaffold for Codex.

This repo is the clean source-of-truth version of the Chedex extraction that was installed into `~/.codex`.
It keeps only the parts that extend Codex's native surfaces:

- global `AGENTS.md` contract patterns
- role prompts
- role registry
- workflow skills
- installable native agent definitions

It intentionally excludes external orchestration machinery such as:

- tmux team runtime
- legacy external state systems
- HUD, mailboxing, linked mode state, and runtime overlays

## v0.2 Shape

`0.2.0` hardens the first governed Chedex shape.

- direct ordinary turns stay lightweight and native
- `autopilot`, `ralph`, and direct top-level `ultrawork` are governed workflows
- Codex native hooks provide session rehydration and stop gating
- governed workflows persist authoritative state under `~/.codex/workflows/`
- Chedex now requires Codex `>= 0.114.0` with the `codex_hooks` feature surface available
- the governed workflow schema is now enforced consistently across docs, skills, and runtime validation
- the repo keeps a deterministic `.codex/` mirror for installable source surfaces and verifies parity explicitly

## Layout

- `AGENTS.template.md` — global/project template for orchestration policy
- `AGENTS.md` — repo-local instructions for developing this harness
- `registry/agent-definitions.ts` — small typed role registry
- `registry/agent-definitions.mjs` — install/runtime source registry for scripts
- `prompts/` — installable role prompts
- `skills/` — installable workflow skills
- `agents/` — generated native agent TOMLs
- `hooks/` — native lifecycle governor runtime installed under `~/.codex/hooks/chedex/`
- `.codex/` — checked-in mirror of deterministic installable surfaces used for parity checks
- `scripts/` — generation, install, uninstall, and verification scripts
- `docs/` — install and customization guides

## Intended Use

Use this repo as your own harness base:

1. Evolve the prompts under `prompts/`
2. Add more roles to `registry/agent-definitions.ts`
3. Add more skills under `skills/`
4. Install selected files into `~/.codex/` as needed
5. Regenerate and sync native agent configs when the registry or prompts change

## Recommended Global Install Shape

- `~/.codex/AGENTS.md`
- `~/.codex/prompts/*.md`
- `~/.codex/skills/*/SKILL.md`
- `~/.codex/agents/*.toml`
- `~/.codex/hooks/chedex/chedex-governor.mjs`
- `~/.codex/hooks.json`
- `[agents.*]` entries in `~/.codex/config.toml`
- `[features] codex_hooks = true` in `~/.codex/config.toml`
- installer cleanup of legacy managed agent TOML files from older user-level installs when present

## Current Core Roles

- `explore`
- `planner`
- `executor`
- `architect`
- `verifier`
- `debugger`
- `test-engineer`

## Current Core Skills

- `clarify` - lightweight one-question-at-a-time requirements clarification
- `plan` - turn a request into an actionable work plan
- `execute` - implement and verify until done or clearly blocked
- `review` - reviewer-only pass for plans, diffs, or implementation claims
- `tdd` - strict failing-test-first workflow
- `ultrawork` - parallel execution layer for independent work, with minimal governed state (`progress.json`, `verify.md`, active index sync) when used top-level
- `ralph` - persistent multi-step execution with artifacts and verification
- `autopilot` - end-to-end delivery workflow from idea to verified implementation

## Workflow Artifacts

The long-running workflow skills are native-Codex variants, not OMX compatibility layers.
They persist artifacts under `~/.codex/workflows/` (or `$CODEX_HOME/workflows/`) instead of `.omx/`.

Governed workflow state now centers on:

- `progress.json` as the authoritative workflow record
- `handoff.json` as the plan-to-execution ratchet for governed plans and richer workflows
- `verify.md` as the governed evidence log
- `~/.codex/workflows/_active.json` as the active workflow index
- native `SessionStart` and `Stop` hooks for resume and closeout enforcement

## Workflow Alignment

Compared with the original `oh-my-codex` workflow stack, Chedex keeps the same high-level execution chain in native-only form:

- `ultrawork` handles parallel fan-out for independent work, and direct top-level use keeps only the minimum governed state it needs: `progress.json`, `verify.md`, and active index sync.
- `ralph` wraps `ultrawork` with resumable artifacts, active workflow registration, and a hard verification loop.
- `autopilot` owns the full clarify/spec/plan/execute/verify/validate lifecycle, requires `architect` and `verifier` plan admission before Execute, and hands execution to `ralph`.

These native variants intentionally exclude OMX runtime machinery such as tmux orchestration, HUD state, mailboxing, MCP-only state servers, and `.omx` persistence.

## Notes

## Commands

```bash
npm run generate:agents
npm run refresh:mirror
npm run verify
npm run install:user
npm run install:user:dry
npm run uninstall:user
```

## Notes

- This repo reflects the stronger delegation policy currently installed in your global `~/.codex/AGENTS.md`.
- The prompts are the primary role surfaces. The registry is the structured metadata layer.
- `agents/*.toml` are generated artifacts. Re-run `npm run generate:agents` after changing role metadata or prompts.
- `.codex/` is a checked-in mirror of deterministic installable surfaces only. Refresh it with `npm run refresh:mirror` after changing mirrored source files.
- The governor runtime lives in [`hooks/chedex-governor.mjs`](hooks/chedex-governor.mjs). See [`docs/governor.md`](docs/governor.md) for the governed workflow contract.
