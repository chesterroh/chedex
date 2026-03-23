# Install

## Requirements

- Codex CLI `>= 0.114.0`
- Latest verified Codex CLI: `0.115.0`
- `codex features list` must expose `codex_hooks`
- Node `>= 20`

Chedex now fails install if the native lifecycle hook surface is unavailable.

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
- the registered `skills/<name>/` directories into `~/.codex/skills/`: `clarify`, `deep-interview`, `plan`, `review`, `execute`, `tdd`, `ultrawork`, `ralph`, and `autopilot`
- `agents/*.toml` into `~/.codex/agents/`
- `hooks/*` into `~/.codex/hooks/chedex/`
- a managed `hooks.json` into `~/.codex/hooks.json`
- a managed Chedex agent block into `~/.codex/config.toml`
- `CHEDEX_UNINSTALL.md` and `CHEDEX_UNINSTALL.json` into `~/.codex/` for reversible uninstall metadata
- `multi_agent = true`, `child_agents_md = true`, and `codex_hooks = true` inside the `~/.codex/config.toml` `[features]` section

Chedex writes native agent files only under `~/.codex` unless `CODEX_HOME` is set.
Artifact-backed workflow skills keep their artifacts under `~/.codex/workflows/`.
`deep-interview` keeps durable `context.md`, `interview.md`, and `spec.md` artifacts under `~/.codex/workflows/deep-interview/` and does not require `progress.json` or `handoff.json` by default.
Governed workflows such as `ralph` and `autopilot` keep their execution state under `~/.codex/workflows/`.
Direct top-level `ultrawork` uses a minimal workflow root under `~/.codex/workflows/ultrawork/` with `progress.json`, active index sync, and `verify.md` when it needs a durable evidence log; it may omit `handoff.json`.
`SessionStart` also performs a best-effort release audit against the published `@openai/codex` package and caches the result in `~/.codex/workflows/_codex_release_audit.json`.

Governed workflow state now includes:

- `~/.codex/workflows/_active.json`
- `progress.json`
- `verify.md`

`handoff.json` is required for governed plans and the richer `ralph` / `autopilot` workflows, but direct top-level `ultrawork` may omit it.
The release audit is advisory only: it does not auto-upgrade Codex CLI.

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
If an existing `config.toml`, `hooks.json`, `AGENTS.md`, managed hook asset, managed prompt, managed agent TOML, or managed skill directory was present, install also creates a timestamped backup beside it.
If no pre-existing file was present for one of those paths, uninstall removes the file that install created.
`~/.codex/workflows/_active.json` is created later by the first governed workflow sync, not by install itself.
