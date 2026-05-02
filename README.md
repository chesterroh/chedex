# Chedex v0.128

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

## v0.128 Shape

`0.128` keeps the current Chedex shape verified against Codex `0.128.0` and records the official `0.116.0` / `0.117.0` / `0.118.0` / `0.119.0` / `0.120.0` / `0.121.0` / `0.122.0` / `0.123.0` / `0.124.0` / `0.125.0` / `0.128.0` release-surface upgrades in the startup release audit.

- ordinary turns stay lightweight and native
- selected governed lanes and artifact-backed planning/requirements lanes keep durable state under `~/.codex/workflows/`
- Chedex requires Codex `>= 0.128.0` with stable/enabled `codex_hooks` and `multi_agent`
- the managed hook set always includes `SessionStart`, `UserPromptSubmit`, and `Stop`
- governed workflow sync now rejects accidental replacement of a different active owner unless `--replace` is explicit
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

- `cdx-clarify` for lightweight one-question-at-a-time requirements clarification
- `cdx-deep-interview` for high-rigor requirements work with durable artifacts
- `cdx-autoresearch-plan` for turning an optimization problem into a defensible research spec and handoff
- `cdx-autoresearch-loop` for governed baseline/experiment/ledger optimization work
- `cdx-plan` for producing an actionable work plan
- `cdx-execute` for implementation with verification persistence
- `cdx-review` for reviewer-only evaluation
- `cdx-tdd` for strict failing-test-first work
- `cdx-ultrawork` for parallel execution fan-out
- `cdx-ralph` for persistent multi-step execution with artifacts and verification
- `cdx-autopilot` for strict operator-facing clarify/spec/plan/execute iteration as a governed broad-work shell

## Workflow Map

### Lightweight Or Non-Governed Lanes

- Direct turns: no workflow state unless explicitly needed
- `cdx-clarify`: reduce ambiguity quickly
- `cdx-deep-interview`: durable requirements artifacts under `~/.codex/workflows/deep-interview/<slug>/`, typically `context.md`, `interview.md`, and `spec.md`; it is not governed by `progress.json` or `handoff.json` by default
- `cdx-autoresearch-plan`: planning artifacts under `~/.codex/workflows/autoresearch-plan/<slug>/`, typically `context.md`, `spec.md`, and sometimes a seeded `results.tsv`

### Governed Lanes

- `cdx-autoresearch-loop`: governed research execution under `~/.codex/workflows/autoresearch-loop/<slug>/`
- `cdx-autopilot`: governed broad-work iteration under `~/.codex/workflows/autopilot/<slug>/`; nested `cdx-ralph` and `cdx-ultrawork` slices should report through it unless ownership is explicitly transferred
- `cdx-ralph`: persistent execution with resumable artifacts
- direct top-level `cdx-ultrawork`: minimal governed state for parallel execution

### Governed Artifact Model

- `progress.json` is the authoritative workflow record
- `handoff.json` is the plan-to-execution ratchet when a governed plan is required
- `verify.md` is the durable evidence log
- `~/.codex/workflows/_active.json` is the active workflow index
- governed modes enforce phase-aware artifacts, so broad workflows cannot outrun the `context.md`, `spec.md`, `plan.md`, `handoff.json`, or `verify.md` files their skills depend on
- `cdx-autopilot` and `cdx-ralph` can sync early shaping phases before `handoff.json`; execution and later phases require the handoff and its stored approvals

Operational details for `hooks.json`, `UserPromptSubmit`, release audit behavior, and native feature prerequisites belong in [docs/install.md](docs/install.md) and [docs/governor.md](docs/governor.md).

## Install Model

### Recommended Global Install Shape

- `~/.codex/AGENTS.md`
- `~/.codex/prompts/*.md`
- `~/.codex/skills/*/SKILL.md`
- `~/.codex/agents/*.toml`
- `~/.codex/hooks/chedex/*`
- `~/.codex/hooks.json`
- `[agents.*]` entries in `~/.codex/config.toml`
- stable/enabled native `multi_agent` and `codex_hooks` features from Codex itself

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

- `cdx-clarify` and `cdx-deep-interview` shape requirements
- `cdx-autoresearch-plan` and `cdx-autoresearch-loop` own research grounding and governed optimization
- `cdx-ralph` and direct top-level `cdx-ultrawork` own the remaining persistent execution cases
- `cdx-autopilot` is the tight governed shell for broad iterative work, while nested `cdx-ralph` and `cdx-ultrawork` slices still report through it unless ownership is explicitly transferred

The governor still stores runtime state globally under `$CODEX_HOME/workflows/` and admits one active governed workflow entry per workspace `cwd`, but workflow synchronization now uses per-workflow locks so separate workspaces do not contend on one global runtime lock. A governed `workflow_root` cannot be attached to multiple workspaces at once, and a different active owner for the same workspace now requires explicit `workflow-sync --replace`.
Lock directories carry owner metadata and can be inspected or cleared with the governor `workflow-lock-repair` helper when a stale lock is confirmed.

## Codex 0.128 Alignment

Codex `0.128.0` builds on the native substrate directly with:

