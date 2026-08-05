# Native Delta Audit

This audit decides what Chedex should still own after the Codex `0.131` through
`0.146.1` upgrade sequence.

## Baseline

- Minimum Codex CLI: `0.146.1`
- Latest verified Codex CLI: `0.146.1`
- Chedex: `0.146.1`
- native goals are stable and on by default
- native multi-agent support is stable and on by default
- native hooks are stable; Chedex uses them only for bounded repository mechanics
- repo skills use `.agents/skills`
- project custom agents use `.codex/agents`
- standalone agent TOMLs require `name`, `description`, and `developer_instructions`

The Chedex package version tracks this latest verified compatibility boundary.
Evidence is checked locally by `npm run audit:codex`, against the current Codex
manual at <https://developers.openai.com/codex/codex-manual.md>, and against the
[official Codex 0.146.1 release](https://github.com/openai/codex/releases/tag/rust-v0.146.1).
Every refresh follows [upstream-review.md](upstream-review.md) so release notes,
source implementation, and the comparison upstream are retrieved before a
retention or extraction decision is made.

## 0.131-0.146.1 Relevant Delta

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
| 0.146 | Agent Plugin manifests, executor skills, session forks, and hook execution matured | Rely on native packaging, discovery, lifecycle, and hook execution; add no Chedex runtime. |
| 0.146.1 | Cyber-specialty models gained safer automatic-review defaults and clearer terminal permission guidance | Rely on native model metadata, managed requirements, permission selection, and TUI warnings; add no Chedex routing or approval layer. |

The `rust-v0.146.0...rust-v0.146.1` review used immutable source commit
`79b4f03d35962b005b007a015113b38930711665`. The relevant candidates were
classified as follows:

| Candidate | Decision | Chedex destination |
| --- | --- | --- |
| Cyber-specialty model identification and defaults | NATIVE | Codex owns model metadata and selects the safer automatic-review posture. |
| Workspace/on-request policy under managed requirements | NATIVE | Codex owns effective permissions and continues to honor administrator policy. |
| Full-access warning and terminal permission explanation | NATIVE | Codex owns approval UX and terminal messaging. |
| Explicit permission preservation across reasoning changes | NATIVE | Codex owns thread configuration and preserves caller intent. |

There are no MERGE or PORT candidates in this release delta.

## Complete Chedex Subtraction Pass

The `0.146.1` refresh re-read every Chedex skill, custom-agent prompt and
generated TOML, the project hook, installer, and guidance surface against the
fresh Codex manual and source. Codex documents `explorer` and `worker` as
built-ins, so the name-only Chedex `explore` and `executor` roles duplicated
native lanes and were deleted. Reinstall removes an old Chedex-created copy or
restores the user's pre-Chedex backup.

| Chedex surface | Decision | Why it still earns a place or was removed |
| --- | --- | --- |
| `cdx-clarify` | RETAIN | One-consequential-question ambiguity reduction is a reusable method, not lifecycle state. |
| `cdx-deep-interview` | RETAIN | Adds a rigorous Socratic and pressure-test procedure beyond ordinary clarification. |
| `cdx-analyze` | RETAIN | Standardizes ranked, evidence-bounded analysis with confidence and unknowns. |
| `cdx-best-practice-research` | RETAIN | Requires authoritative primary-source research mapped explicitly to repository evidence. |
| `cdx-plan` | RETAIN | Defines dependency-aware, testable planning and an optional consensus challenge. |
| `cdx-execute` | RETAIN | Defines smallest-change implementation and focused-to-broad verification routing. |
| `cdx-tdd` | RETAIN | Preserves the strict red/green/refactor method for observable behavior changes. |
| `cdx-review` | RETAIN | Supplies a reviewer-only, severity-ranked verdict across plans, diffs, and completion claims. |
| `cdx-ai-slop-cleaner` | RETAIN | Adds regression-first cleanup and simplification criteria. |
| `cdx-autoresearch-plan` | RETAIN | Specifies fair, bounded, reproducible optimization experiments. |
| `cdx-autoresearch-loop` | RETAIN | Adds validator-gated baseline/experiment/decision cycles and an honest ledger. |
| `cdx-ultrawork` | RETAIN | Defines bounded lane ownership and integration using native subagents only. |
| `cdx-ralph` | RETAIN | Defines persistent implement/verify/repair over native Goal mode only when explicitly requested. |
| `cdx-autopilot` | RETAIN | Defines a broad ground/clarify/plan/execute/review/QA phase contract without runtime state. |
| `cdx-design` | RETAIN | Establishes durable product, UI, UX, and frontend design decisions before implementation. |
| `cdx-visual-ralph` | RETAIN | Defines a screenshot- and vision-driven visual comparison loop using native tools. |
| `cdx-ultraqa` | RETAIN | Defines adversarial end-to-end scenarios and repeated repair/verification. |
| custom `explore` agent | REMOVE | Codex built-in `explorer` owns repository search, symbol mapping, and dependency tracing. |
| custom `executor` agent | REMOVE | Codex built-in `worker` owns general implementation and repair. |
| `planner` agent | RETAIN | Specialized scope, acceptance-criteria, sequencing, and risk review. |
| `architect` agent | RETAIN | Specialized read-only design, diagnosis, and tradeoff review. |
| `verifier` agent | RETAIN | Specialized independent completion evidence and verdict. |
| `debugger` agent | RETAIN | Specialized reproduction, root-cause, and minimal-fix analysis. |
| `test-engineer` agent | RETAIN | Specialized test strategy, regression design, and test authoring. |
| project hook | RETAIN | Stateless generated-agent source-of-truth enforcement only; no workflow control. |
| guidance and installer | RETAIN | Native-use policy plus reversible content installation; no scheduler, model routing, or lifecycle store. |

No retained Chedex surface is a duplicate control plane. The orchestration-like
skills above are method contracts over native goals, in-thread plans, native
subagents, interruption, permissions, and session continuity.

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

## Local 0.146.1 Evidence

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

## Recheck Cadence And Triggers

Run the full upstream review for every Chedex release and every proposed skill
or hook change, including removals. Recheck immediately between releases if:

- native goals lose stable/default-on status
- standalone agent or skill locations change
- Chedex needs enforceable organizational policy that plain guidance cannot provide
- a hook use case cannot be expressed as deterministic repository policy without persistent state
- a required workflow needs a connector or tool bundle, in which case a native plugin may be a better package than more installer machinery
