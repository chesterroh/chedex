# Native Delta Audit

This audit decides what Chedex should still own after the Codex `0.131` through
`0.145` upgrade sequence.

## Baseline

- Minimum Codex CLI: `0.145.0`
- Latest verified Codex CLI: `0.145.0`
- Chedex: `0.145.0`
- native goals are stable and on by default
- native multi-agent support is stable and on by default
- native hooks are stable; Chedex uses them only for bounded repository mechanics
- repo skills use `.agents/skills`
- project custom agents use `.codex/agents`
- standalone agent TOMLs require `name`, `description`, and `developer_instructions`

The Chedex package version tracks this latest verified compatibility boundary.
Evidence is checked locally by `npm run audit:codex`, against the current Codex
manual at <https://developers.openai.com/codex/codex-manual.md>, and against the
[official Codex 0.145.0 release](https://github.com/openai/codex/releases/tag/rust-v0.145.0).

## 0.131-0.145 Relevant Delta

| Codex | Chedex-relevant change | Decision |
| --- | --- | --- |
| 0.131 | `codex doctor`, richer plugin hooks, remote and SDK surfaces | Keep Chedex compatibility checks development-time only. |
| 0.132 | Goal blocker and usage handling improved; exec schema resume improved | Prefer native goal state over custom blocked/usage bookkeeping. |
| 0.133 | Goals became stable/default-on with durable storage; subagent lifecycle expanded | Remove Chedex progress, handoff, and stop-gate runtime. |
| 0.134 | Permission-profile CLI and subagent hook context matured | Preserve native permissions; make help checks tolerant to placeholder changes. |
| 0.135 | Doctor output and named permission profiles improved | Do not add a Chedex doctor or permission layer. |
| 0.136 | Image generation and extra skill roots expanded | Port visual workflows as prompt skills, not tool wrappers. |
| 0.137 | Multi-agent v2 added per-thread runtime behavior | Keep native delegation and avoid a parallel worker protocol. |
| 0.138 | Goal robustness and plugin JSON paths improved | Continue replacing custom orchestration state. |
| 0.139 | Code-mode web search and schema support expanded | Research skills should use native retrieval surfaces. |
| 0.140 | Import and richer goal attachments expanded | Do not build a migration daemon or attachment store. |
| 0.141 | Hook trust bypasses were fixed; agent wait steering improved | Avoid nonessential hooks; use native wait/steering. |
| 0.142 | Token-budgeted goals and explicit delegation modes arrived | Let native goal and session policy control budgets/delegation. |
| 0.143 | Remote plugins and tool search matured | Prefer bundled/native skill tooling over a Chedex skill manager. |
| 0.144 | Auth elicitation and approval modes matured | Preserve native approval and authentication boundaries. |
| 0.145 | Multi-Agent V2 is a stable opt-in; import/thread surfaces expanded | Verify schemas, but keep Chedex independent of experimental v2 enablement. |

## Replacement Decisions

| Former Chedex surface | Decision | Native replacement |
| --- | --- | --- |
| Hook-governed workflow state | Remove | Native Goal mode and same-thread continuation |
| `progress.json`, `handoff.json`, `verify.md`, active index, archive | Remove | Native goal state plus fresh command evidence in the thread |
| Startup release-audit hook and cache | Remove | `codex update`, `codex doctor`, and explicit `npm run audit:codex` |
| Managed `goals = true` write | Remove | Goals are stable and default-on |
| Managed agent entries in `config.toml` | Remove | Standalone `.codex/agents/*.toml` discovery |
| Installed role prompts | Remove | Generated agent `developer_instructions` already contain them |
| Repo `.codex/skills` mirror | Replace | Canonical native `.agents/skills` |
| Root `agents/` generated mirror | Replace | Canonical generated `.codex/agents` |
| Model/reasoning values in agent TOMLs | Remove | Native caller, agent defaults, and parent inheritance |
| Runtime release delta JSON | Remove | This human-readable audit plus the read-only compatibility probe |

## Bounded Hook Delta

Chedex has no always-on runtime delta. Installation adds guidance, skills, and
custom agents only; it does not install hooks, processes, workflow state,
feature flags, model routing, or terminal orchestration.

The trusted Chedex checkout itself has a project-local `.codex/hooks.json`.
`SessionStart`, `PreToolUse`, and `PostToolUse` route through one short-lived,
dependency-free adapter. The adapter protects generated custom-agent TOMLs and
reminds Codex to regenerate after source edits. It does not govern workflows,
persist state, intercept Stop, or bypass Codex hook review and trust.

See [hooks.md](hooks.md) for the boundary and upstream comparison.

## Local 0.145 Evidence

The verified local surface reports:

- `goals stable true`
- `hooks stable true`
- `multi_agent stable true`
- `multi_agent_v2 stable false` (available but not required)
- `remote_plugin stable true`
- `remote_compaction_v2 stable true`
- `auth_elicitation stable true`

The app-server schema exposes goal set/clear, hook metadata, skill discovery,
permission profiles, external-agent migration, and thread start settings. The
CLI permission help currently spells the profile placeholder
`CONFIG_PROFILE_V2`; the audit accepts that current spelling and the previous
`CONFIG_PROFILE` spelling to avoid a brittle non-semantic failure.

## Recheck Triggers

Revisit this boundary only if:

- native goals lose stable/default-on status
- standalone agent or skill locations change
- Chedex needs enforceable organizational policy that plain guidance cannot provide
- a hook use case cannot be expressed as deterministic repository policy without persistent state
- a required workflow needs a connector or tool bundle, in which case a native plugin may be a better package than more installer machinery