- side conversations and plan-mode fresh-context starts
- broader marketplace and plugin-source handling
- deny-read filesystem policies plus stricter trusted-workspace handling for project hooks and exec policies
- default-on tool discovery and image generation, while bundled system skills still live under `~/.codex/skills/.system/`
- a built-in Amazon Bedrock model provider, `/mcp verbose`, host-specific `remote_sandbox_config`, and refreshed model metadata
- stable/default-on `codex_hooks`, inline `config.toml` hooks, managed `requirements.toml` hooks, and tool-use hooks that can observe MCP tools, `apply_patch`, and long-running Bash sessions
- remote plugin marketplace list/read, app-server environment selection, quick reasoning controls, and default Fast service tier behavior for eligible ChatGPT plans
- Unix-socket app-server transport, pagination-friendly resume/fork, sticky environments, remote thread config/store plumbing, remote plugin install, and marketplace upgrade APIs
- permission-profile round-tripping across TUI sessions, user turns, MCP sandbox state, shell escalation, and app-server APIs
- provider-owned model discovery, `codex exec --json` reasoning-token usage, rollout tracing, and config/schema fixes including relative agent-role config path handling
- persisted `/goal` workflows, native `codex update`, plugin marketplace add/upgrade/remove commands, external-agent config/session import, stronger permission-profile controls, and more explicit MultiAgentV2 knobs

Chedex `0.128` fits on top of that surface rather than colliding with it:

- install stays user-global under `~/.codex/hooks.json` and `~/.codex/workflows/`, so the new project-hook trust requirements do not force moving the governor into repo-local `.codex`
- CHEDEX-managed skills install into `~/.codex/skills/cdx-<name>/`, while Codex bundled skills live under `~/.codex/skills/.system/<name>/`
- current bundled Codex system skill names (`imagegen`, `openai-docs`, `plugin-creator`, `skill-creator`, `skill-installer`) do not collide with the `cdx-*` CHEDEX skill namespace
- Chedex no longer writes `multi_agent = true` or `codex_hooks = true`; Codex `0.128.0` owns those stable/default-on native feature surfaces, and install fails if either one is disabled
- install merges managed hook handlers into `~/.codex/hooks.json` instead of replacing unrelated hook groups, stamps them with `Chedex governor: managed:v1:<event>` markers, and rejects exact duplicate managed lifecycle hooks in inline `config.toml` hook tables
- Chedex does not currently install `PreToolUse`, `PostToolUse`, or `PermissionRequest` hooks; if it later does, those hooks must treat `tool_name` as arbitrary and `tool_input` as schema-free rather than Bash-only
- spawned-agent model inheritance is already aligned: explicit caller-specified sub-agent model or reasoning settings override repo defaults unless unavailable or incompatible
- generated agent `config_file` entries remain absolute paths under `~/.codex/agents/`, so Codex `0.128.0` relative agent-role config path fixes and external-agent import are additive rather than required for Chedex install correctness
- governed workflow ownership remains CHEDEX territory under `~/.codex/workflows/`; Codex `0.128.0` exposes native `/goal`, and the local feature probe reports `goals` as `under development true`, but it has not yet proved equivalent `progress.json` / `handoff.json` / `verify.md` ownership or stop-gated verification closeout for `cdx-autopilot`, `cdx-ralph`, or `cdx-autoresearch-loop`
- release-audit upgrade guidance now points at native `codex update`; Chedex-specific dynamic deltas remain scoped to hooks, workflows, skills, agents, install/uninstall, and permission/profile compatibility
- the main 0.128-specific rechecks are `/goal` workflow parity, plugin marketplace add/upgrade/remove behavior, plugin-bundled hooks, external-agent import, permission-profile selection, app-server schemas, and MultiAgentV2 behavior if you rely on those paths

The current `SessionStart` difference is intentional rather than accidental:

- Codex `0.128.0` can still distinguish `SessionStart source = clear`
- CHEDEX now matches `startup|resume|clear`, but it treats `clear` as a soft-clear path: governed workflow state stays protected and the governor emits a compact notice instead of a full resume-context restore

## Current Gaps

- Repo verification still relies partly on required-text checks in `scripts/verify-repo.mjs`. This is good at catching drift, but it is not full semantic validation.
- The latest verified Codex CLI version is still maintained as repo metadata plus docs wording, not generated into docs from one canonical source.
- Admission approvals in `handoff.json.approvals` still validate stored role/verdict/evidence shape rather than governor-stamped approval tokens.
- The default install no longer claims plain generic skill names such as `plan`, `execute`, or `review`; use `cdx-plan`, `cdx-execute`, and `cdx-review` for CHEDEX workflows.

## Notes

- The prompts are the primary role surfaces. The registry is the structured metadata layer.
- Governed workflow mode requirements are defined in `hooks/workflow-mode-schemas.mjs` and re-exported through `registry/workflow-mode-schemas.mjs`, including phase-aware artifact requirements and handoff approval shape validation.
- `agents/*.toml` are generated artifacts. Re-run `npm run generate:agents` after changing `registry/agent-definitions.mjs` or any prompt.
- `.codex/` is a checked-in mirror of deterministic installable surfaces only. Refresh it with `npm run refresh:mirror` after changing mirrored source files.
- The governor runtime lives in [`hooks/chedex-governor.mjs`](hooks/chedex-governor.mjs), the startup release-audit helper lives in [`hooks/codex-release-audit.mjs`](hooks/codex-release-audit.mjs), and finished workflow history is preserved in `~/.codex/workflows/_archive.json` while managed workflow cache directories are pruned. See [`docs/governor.md`](docs/governor.md) for the governed workflow contract.
