# Install

## Requirements

- Codex CLI `>= 0.128.0`
- Latest verified Codex CLI: `0.128.0`
- `codex features list` must expose stable/enabled `codex_hooks` and `multi_agent`
- Node `>= 20`

Chedex now fails install if the native lifecycle hook surface is unavailable.
The managed lifecycle hook set includes `SessionStart`, `UserPromptSubmit`, and `Stop`.

## Global Install

From the repo root:

```bash
npm run generate:agents
npm run install:user
```

Install copies the checked-in generated agent TOMLs as-is. If prompts or registry metadata changed and the generated agents are stale, install fails and tells you to run `npm run generate:agents` first.
Once install has captured backups for managed paths, it writes `CHEDEX_UNINSTALL.json` before later managed copies so `npm run uninstall:user` can recover from a late install failure.

This installs:

- `AGENTS.template.md` into `~/.codex/AGENTS.md`
- `prompts/*.md` into `~/.codex/prompts/`
- the registered `skills/cdx-<name>/` directories into `~/.codex/skills/`: `cdx-clarify`, `cdx-deep-interview`, `cdx-autoresearch-plan`, `cdx-autoresearch-loop`, `cdx-plan`, `cdx-review`, `cdx-execute`, `cdx-tdd`, `cdx-ultrawork`, `cdx-ralph`, and `cdx-autopilot`
- `agents/*.toml` into `~/.codex/agents/`
- `hooks/*` into `~/.codex/hooks/chedex/`
- a managed `hooks.json` into `~/.codex/hooks.json`
- a managed Chedex agent block into `~/.codex/config.toml`
- `CHEDEX_UNINSTALL.md` and `CHEDEX_UNINSTALL.json` into `~/.codex/` for reversible uninstall metadata

Codex `0.128.0` owns the stable/default-on `codex_hooks` and `multi_agent` feature surfaces. Chedex no longer writes `multi_agent = true` or `codex_hooks = true` into `config.toml`; install validates that both native features are enabled before it writes managed files, and uninstall still cleans up older managed entries when no backup restore is available.

Codex `0.128.0` still installs bundled system skills under `~/.codex/skills/.system/` and enables tool discovery plus image generation by default. CHEDEX deliberately manages only `cdx-*` top-level user skill directories under `~/.codex/skills/`, so the current install shape coexists with native Codex instead of overwriting it or occupying plain native names. Current bundled Codex names (`imagegen`, `openai-docs`, `plugin-creator`, `skill-creator`, `skill-installer`) do not collide with the `cdx-*` CHEDEX namespace.

During install, CHEDEX also removes previously managed legacy unprefixed skill directories such as `plan`, `execute`, and `review` when they are present in the managed install state, so the default install migrates toward the prefixed namespace.

Managed hook events:

- `SessionStart`
- `Stop`
- `UserPromptSubmit`

Install merges CHEDEX-managed hook handlers into `~/.codex/hooks.json` after stripping only prior CHEDEX-managed entries, so unrelated native or user-defined hook groups are preserved.
Managed CHEDEX hook handlers use stable `Chedex governor: managed:v1:<event>` status markers while uninstall still strips older unversioned CHEDEX handlers.
Codex `0.124.0` and later also support inline hooks in `config.toml` and managed hooks in `requirements.toml`. CHEDEX still writes the managed lifecycle set to user-global `~/.codex/hooks.json`; install fails if it detects the exact same managed lifecycle hook represented in inline `config.toml` hook tables.
Codex `0.124.0` and later broaden `PreToolUse`, `PostToolUse`, and `PermissionRequest` hook payloads beyond Bash. CHEDEX does not install those tool-use hooks today, but future tool-use hook code should treat `tool_name` as arbitrary and `tool_input` as schema-free.
Codex `0.128.0` adds persisted `/goal` workflows, native `codex update`, plugin marketplace add/upgrade/remove commands, plugin-bundled hooks, external-agent config/session import, stronger permission-profile controls, and more explicit MultiAgentV2 controls. CHEDEX does not depend on those APIs for install, but `/goal`, plugin marketplace, plugin hooks, external-agent import, permission profiles, app-server schemas, and MultiAgentV2 paths should be smoke-tested if you rely on them.

The managed `SessionStart` matcher now covers `startup|resume|clear`. CHEDEX treats `clear` as a soft-clear path: it preserves governed workflow state, keeps stop protection intact, and emits a compact notice instead of the full resume-context block.
Codex `0.122.0` tightened trusted-workspace handling for project hooks and exec policies. CHEDEX continues to install user-global hooks into `~/.codex/hooks.json`, so the supported upgrade path is to keep the governor global and recheck restricted-filesystem workflows rather than relocating hooks into repo-local `.codex`.

