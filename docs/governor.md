# Governor

The Chedex governor is the native lifecycle layer for governed workflows.

## Requirements

- Codex CLI `>= 0.114.0`
- `codex_hooks` feature available in `codex features list`

Install enables `codex_hooks = true` and writes a managed `hooks.json` beside `config.toml`.

## Installed Paths

- `~/.codex/hooks/chedex/chedex-governor.mjs`
- `~/.codex/hooks.json`
- `~/.codex/workflows/`

The active index at `~/.codex/workflows/_active.json` is created on first governed workflow sync, not during install.

## Governed Modes

These workflows are governed:

- `autopilot`
- `ralph`
- direct top-level `ultrawork`

Plain direct turns and small `execute` tasks are not governed unless they explicitly opt into the workflow contract.

## Hook Responsibilities

- `SessionStart` restores compact workflow context from the active workflow index.
- `Stop` blocks ambiguous endings until the current workflow is terminal.

## Active Workflow Index

The active workflow index lives at:

- `~/.codex/workflows/_active.json`

It is keyed by absolute workspace `cwd`.
Each entry records:

- `mode`
- `task`
- `workflow_root`
- `progress_path`
- `verify_path`
- `handoff_path` (`null` is allowed for direct top-level `ultrawork`)
- `status`
- `phase`
- `next_step`
- `updated_at`

## Governed `progress.json`

Required fields:

- `schema_version`
- `mode`
- `task`
- `active`
- `status`
- `phase`
- `updated_at`
- `workflow_root`
- `next_step`
- `artifacts`
- `verification`
- `blocker`
- `risks`

`phase` must be a non-empty string.
`risks` must be an array of strings and may be empty.

Status vocabulary:

- non-terminal: `active`
- safe-stop terminal: `completed`, `paused`, `blocked`, `failed`, `cancelled`

Stop-gate rules:

- `active` always blocks stop
- `completed` requires `verification.state = "satisfied"` and non-empty evidence
- `paused`, `blocked`, `failed`, and `cancelled` require `next_step` or `blocker`

## `handoff.json`

Governed plans and richer governed workflows such as `ralph` and `autopilot` should produce `handoff.json` with:

- `task`
- `acceptance_criteria`
- `verification_targets`
- `delegation_roster`
- `execution_lane`
- `source_artifacts`
- `approved_at`

Direct top-level `ultrawork` may omit `handoff.json` when no governed plan admitted the work. Its minimum governed state is `progress.json`, `verify.md`, and active index sync.

## Helper Commands

The installed governor runtime also exposes helper commands:

```bash
"$CODEX_HOME/hooks/chedex/chedex-governor.mjs" workflow-sync --progress /abs/path/to/progress.json
"$CODEX_HOME/hooks/chedex/chedex-governor.mjs" workflow-clear --cwd /abs/path/to/workspace
```

If `CODEX_HOME` is unset, replace it with `~/.codex`.
