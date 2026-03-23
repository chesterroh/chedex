# Chedex v0.5.3

An homage to preceding projects such as Oh My OpenAgent, Oh My Codex, and Ourobos.

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

## v0.5.3 Shape

`0.5.3` marks the current Chedex shape as Codex `0.116.0` ready while carrying forward the governed workflow and release-audit hardening introduced in the `0.4.x` line.

- direct ordinary turns stay lightweight and native
- `autopilot`, `autoresearch`, `ralph`, and direct top-level `ultrawork` are governed workflows
- `deep-interview` is an explicit artifact-backed requirements skill, not a governed execution workflow
- Codex native hooks provide session rehydration and stop gating
- `SessionStart` can also surface a non-blocking Codex release audit when the installed CLI lags the latest published package release
- governed workflows persist authoritative state under `~/.codex/workflows/`
- Chedex currently requires Codex `>= 0.114.0` with the `codex_hooks` feature surface available and is verified against Codex `0.116.0`
- the governed workflow schema is now enforced consistently across docs, skills, and runtime validation
- the repo keeps a deterministic `.codex/` mirror for installable source surfaces and verifies parity explicitly

## Layout

- `AGENTS.template.md` — global/project template for orchestration policy
- `AGENTS.md` — repo-local instructions for developing this harness
- `registry/agent-definitions.mjs` — install/runtime source registry for scripts
- `registry/agent-definitions.ts` — typed wrapper over the runtime registry
- `prompts/` — installable role prompts
- `skills/` — installable workflow skills
- `agents/` — generated native agent TOMLs
- `hooks/` — native lifecycle governor runtime and release-audit helper installed under `~/.codex/hooks/chedex/`
- `.codex/` — checked-in mirror of deterministic installable surfaces used for parity checks
- `scripts/` — generation, install, uninstall, and verification scripts
- `docs/` — install and customization guides
  - `docs/guidance-schema.md` — canonical instruction-surface structure
  - `docs/prompt-contract.md` — core behavior contract for prompts and skills

## Intended Use

Use this repo as your own harness base:

1. Evolve the prompts under `prompts/`
2. Add more roles to `registry/agent-definitions.mjs`
3. Add more skills under `skills/`
4. Install selected files into `~/.codex/` as needed
5. Regenerate and sync native agent configs when the registry or prompts change

## Recommended Global Install Shape

- `~/.codex/AGENTS.md`
- `~/.codex/prompts/*.md`
- `~/.codex/skills/*/SKILL.md`
- `~/.codex/agents/*.toml`
- `~/.codex/hooks/chedex/*`
- `~/.codex/hooks.json`
- `[agents.*]` entries in `~/.codex/config.toml`
- `[features] multi_agent = true`, `child_agents_md = true`, and `codex_hooks = true` in `~/.codex/config.toml`

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
- `deep-interview` - high-rigor Socratic requirements clarification with durable artifacts
- `autoresearch` - governed baseline/experiment/ledger workflow for metric-driven optimization loops
- `plan` - turn a request into an actionable work plan
- `execute` - implement and verify until done or clearly blocked
- `review` - reviewer-only pass for plans, diffs, or implementation claims
- `tdd` - strict failing-test-first workflow
- `ultrawork` - parallel execution layer for independent work, with minimal governed state (`progress.json`, active index sync, and `verify.md` when useful) when used top-level
- `ralph` - persistent multi-step execution with artifacts and verification
- `autopilot` - end-to-end delivery workflow from idea to verified implementation

## Workflow Artifacts

Artifact-backed workflow skills persist artifacts under `~/.codex/workflows/` (or `$CODEX_HOME/workflows/`).

Governed workflow state now centers on:

- `progress.json` as the authoritative workflow record
- `handoff.json` as the plan-to-execution ratchet for governed plans and richer workflows
- `verify.md` as the governed evidence log
- `~/.codex/workflows/_active.json` as the active workflow index
- `~/.codex/workflows/_codex_release_audit.json` as the startup release-audit cache
- native `SessionStart` and `Stop` hooks for resume and closeout enforcement

`deep-interview` keeps durable requirements artifacts under `~/.codex/workflows/deep-interview/<slug>/`, typically `context.md`, `interview.md`, and `spec.md`.
It is not governed by `progress.json` or `handoff.json` by default.
`autoresearch` keeps governed research artifacts under `~/.codex/workflows/autoresearch/<slug>/`, typically `context.md`, `spec.md`, `results.tsv`, `handoff.json`, `progress.json`, and `verify.md`.

## Workflow Alignment

Chedex keeps a clear native-only execution chain:

- `clarify` closes a few critical gaps quickly; `deep-interview` handles the higher-rigor interview pass when intent, scope, non-goals, or decision rights need a durable artifact trail.
- `autoresearch` turns a stable evaluation path into a governed baseline/experiment/ledger loop with explicit keep-or-revert decisions.
- `ultrawork` handles parallel fan-out for independent work, and direct top-level use keeps only the minimum governed state it needs: `progress.json`, active index sync, and `verify.md` when it needs a durable evidence log.
- `ralph` wraps `ultrawork` with resumable artifacts, active workflow registration, and a hard verification loop.
- `autopilot` owns the full clarify/spec/plan/execute/verify/validate lifecycle, can reuse `deep-interview` artifacts when they exist, requires `architect` and `verifier` plan admission before Execute, and hands execution to `autoresearch` for research-shaped optimization or to `ralph` for general execution.

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
- `AGENTS.template.md`, `prompts/`, and `skills/` should stay aligned with `docs/guidance-schema.md` and `docs/prompt-contract.md`.
- Explicit caller-specified sub-agent model or reasoning settings should override repo defaults unless unavailable or incompatible, and prompt changes should preserve that rule through generated agents and mirrors.
- The prompts are the primary role surfaces. The registry is the structured metadata layer.
- `agents/*.toml` are generated artifacts. Re-run `npm run generate:agents` after changing `registry/agent-definitions.mjs` or any prompt.
- `npm run install:user` copies the checked-in generated agents as-is and fails fast if they are stale, instead of regenerating tracked repo outputs implicitly.
- `.codex/` is a checked-in mirror of deterministic installable surfaces only. Refresh it with `npm run refresh:mirror` after changing mirrored source files.
- The governor runtime lives in [`hooks/chedex-governor.mjs`](hooks/chedex-governor.mjs), and the startup release-audit helper lives in [`hooks/codex-release-audit.mjs`](hooks/codex-release-audit.mjs). See [`docs/governor.md`](docs/governor.md) for the governed workflow contract.
