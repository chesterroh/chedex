# Governor

The Chedex governor is the native lifecycle layer for governed workflows.

## Requirements

- Codex CLI `>= 0.114.0`
- Latest verified Codex CLI: `0.125.0`
- `codex_hooks` feature available in `codex features list`

Install enables `multi_agent = true` and compatibility `codex_hooks = true`, and writes a managed `hooks.json` beside `config.toml`.
On Codex `0.124.0` and later, `codex_hooks` is stable/default-on; CHEDEX keeps the explicit flag for compatibility with older supported installs.
On Codex `>= 0.116.0`, the managed hook set also includes `UserPromptSubmit`.
Managed hook handlers carry stable `Chedex governor: managed:v1:<event>` status markers. Install and uninstall still recognize the older unversioned Chedex status messages for cleanup compatibility.

## Installed Paths

- `~/.codex/hooks/chedex/*`
- `~/.codex/hooks.json`
- `~/.codex/workflows/`

The active index at `~/.codex/workflows/_active.json` is created on first governed workflow sync, not during install.
The workflow archive at `~/.codex/workflows/_archive.json` is created lazily when the first completed or cancelled workflow is archived.
The release-audit cache at `~/.codex/workflows/_codex_release_audit.json` is created lazily by `SessionStart` when the audit runs successfully.
The release-delta cache at `~/.codex/workflows/_codex_release_deltas.json` is created lazily when dynamic delta guidance refreshes successfully.

## Governed Modes

These workflows are governed:

- `autopilot`
- `autoresearch-loop`
- `ralph`
- direct top-level `ultrawork`

Plain direct turns and small `execute` tasks are not governed unless they explicitly opt into the workflow contract.
autoresearch-plan is not a governed mode.
Within one workspace, `autopilot` may remain the governed owner while nested `ralph` or `ultrawork` execution slices report through it instead of syncing competing active entries.

## Hook Responsibilities

- `SessionStart` restores compact workflow context only for workflows whose governed state still validates.
- `SessionStart` warns instead of silently dropping the current workspace's indexed workflow when governed state is unreadable or malformed, so stop protection is preserved until repair or explicit clear.
- `SessionStart` also runs a non-blocking release audit. If the installed Codex CLI is behind the latest published `@openai/codex` release, it appends a short upgrade advisory and repo follow-up plan.
- Dynamic release-delta guidance is accepted only when its optional Chedex compatibility bounds match this installed contract; incompatible remote guidance falls back to bundled or cached guidance.
- `UserPromptSubmit` fails closed when the indexed governed state for the current workspace is unreadable or invalid, instead of letting prompt submission continue on top of broken workflow state.
- `Stop` blocks ambiguous or unreadable governed state until the current workflow is terminal or explicitly repaired/cleared.

`SessionStart` does not auto-upgrade Codex CLI. It stays advisory, short-timeout, and fail-open. `UserPromptSubmit` stays intentionally narrow and does not rewrite prompts; on allow it emits no JSON output, and on block it emits the hook JSON verdict.
The managed `SessionStart` matcher now covers `startup|resume|clear`. For `clear`, the governor keeps governed state indexed for the workspace and emits a soft-clear notice instead of the full restore-context block.
The governor still keys off `cwd` and governed state, not the source value by itself. `clear` does not auto-run `workflow-clear` and does not silently discard active workflow protection.
Codex `0.122.0` tightened trusted-workspace handling for project hooks and exec policies. CHEDEX keeps the governor on the user-global hook surface under `~/.codex/hooks.json`; if you later move that surface into repo-local `.codex`, trust the workspace first and recheck deny-read or isolated-exec behavior.
Codex `0.124.0` and later can also load inline hooks from `config.toml` and managed hooks from `requirements.toml`. CHEDEX stays on `hooks.json`; install now rejects exact duplicates of the managed Chedex lifecycle hooks in inline `config.toml` hook tables before it writes another copy.
Codex `0.124.0` and later also broaden `PreToolUse`, `PostToolUse`, and `PermissionRequest` hook payloads beyond Bash. The governor does not consume those tool-use events today, but future CHEDEX tool-use hooks should treat `tool_name` as arbitrary and `tool_input` as schema-free.
Codex `0.125.0` adds broader app-server, plugin, permission-profile, provider-discovery, exec JSON, and rollout-trace surfaces. The governor's lifecycle contract remains `SessionStart`, `UserPromptSubmit`, and `Stop`; smoke-test those 0.125 surfaces separately if a workflow depends on them.

## Active Workflow Index

The active workflow index lives at:

- `~/.codex/workflows/_active.json`

It is keyed by absolute workspace `cwd`.
That means the current governor model keeps one active governed workflow entry per workspace.
The runtime store itself is still global under `$CODEX_HOME/workflows/`; this is workspace-scoped ownership inside a shared index, not repo-local state on disk.
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
- `completion_token`
- `cwd`