Chedex writes native agent files only under `~/.codex` unless `CODEX_HOME` is set.
Artifact-backed workflow skills keep their artifacts under `~/.codex/workflows/`.
`cdx-deep-interview` keeps durable `context.md`, `interview.md`, and `spec.md` artifacts under `~/.codex/workflows/deep-interview/` and does not require `progress.json` or `handoff.json` by default.
`cdx-autoresearch-plan` may keep `context.md`, `spec.md`, and optionally `results.tsv` under `~/.codex/workflows/autoresearch-plan/`, and does not require `progress.json` or `handoff.json` by default.
`cdx-autopilot` keeps governed broad-work artifacts under `~/.codex/workflows/autopilot/`, typically including `context.md`, `spec.md`, `plan.md`, `handoff.json`, `progress.json`, and `verify.md`; nested `cdx-ralph` and `cdx-ultrawork` slices should report through the current `cdx-autopilot` workflow unless ownership is explicitly transferred.
For `cdx-autopilot`, the governor now enforces phase-aware artifacts: `context.md` by `specify`, `spec.md` by `plan`, `plan.md` plus `handoff.json` by `execute`, and `verify.md` by `verify` or terminal states.
`cdx-autoresearch-loop` keeps governed research artifacts under `~/.codex/workflows/autoresearch-loop/`, including `results.tsv`, `handoff.json`, `progress.json`, and `verify.md`.
Governed workflows such as `cdx-autopilot`, `cdx-ralph`, and `cdx-autoresearch-loop` keep their execution state under `~/.codex/workflows/`.
Direct top-level `cdx-ultrawork` uses a minimal workflow root under `~/.codex/workflows/ultrawork/` with `progress.json`, active index sync, and `verify.md` by the verify phase or terminal states; it may omit `handoff.json`.
`SessionStart` also performs a best-effort release audit against the published `@openai/codex` package and caches the result in `~/.codex/workflows/_codex_release_audit.json`.
Dynamic release-delta guidance is cached separately in `~/.codex/workflows/_codex_release_deltas.json`, and incompatible remote delta bundles fall back to bundled or cached guidance.
Completed and cancelled governed workflows are archived into `~/.codex/workflows/_archive.json` when they leave the active index, and their managed workflow cache directories are removed after the archive snapshot is written.
`handoff.json` is required when a governed mode reaches its admitted execution point: `cdx-autopilot` and `cdx-ralph` require it by `execute`, while `cdx-autoresearch-loop` requires it for the whole governed loop. Those handoffs require stored `architect` and `verifier` approval entries under `approvals`; direct top-level `cdx-ultrawork` may omit `handoff.json`.
Codex `0.128.0` exposes native `/goal`, and the local feature probe reports `goals` as `under development true`. CHEDEX keeps its governed workflow runtime because `/goal` has not yet proved equivalent `progress.json` / `handoff.json` / `verify.md` ownership or stop-gated verification closeout. CHEDEX uses `cdx-*` skill names to avoid occupying future native plain skill names. The practical 0.128 rechecks are duplicate hook configuration, `/goal` workflow parity, plugin marketplace and plugin-bundled hook behavior, external-agent import, permission-profile selection, app-server schemas, and MultiAgentV2 behavior if you depend on those paths.
`workflow-sync` preserves the current owner for the same workflow root, rejects a different active owner for the same workspace unless `--replace` is explicit, and records lock-owner metadata that can be cleared with `workflow-lock-repair` when a stale lock is confirmed.
The release audit is advisory only: it does not auto-upgrade Codex CLI. When an upgrade is needed, its first step is native `codex update`.

## Notes

- Use `cdx-autopilot` when you want one strict broad-work entrypoint that should stay governed across clarify/spec/plan/execute/verify while nested execution slices report through it.
- Use `cdx-autoresearch-plan` when the research spec is still forming and `cdx-autoresearch-loop` when the governed loop is ready to run.

## Dry Run

```bash
npm run install:user:dry
```

Dry run validates prerequisites and prints the install summary without writing install artifacts or regenerating tracked repo outputs.

## Uninstall

```bash
npm run uninstall:user
```

Uninstall uses `CHEDEX_UNINSTALL.json` to restore backed-up managed files and remove files created by install.
`CHEDEX_UNINSTALL.json` is the authoritative rollback record and is written before managed install mutations, so `npm run uninstall:user` can recover from a mid-install failure.
If an existing `config.toml`, `hooks.json`, `AGENTS.md`, managed hook asset, managed prompt, managed agent TOML, or managed skill directory was present, install also creates a timestamped backup under `~/.codex/.chedex-backups/<timestamp>/`.
If no pre-existing file was present for one of those paths, uninstall removes the file that install created.
`~/.codex/workflows/_active.json` is created later by the first governed workflow sync, not by install itself.
