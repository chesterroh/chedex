# Chedex

Chedex is a thin, native-first Codex customization layer. It keeps reusable
methods from mature agentic workflows while leaving orchestration to Codex.

## Boundary

Chedex adds only:

- durable guidance through `AGENTS.template.md`
- native skills under `.agents/skills/`
- five focused custom agents under `.codex/agents/`
- a repo-local native hook guardrail for generated custom-agent files
- reversible user install and uninstall scripts
- development-time checks for the Codex surface it relies on

Chedex does not ship a daemon, workflow state machine, terminal coordinator,
status UI, MCP server, or package dependency. Its short-lived project hook
enforces repository mechanics only; native Goal mode owns persistent
continuation and native subagents own delegation and parallelism.

## Product Direction

Chedex primarily owns two kinds of additions:

- focused skills for reusable methods that a clean, current stable Codex
  installation does not already provide
- bounded native hooks for deterministic lifecycle enforcement that guidance,
  skills, and native permissions cannot provide

Everything else in the repository supports those two surfaces. A capability is
removed or reduced when Codex gains sufficient native coverage. Before changing
that surface, maintainers must review the latest stable Codex implementation and
changelog, retrieve the latest upstream implementation used for comparison, and
record the three-way delta. See [docs/upstream-review.md](docs/upstream-review.md).

## Repository Hooks

Trusted checkouts load `.codex/hooks.json`. All three events route through one
dependency-free adapter:

- `SessionStart` restores a compact generated-agent source-of-truth reminder
- `PreToolUse` blocks direct `apply_patch` edits to `.codex/agents/*.toml`
- `PostToolUse` reminds Codex to regenerate and verify after prompt or registry edits

The hook has no state store, stop gate, keyword router, telemetry, or global
installer. Review and trust it through Codex `/hooks`; Chedex does not write
hook trust state. See [docs/hooks.md](docs/hooks.md).

## Requirements

- Codex CLI `0.153.4` or newer
- Node.js 20 or newer

The current verified boundary is the stable
[Codex `0.153.4` release](https://github.com/openai/codex/releases/tag/rust-v0.153.4),
and the Chedex package version intentionally matches it. Run
`npm run audit:codex` after upgrading Codex.

## Skills

Chedex uses a prefix so native and third-party names remain unambiguous:

| Skill | Purpose |
| --- | --- |
| `cdx-clarify` | Resolve one consequential ambiguity at a time. |
| `cdx-deep-interview` | Run rigorous Socratic requirements discovery. |
| `cdx-analyze` | Produce read-only ranked analysis with evidence and confidence. |
| `cdx-best-practice-research` | Map current primary-source guidance to the repository. |
| `cdx-plan` | Create an actionable plan with optional consensus challenge. |
| `cdx-execute` | Implement a clear task and verify it. |
| `cdx-tdd` | Apply a strict red/green/refactor cycle. |
| `cdx-review` | Review plans, diffs, or claims with severity-ranked findings. |
| `cdx-ai-slop-cleaner` | Simplify generated-looking code with regression-first protection. |
| `cdx-autoresearch-plan` | Define a fair measurable optimization experiment. |
| `cdx-autoresearch-loop` | Run a baseline/experiment/decide loop with an honest ledger. |
| `cdx-ultrawork` | Coordinate independent lanes through native subagents. |
| `cdx-ralph` | Persist through implement/verify/repair using native Goal mode when explicitly requested. |
| `cdx-refresh-upstreams` | Refresh current Codex and comparison-upstream evidence, update Chedex, verify, and optionally release. |
| `cdx-autopilot` | Deliver broad work through clarify, plan, execute, review, and QA. |
| `cdx-design` | Define product, UI, UX, or frontend decisions before implementation. |
| `cdx-visual-ralph` | Iterate visually with native browser, image, screenshot, and vision tools. |
| `cdx-ultraqa` | Run adversarial end-to-end QA and repair. |

Skills are prompt contracts. They do not create a second scheduler or lifecycle
system beside Codex.

## Custom Agents

Chedex relies on Codex's built-in `explorer` and `worker` agents for ordinary
repository search and implementation. It adds only these specialized agents:

- `planner`
- `architect`
- `verifier`
- `debugger`
- `test-engineer`

Source instructions live in `prompts/`. `npm run generate:agents` produces the
standalone TOMLs in `.codex/agents`; every file contains the native required
`name`, `description`, and `developer_instructions` fields. Model and reasoning
settings are intentionally inherited so explicit caller choices remain in
control.

## Install

```bash
npm run verify
npm run install:user:dry
npm run install:user
```

The installer:

- merges Chedex guidance into `~/.codex/AGENTS.md`
- installs skills to `~/.agents/skills/cdx-*`
- installs custom agents to `~/.codex/agents/*.toml`
- records conflict backups for clean uninstall

It does not install hooks, create workflow caches, or write native feature
flags. See [docs/install.md](docs/install.md).

Uninstall with:

```bash
npm run uninstall:user
```

## Development

```bash
npm run generate:agents
npm run audit:codex
npm run verify
```

Important source surfaces:

- `AGENTS.template.md` — global guidance installed as a managed block
- `.agents/skills/` — canonical skills and references
- `prompts/` — readable role sources
- `registry/agent-definitions.mjs` — role metadata
- `.codex/agents/` — generated project-scoped custom agents
- `.codex/hooks.json` and `hooks/` — bounded project hook registration and adapter
- `scripts/` — generation, compatibility audit, install, uninstall, verification
- `docs/native-delta-audit.md` — Codex 0.153.4 replacement decisions
- `docs/omx-skill-extraction.md` — comparison review ledger and native dispositions
- `docs/upstream-review.md` — mandatory Codex-first comparison and extraction workflow

See [docs/customizing.md](docs/customizing.md) before adding a skill or role.