Governor-managed `_active.json` updates are serialized and written atomically. Per-workflow sync operations also take a workflow-specific lock such as `_lock_<hash(cwd)>`, so unrelated workspaces no longer block one another on a single global runtime lock. Lock directories include `owner.json` metadata with pid, host, cwd, operation, and creation time so stale-lock diagnostics are actionable.
If the active index cannot be read safely, `Stop` fails closed and `SessionStart` surfaces a warning instead of silently clearing protection.
Syncing the same `workflow_root` / `progress_path` from the same `cwd` updates the existing owner and preserves its completion token. Syncing a different active workflow from that `cwd` is rejected unless `workflow-sync --replace` is used. Non-active terminal owners may be replaced without `--replace`.
A given `workflow_root` / `progress_path` may only be owned by one workspace at a time; reusing the same governed workflow from another workspace is rejected until the original owner clears or completes it.

When a workflow reaches `completed` or `cancelled` and the runtime clears it from `_active.json`, the governor appends the final entry and progress snapshot to `~/.codex/workflows/_archive.json` instead of deleting the history outright.

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
- `completed` requires `verification.state = "satisfied"`, non-empty evidence, and `verification.review` with a verifier `pass`
- `paused`, `blocked`, `failed`, and `cancelled` require `next_step` or `blocker`

## `handoff.json`

Governed plans and richer governed workflows such as `autopilot`, `ralph`, and `autoresearch-loop` must provide `handoff.json` with:

- `task`
- `acceptance_criteria`
- `verification_targets`
- `delegation_roster`
- `execution_lane`
- `source_artifacts`
- `approved_at`
- `approvals`

The governor validates the presence and shape of these fields.
`approvals` is an array of objects with:

- `role`
- `verdict`
- `evidence_ref`
- `approved_at`

Mode schemas declare required admission approvals. Today `autopilot`, `ralph`, and `autoresearch-loop` require stored approved entries for both `architect` and `verifier` before governed admission will succeed.

Direct top-level `ultrawork` may omit `handoff.json` when no governed plan admitted the work. Its minimum governed state is `progress.json` and active index sync, with `verify.md` used when the lane needs a durable evidence log.

## Mode-Specific Artifact Rules

Workflow mode requirements are declared in `hooks/workflow-mode-schemas.mjs` rather than scattered mode-specific governor branches, and re-exported through `registry/workflow-mode-schemas.mjs` for registry/type surfaces. Each schema declares allowed phases, handoff policy, required artifacts, required approvals, and the completion review role.

The schemas also declare phase-aware artifact requirements:

- `autopilot` requires `context` by `specify`, `spec` by `plan`, `plan` and `handoff` by `execute`, and `verify` by `verify` or terminal states.
- `ralph` requires `plan` and `handoff` by `execute`, and `verify` by `verify` or terminal states.
- direct top-level `ultrawork` keeps `handoff` optional but requires `verify` by `verify` or terminal states.

`autoresearch-loop` must also provide and keep on disk:

- `artifacts.spec`
- `artifacts.results`
- `artifacts.verify`

This keeps the governed loop tied to its accepted research contract, append-only ledger, and durable closeout evidence instead of treating it as a generic execution lane.

## Completion Review

Completed workflows must store:

- `verification.state = "satisfied"`
- at least one `verification.evidence` entry
- `verification.review.role = "verifier"`
- `verification.review.verdict = "pass"`
- `verification.review.evidence_ref`
- `verification.review.completion_token`
- `verification.review.approved_at`

The helper command below records the required verifier review record in `progress.json`:

```bash
"$CODEX_HOME/hooks/chedex/chedex-governor.mjs" verification-complete --cwd /abs/path/to/workspace --progress /abs/path/to/progress.json --evidence-ref "verifier: PASS"
```

The helper requires the workflow to already be indexed for that workspace and stamps a governor-held completion token into `verification.review` before closeout. This prevents hand-written closeout records from passing validation, but it is not yet a native runtime-invoked verifier hook.
The `--evidence-ref` value must either use a stable anchor prefix such as `cmd:`, `test:`, `verifier:`, `manual:`, or `evidence:`, or reference an existing artifact path such as `verify.md: npm run verify`.

## Helper Commands

The installed governor runtime also exposes helper commands:

```bash
"$CODEX_HOME/hooks/chedex/chedex-governor.mjs" workflow-sync --progress /abs/path/to/progress.json
"$CODEX_HOME/hooks/chedex/chedex-governor.mjs" workflow-sync --progress /abs/path/to/progress.json --replace
"$CODEX_HOME/hooks/chedex/chedex-governor.mjs" workflow-clear --cwd /abs/path/to/workspace
"$CODEX_HOME/hooks/chedex/chedex-governor.mjs" workflow-lock-repair --older-than-ms 900000 --dry-run
"$CODEX_HOME/hooks/chedex/chedex-governor.mjs" verification-complete --cwd /abs/path/to/workspace --progress /abs/path/to/progress.json --evidence-ref "verifier: PASS"
```

If `CODEX_HOME` is unset, replace it with `~/.codex`.

## Future Enhancements

- Add governor-stamped admission approval tokens for `handoff.json.approvals`; current admission still validates approval shape and required roles.
- Revisit whether the completion-review helper should eventually be driven by a first-class native hook once Codex exposes a stable post-verification event.
