# Install

## Requirements

- Codex CLI `>= 0.114.0`
- Latest verified Codex CLI: `0.117.0`
- `codex features list` must expose `codex_hooks`
- Node `>= 20`

Chedex now fails install if the native lifecycle hook surface is unavailable.
On Codex `>= 0.116.0`, install also wires a managed `UserPromptSubmit` hook for minimal governed-workflow preflight.

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
- the registered `skills/<name>/` directories into `~/.codex/skills/`: `clarify`, `deep-interview`, `autoresearch-plan`, `autoresearch-loop`, `plan`, `review`, `execute`, `tdd`, `ultrawork`, `ralph`, and `autopilot`
- `agents/*.toml` into `~/.codex/agents/`
- `hooks/*` into `~/.codex/hooks/chedex/`
- a managed `hooks.json` into `~/.codex/hooks.json`
- a managed Chedex agent block into `~/.codex/config.toml`
- `CHEDEX_UNINSTALL.md` and `CHEDEX_UNINSTALL.json` into `~/.codex/` for reversible uninstall metadata
- `multi_agent = true`, `child_agents_md = true`, and `codex_hooks = true` inside the `~/.codex/config.toml` `[features]` section

Managed hook events:

- `SessionStart`
- `Stop`
- `UserPromptSubmit` when the installed Codex CLI supports it (`>= 0.116.0`)

Chedex writes native agent files only under `~/.codex` unless `CODEX_HOME` is set.
Artifact-backed workflow skills keep their artifacts under `~/.codex/workflows/`.
`deep-interview` keeps durable `context.md`, `interview.md`, and `spec.md` artifacts under `~/.codex/workflows/deep-interview/` and does not require `progress.json` or `handoff.json` by default.
`autoresearch-plan` may keep `context.md`, `spec.md`, and optionally `results.tsv` under `~/.codex/workflows/autoresearch-plan/`, and does not require `progress.json` or `handoff.json` by default.
`autopilot` keeps governed broad-work artifacts under `~/.codex/workflows/autopilot/`, including `context.md`, `spec.md`, `plan.md`, `handoff.json`, `progress.json`, and `verify.md`; nested `ralph` and `ultrawork` slices should report through the current `autopilot` workflow unless ownership is explicitly transferred.
`autoresearch-loop` keeps governed research artifacts under `~/.codex/workflows/autoresearch-loop/`, including `results.tsv`, `handoff.json`, `progress.json`, and `verify.md`.
Governed workflows such as `autopilot`, `ralph`, and `autoresearch-loop` keep their execution state under `~/.codex/workflows/`.
Direct top-level `ultrawork` uses a minimal workflow root under `~/.codex/workflows/ultrawork/` with `progress.json`, active index sync, and `verify.md` when it needs a durable evidence log; it may omit `handoff.json`.
`SessionStart` also performs a best-effort release audit against the published `@openai/codex` package and caches the result in `~/.codex/workflows/_codex_release_audit.json`.
`handoff.json` is required for governed plans and the richer `autopilot` / `ralph` / `autoresearch-loop` workflows, but direct top-level `ultrawork` may omit it.
The release audit is advisory only: it does not auto-upgrade Codex CLI.

## Notes

- Use `autopilot` when you want one strict broad-work entrypoint that should stay governed across clarify/spec/plan/execute/verify while nested execution slices report through it.
- Use `autoresearch-plan` when the research spec is still forming and `autoresearch-loop` when the governed loop is ready to run.

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
