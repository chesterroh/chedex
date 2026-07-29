# Install And Uninstall

Chedex `0.146.0` targets the stable
[Codex CLI `0.146.0`](https://github.com/openai/codex/releases/tag/rust-v0.146.0)
or newer and Node.js 20 or newer. The Chedex package version identifies the
latest Codex compatibility boundary verified by this repository.

## Verify First

```bash
npm run verify
npm run install:user:dry
```

The dry run validates the local Codex version and generated agents without
changing user files.

## Install

```bash
npm run install:user
```

Chedex writes only native content surfaces:

- a marked guidance block in `~/.codex/AGENTS.md`
- seven standalone custom agents in `~/.codex/agents/`
- 17 skills in `~/.agents/skills/`: `cdx-ai-slop-cleaner`, `cdx-analyze`, `cdx-autopilot`, `cdx-autoresearch-loop`, `cdx-autoresearch-plan`, `cdx-best-practice-research`, `cdx-clarify`, `cdx-deep-interview`, `cdx-design`, `cdx-execute`, `cdx-plan`, `cdx-ralph`, `cdx-review`, `cdx-tdd`, `cdx-ultraqa`, `cdx-ultrawork`, and `cdx-visual-ralph`
- rollback metadata in `~/.codex/CHEDEX_UNINSTALL.json`
- a short uninstall note in `~/.codex/CHEDEX_UNINSTALL.md`

Conflicting skill and agent paths are backed up under
`~/.codex/.chedex-backups/` and restored on uninstall. Existing non-Chedex
content in `~/.codex/AGENTS.md` is preserved.

The installer does not install hooks, does not write feature flags, does not
create workflow caches, and does not edit subagent defaults. Codex goals and
multi-agent support must already be stable and enabled; `npm run audit:codex`
checks that boundary.

The tracked `.codex/hooks.json` is a development guardrail for this repository
only. It loads when the Chedex checkout is trusted and is not copied into the
user's Codex home by `npm run install:user`.

For isolated tests or alternate homes, set:

- `CODEX_HOME` for Codex agents, guidance, and rollback metadata
- `CHEDEX_AGENTS_HOME` for the `.agents` home containing user skills

## Upgrade From Chedex 0.130 Or Earlier

The installer removes an old marked Chedex agent config block and explicit
Chedex governor hook entries. When prior rollback state exists, it also retires
old prompt and hook assets and removes Chedex-managed legacy feature flags.
Unrelated config, hooks, and sibling files are preserved.

## Uninstall

```bash
npm run uninstall:user
```

Uninstall removes the managed guidance block, restores files that Chedex
replaced, removes files Chedex created, and cleans recognized legacy Chedex
hook artifacts. It does not remove unrelated Codex configuration or skills.

## Development Checks

```bash
npm run generate:agents
npm run audit:codex
npm run verify
```

`npm run audit:codex` checks Codex version, stable native goals and multi-agent
support, key command help surfaces, and the app-server schemas Chedex relies on.
It is read-only apart from a temporary schema directory.
