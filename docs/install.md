# Install

## Requirements

- Codex CLI `>= 0.114.0`
- `codex features list` must expose `codex_hooks`
- Node `>= 20`

Chedex now fails install if the native lifecycle hook surface is unavailable.

## Global Install

From the repo root:

```bash
npm run generate:agents
npm run install:user
```

This installs:

- `AGENTS.template.md` into `~/.codex/AGENTS.md`
- `prompts/*.md` into `~/.codex/prompts/`
- the registered `skills/<name>/` directories into `~/.codex/skills/`: `clarify`, `plan`, `review`, `execute`, `tdd`, `ultrawork`, `ralph`, and `autopilot`
- `agents/*.toml` into `~/.codex/agents/`
- `hooks/chedex-governor.mjs` into `~/.codex/hooks/chedex/`
- a managed `hooks.json` into `~/.codex/hooks.json`
- a managed Chedex agent block into `~/.codex/config.toml`
- `CHEDEX_UNINSTALL.md` and `CHEDEX_UNINSTALL.json` into `~/.codex/` for reversible uninstall metadata
- `codex_hooks = true` inside the `~/.codex/config.toml` `[features]` section

Chedex writes native agent files only under `~/.codex` unless `CODEX_HOME` is set.
Long-running workflow skills such as `ralph` and `autopilot` keep their artifacts under `~/.codex/workflows/`.
Direct top-level `ultrawork` uses a minimal workflow root under `~/.codex/workflows/ultrawork/` with `progress.json`, `verify.md`, and active index sync; it may omit `handoff.json`.

Governed workflow state now includes:

- `~/.codex/workflows/_active.json`
- `progress.json`
- `verify.md`

`handoff.json` is required for governed plans and the richer `ralph` / `autopilot` workflows, but direct top-level `ultrawork` may omit it.

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
If an existing `config.toml`, `hooks.json`, `AGENTS.md`, managed hook runtime, managed prompt, managed agent TOML, or managed skill directory was present, install also creates a timestamped backup beside it.
If no pre-existing file was present for one of those paths, uninstall removes the file that install created.
`~/.codex/workflows/_active.json` is created later by the first governed workflow sync, not by install itself.
