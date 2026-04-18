# Chedex v0.121

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

## v0.121 Shape

`0.121` keeps the current Chedex shape verified against Codex `0.121.0` and records the official `0.116.0` / `0.117.0` / `0.118.0` / `0.119.0` / `0.120.0` / `0.121.0` release-surface upgrades in the startup release audit.

- ordinary turns stay lightweight and native
- selected governed lanes and artifact-backed planning/requirements lanes keep durable state under `~/.codex/workflows/`
- Codex `>= 0.116.0` gets the narrow `UserPromptSubmit` integrity gate in addition to `SessionStart` and `Stop`
- Chedex currently requires Codex `>= 0.114.0` with `codex_hooks` available and is verified against Codex `0.121.0`
- the repo keeps a deterministic `.codex/` mirror for installable source surfaces and verifies parity explicitly

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
- `autoresearch-plan` for turning an optimization problem into a defensible research spec and handoff
- `autoresearch-loop` for governed baseline/experiment/ledger optimization work
- `plan` for producing an actionable work plan
- `execute` for implementation with verification persistence
- `review` for reviewer-only evaluation
- `tdd` for strict failing-test-first work
- `ultrawork` for parallel execution fan-out
- `ralph` for persistent multi-step execution with artifacts and verification
- `autopilot` for strict operator-facing clarify/spec/plan/execute iteration as a governed broad-work shell

## Workflow Map

### Lightweight Or Non-Governed Lanes

- Direct turns: no workflow state unless explicitly needed
- `clarify`: reduce ambiguity quickly
- `deep-interview`: durable requirements artifacts under `~/.codex/workflows/deep-interview/<slug>/`, typically `context.md`, `interview.md`, and `spec.md`; it is not governed by `progress.json` or `handoff.json` by default
- `autoresearch-plan`: planning artifacts under `~/.codex/workflows/autoresearch-plan/<slug>/`, typically `context.md`, `spec.md`, and sometimes a seeded `results.tsv`

### Governed Lanes

- `autoresearch-loop`: governed research execution under `~/.codex/workflows/autoresearch-loop/<slug>/`
- `autopilot`: governed broad-work iteration under `~/.codex/workflows/autopilot/<slug>/`; nested `ralph` and `ultrawork` slices should report through it unless ownership is explicitly transferred
- `ralph`: persistent execution with resumable artifacts
- direct top-level `ultrawork`: minimal governed state for parallel execution

### Governed Artifact Model

- `progress.json` is the authoritative workflow record
- `handoff.json` is the plan-to-execution ratchet when a governed plan is required
- `verify.md` is the durable evidence log
- `~/.codex/workflows/_active.json` is the active workflow index

Operational details for `hooks.json`, `UserPromptSubmit`, release audit behavior, and install-owned feature flags belong in [docs/install.md](docs/install.md) and [docs/governor.md](docs/governor.md).

## Install Model

### Recommended Global Install Shape

- `~/.codex/AGENTS.md`
- `~/.codex/prompts/*.md`
- `~/.codex/skills/*/SKILL.md`
- `~/.codex/agents/*.toml`
- `~/.codex/hooks/chedex/*`
- `~/.codex/hooks.json`
- `[agents.*]` entries in `~/.codex/config.toml`
- `[features] multi_agent = true` and `codex_hooks = true` in `~/.codex/config.toml`

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

This repo reflects the lighter native-agent guidance currently installed in your global `~/.codex/AGENTS.md`. `AGENTS.template.md`, `prompts/`, and `skills/` should stay aligned with `docs/guidance-schema.md` and `docs/prompt-contract.md`.

Explicit caller-specified sub-agent model or reasoning settings should override repo defaults unless unavailable or incompatible, and prompt changes should preserve that rule through generated agents and mirrors.

## Workflow Alignment

Chedex keeps a small native-first execution chain:

- `clarify` and `deep-interview` shape requirements
- `autoresearch-plan` and `autoresearch-loop` own research grounding and governed optimization
- `ralph` and direct top-level `ultrawork` own the remaining persistent execution cases
- `autopilot` is the tight governed shell for broad iterative work, while nested `ralph` and `ultrawork` slices still report through it unless ownership is explicitly transferred

The governor still stores runtime state globally under `$CODEX_HOME/workflows/` and admits one active governed workflow entry per workspace `cwd`, but workflow synchronization now uses per-workflow locks so separate workspaces do not contend on one global runtime lock. A governed `workflow_root` cannot be attached to multiple workspaces at once.

## Codex 0.121 Alignment

Codex `0.121.0` now owns more of the native substrate directly:

- native hook execution for `SessionStart`, `UserPromptSubmit`, and `Stop`
- native skill discovery across repo, user, system, and admin roots
- bundled system skills cached under `~/.codex/skills/.system/`
- native marketplace management alongside broader plugin and MCP surfaces

Chedex `0.121` still fits on top of that surface rather than colliding with it:

- CHEDEX-managed skills install into `~/.codex/skills/<name>/`, while Codex bundled skills live under `~/.codex/skills/.system/<name>/`
- current bundled Codex system skill names (`imagegen`, `openai-docs`, `plugin-creator`, `skill-creator`, `skill-installer`) do not collide with current CHEDEX skill names
- install merges managed hook handlers into `~/.codex/hooks.json` instead of replacing unrelated hook groups
- governed workflow ownership remains CHEDEX territory under `~/.codex/workflows/`; Codex `0.121.0` does not ship a native `progress.json` / `handoff.json` / `verify.md` workflow runtime that would conflict with `autopilot`, `ralph`, or `autoresearch-loop`

The current `SessionStart` difference is intentional rather than accidental:

- Codex `0.121.0` can distinguish `SessionStart source = clear`
- CHEDEX now matches `startup|resume|clear`, but it treats `clear` as a soft-clear path: governed workflow state stays protected and the governor emits a compact notice instead of a full resume-context restore

## Current Gaps

- Repo verification still relies partly on required-text checks in `scripts/verify-repo.mjs`. This is good at catching drift, but it is not full semantic validation.
- The latest verified Codex CLI version is still maintained as repo metadata plus docs wording, not generated into docs from one canonical source.
- If a future native Codex bundled skill reuses a generic CHEDEX skill name such as `plan`, `execute`, or `review`, plain-name skill invocation would become ambiguous even though the on-disk install layout would still coexist cleanly.
- Hook asset cleanup is still path-based rather than whole-tree cleanup, so nested stale hook assets remain a reasonable follow-up sweep.

## Notes

- The prompts are the primary role surfaces. The registry is the structured metadata layer.
- Governed workflow mode requirements live in `registry/workflow-mode-schemas.mjs`, and governed handoffs now store approval provenance that the runtime validates before admission.
- `agents/*.toml` are generated artifacts. Re-run `npm run generate:agents` after changing `registry/agent-definitions.mjs` or any prompt.
- `.codex/` is a checked-in mirror of deterministic installable surfaces only. Refresh it with `npm run refresh:mirror` after changing mirrored source files.
- The governor runtime lives in [`hooks/chedex-governor.mjs`](hooks/chedex-governor.mjs), the startup release-audit helper lives in [`hooks/codex-release-audit.mjs`](hooks/codex-release-audit.mjs), and terminal workflow history is preserved in `~/.codex/workflows/_archive.json`. See [`docs/governor.md`](docs/governor.md) for the governed workflow contract.
