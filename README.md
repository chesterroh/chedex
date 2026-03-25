# Chedex v0.5.5

An homage to preceding projects such as Oh My OpenAgent, Oh My Codex, and Ouroboros.

Native-first agentic harness scaffold for Codex.

This repo is the clean source-of-truth version of the Chedex extraction that was installed into `~/.codex`. It keeps only the parts that extend Codex's native surfaces:

- global `AGENTS.md` contract patterns
- role prompts
- role registry
- workflow skills
- installable native agent definitions

It intentionally excludes external orchestration machinery such as:

- tmux team runtime
- legacy external state systems
- HUD, mailboxing, linked mode state, and runtime overlays

## v0.5.5 Shape

`0.5.5` keeps the current Chedex shape verified against Codex `0.115.0` while improving verification consistency and install hygiene introduced during the latest optimization loop.

- direct ordinary turns stay lightweight and native
- `autopilot`, `ralph`, `autoresearch-loop`, and direct top-level `ultrawork` are governed workflows
- `deep-interview` is an explicit artifact-backed requirements skill, not a governed execution workflow
- `autoresearch` is now a compatibility router, `autoresearch-plan` is non-governed planning, and `autoresearch-loop` is the governed research execution mode
- Codex native hooks provide session rehydration and stop gating
- `SessionStart` can also surface a non-blocking Codex release audit when the installed CLI lags the latest published package release
- governed workflows persist authoritative state under `~/.codex/workflows/`
- Chedex currently requires Codex `>= 0.114.0` with the `codex_hooks` feature surface available and is verified against Codex `0.115.0`
- the governed workflow schema is enforced consistently across docs, skills, and runtime validation
- the repo keeps a deterministic `.codex/` mirror for installable source surfaces and verifies parity explicitly
- reinstall now removes stale managed files inside installed skill trees instead of leaving old managed content behind

## At A Glance

If you want a native Codex harness without an extra orchestration runtime, this repo gives you the main pieces:

- prompts under `prompts/`
- installable skills under `skills/`
- generated agents under `agents/`
- a typed role registry in `registry/agent-definitions.mjs`
- lifecycle hooks under `hooks/`
- verification and install tooling under `scripts/`

The operating model is simple:

- ordinary work stays lightweight
- governed workflows add durable state only when the task needs resumability, stop protection, or an evidence trail
- install writes managed files under `~/.codex`, not into an external service layer

## What Ships

### Core Roles

- `explore` for repository search and relationship mapping
- `planner` for requirements, sequencing, and acceptance criteria
- `executor` for concrete implementation
- `architect` for read-only design and tradeoff review
- `verifier` for independent completion checks
- `debugger` for root-cause analysis
- `test-engineer` for test strategy and test authoring

### Core Skills

- `clarify` for lightweight one-question-at-a-time requirements clarification
- `deep-interview` for high-rigor requirements work with durable artifacts
- `autoresearch` for routing research-shaped work as a compatibility router
- `autoresearch-plan` for turning an optimization problem into a defensible research spec and handoff
- `autoresearch-loop` for governed baseline/experiment/ledger optimization work
- `plan` for producing an actionable work plan
- `execute` for implementation with verification persistence
- `review` for reviewer-only evaluation
- `tdd` for strict failing-test-first work
- `ultrawork` for parallel execution fan-out
- `ralph` for persistent multi-step execution with artifacts and verification
- `autopilot` for end-to-end clarify/spec/plan/execute/verify flow

## Workflow Map

### Lightweight Or Non-Governed Lanes

- Direct turns: no workflow state unless explicitly needed
- `clarify`: reduce ambiguity quickly
- `deep-interview`: durable requirements artifacts under `~/.codex/workflows/deep-interview/<slug>/`, typically `context.md`, `interview.md`, and `spec.md`; it is not governed by `progress.json` or `handoff.json` by default
- `autoresearch-plan`: planning artifacts under `~/.codex/workflows/autoresearch-plan/<slug>/`, typically `context.md`, `spec.md`, and sometimes a seeded `results.tsv`
- `autoresearch`: compatibility router that helps callers choose between planning and execution

### Governed Lanes

- `autoresearch-loop`: governed research execution under `~/.codex/workflows/autoresearch-loop/<slug>/`
- `ralph`: persistent execution with resumable artifacts
- `autopilot`: broader end-to-end governed ownership
- direct top-level `ultrawork`: minimal governed state for parallel execution

### Governed Artifact Model

Governed workflow state centers on:

- `progress.json` as the authoritative workflow record
- `handoff.json` as the plan-to-execution ratchet
- `verify.md` as the durable evidence log
- `~/.codex/workflows/_active.json` as the active workflow index
- `~/.codex/workflows/_codex_release_audit.json` as the startup release-audit cache

For research-shaped work, the lane split is:

- `autoresearch` chooses the lane when the caller has not chosen yet
- `autoresearch-plan` defines the metric, fixed layer, mutable layer, budget, and decision rule
- `autoresearch-loop` runs the bounded experiments and maintains `results.tsv`, `verify.md`, and governed progress

## Install Model

### Recommended Global Install Shape

