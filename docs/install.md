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
- `codex_hooks = true` inside the `~/.codex/config.toml` `[features]` section
- removes legacy managed agent TOMLs from the previous user-level agent location when present, then deletes empty legacy directories

Chedex writes native agent files only under `~/.codex` unless `CODEX_HOME` is set.
Long-running workflow skills such as `ralph` and `autopilot` keep their artifacts under `~/.codex/workflows/`.
Direct top-level `ultrawork` uses a minimal workflow root under `~/.codex/workflows/ultrawork/`.

Governed workflow state now includes:

- `~/.codex/workflows/_active.json`
- `progress.json`
- `handoff.json`
- `verify.md`

## Dry Run

```bash
npm run install:user:dry
```

## Uninstall

```bash
npm run uninstall:user
```

If you want exact rollback, restore the config backup created during install.
If an existing `hooks.json` was present, install also creates a timestamped backup beside it.