- `~/.codex/AGENTS.md`
- `~/.codex/prompts/*.md`
- `~/.codex/skills/*/SKILL.md`
- `~/.codex/agents/*.toml`
- `~/.codex/hooks/chedex/*`
- `~/.codex/hooks.json`
- `[agents.*]` entries in `~/.codex/config.toml`
- `[features] multi_agent = true`, `child_agents_md = true`, and `codex_hooks = true` in `~/.codex/config.toml`

### Install And Deploy Commands

```bash
npm run generate:agents
npm run refresh:mirror
npm run verify
npm run install:user
```

Use `npm run install:user:dry` when you want a no-write prerequisite check. Use `npm run uninstall:user` to roll back the managed install.

`npm run install:user` copies the checked-in generated agents as-is and fails fast if they are stale, instead of regenerating tracked repo outputs implicitly. It also preserves rollback metadata so uninstall can restore prior managed state.

## Layout

- `AGENTS.template.md` - global/project template for orchestration policy
- `AGENTS.md` - repo-local instructions for developing this harness
- `registry/agent-definitions.mjs` - install/runtime source registry for scripts
- `registry/agent-definitions.ts` - typed wrapper over the runtime registry
- `prompts/` - installable role prompts
- `skills/` - installable workflow skills
- `agents/` - generated native agent TOMLs
- `hooks/` - native lifecycle governor runtime and release-audit helper installed under `~/.codex/hooks/chedex/`
- `.codex/` - checked-in mirror of deterministic installable surfaces used for parity checks
- `scripts/` - generation, install, uninstall, and verification scripts
- `docs/` - install and customization guides

## How To Evolve This Repo

Use this repo as your own harness base:

1. Evolve the prompts under `prompts/`.
2. Add or refine roles in `registry/agent-definitions.mjs`.
3. Add or refine skills under `skills/`.
4. Regenerate tracked agents when prompt or registry changes affect them.
5. Refresh the `.codex/` mirror when mirrored source surfaces change.
6. Verify before install or release.

This repo reflects the stronger delegation policy currently installed in your global `~/.codex/AGENTS.md`. `AGENTS.template.md`, `prompts/`, and `skills/` should stay aligned with `docs/guidance-schema.md` and `docs/prompt-contract.md`.

Explicit caller-specified sub-agent model or reasoning settings should override repo defaults unless unavailable or incompatible, and prompt changes should preserve that rule through generated agents and mirrors.

## Workflow Alignment

Chedex keeps a clear native-only execution chain:

- `clarify` closes a few critical gaps quickly
- `deep-interview` handles the higher-rigor interview pass when intent, scope, non-goals, or decision rights need a durable artifact trail
- `autoresearch` routes research-shaped work to the right lane when the user or caller has not chosen yet
- `autoresearch-plan` turns a stable evaluation target into a defensible research spec, fixed layer, mutable layer, and experiment queue
- `autoresearch-loop` owns governed research execution, including baseline/experiment/decide/repeat and stop-gated closeout
- `ultrawork` handles parallel fan-out for independent work, and direct top-level use keeps only the minimum governed state it needs: `progress.json`, active index sync, and `verify.md` when it needs a durable evidence log
- `ralph` wraps `ultrawork` with resumable artifacts, active workflow registration, and a hard verification loop
- `autopilot` owns broad clarify/spec/plan/execute/verify/validate work, can use `autoresearch-plan` during planning, and should hand research execution to `autoresearch-loop` when the task resolves into a governed optimization loop

The current governor model admits one active governed workflow entry per workspace `cwd`. Within one workspace, nested `ultrawork` lanes and `ralph` execution slices should normally report through the current governed owner instead of syncing competing governed state.

## Current Gaps

- The legacy `autoresearch` surface remains a compatibility router. Prefer explicit invocation of `autoresearch-plan` or `autoresearch-loop` for new work.
- Plan-hardening with `architect` and `verifier` is currently a workflow-contract requirement rather than stored governor provenance. Runtime admission still validates governed artifacts such as `handoff.json` and `progress.json`.
- Repo verification still relies partly on required-text checks in `scripts/verify-repo.mjs`. This is good at catching drift, but it is not full semantic validation.
- The latest verified Codex CLI version is still maintained as repo metadata plus docs wording, not generated into docs from one canonical source.
- Hook asset cleanup is still path-based rather than whole-tree cleanup, so nested stale hook assets remain a reasonable follow-up sweep.

## Notes

- The prompts are the primary role surfaces. The registry is the structured metadata layer.
- `agents/*.toml` are generated artifacts. Re-run `npm run generate:agents` after changing `registry/agent-definitions.mjs` or any prompt.
- `.codex/` is a checked-in mirror of deterministic installable surfaces only. Refresh it with `npm run refresh:mirror` after changing mirrored source files.
- The governor runtime lives in [`hooks/chedex-governor.mjs`](hooks/chedex-governor.mjs), and the startup release-audit helper lives in [`hooks/codex-release-audit.mjs`](hooks/codex-release-audit.mjs). See [`docs/governor.md`](docs/governor.md) for the governed workflow contract.
