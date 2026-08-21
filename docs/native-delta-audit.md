# Native Delta Audit

This audit decides what Chedex should still own after the Codex `0.131` through
`0.149.0` upgrade sequence.

## Baseline

- Minimum Codex CLI: `0.149.0`
- Latest verified Codex CLI: `0.149.0`
- Chedex: `0.149.0`
- native goals are stable and on by default
- native multi-agent support is stable and on by default
- native hooks are stable; Chedex uses them only for bounded repository mechanics
- repo skills use `.agents/skills`
- project custom agents use `.codex/agents`
- standalone agent TOMLs require `name`, `description`, and `developer_instructions`

The Chedex package version tracks this latest verified compatibility boundary.
Evidence is checked locally by `npm run audit:codex`, against the current Codex
manual at <https://developers.openai.com/codex/codex-manual.md>, and against the
[official Codex 0.149.0 release](https://github.com/openai/codex/releases/tag/rust-v0.149.0).
Every refresh follows [upstream-review.md](upstream-review.md) so release notes,
source implementation, and the comparison upstream are retrieved before a
retention or extraction decision is made.

## Current Review Receipt

| Evidence | Value |
| --- | --- |
| Retrieval date | `2026-08-21` |
| Stable package/tag | `0.149.0` / `rust-v0.149.0` |
| Reviewed release range | `rust-v0.147.0...rust-v0.149.0` |
| Immutable release commit | `758ef40f50c1a458425c7cfbf1eb12cbc07af0b0` |
| Manual sections reviewed | skills and skill metadata/locations, plugins, synchronous/background/MCP hooks, goals/long-running work, subagents/custom agents, permissions, threads/session queueing and forking, CLI commands, Doctor, and session lifecycle |
| Initial local audit | `npm run audit:codex` passed against installed `codex-cli 0.149.0` while Chedex still declared the `0.147.0` boundary |

The npm `latest` tag and the installed CLI both resolved to `0.149.0` on the
retrieval date. The published `0.150.0-alpha.1` prerelease was excluded because
the native baseline is the latest stable release with default-enabled features.
The `0.148.0` and `0.149.0` release notes, complete release changelogs, current
manual, and exact stable source were read. Revalidation of all 18 Chedex skills
and the bounded project hook produced no product-surface addition or removal.
The two implementation merges remove unsupported legacy skill frontmatter and
correct multi-word feature-maturity parsing in the development-time audit; the
audit also locks the new native command surfaces.

## 0.131-0.149.0 Relevant Delta

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
| 0.147.0 | Portable Agent Plugins/search, thread sections, auto-reviewed approvals, Cursor skill import, MCP 2026 support, Bedrock retrieval/compaction, and security hardening | Keep plugins, catalogs, conversations, approvals, migration, MCP, provider behavior, trust, and isolation native; retain the installer because plugins cannot carry Chedex custom agents or managed `AGENTS.md` guidance. |
| 0.148.0 | Conversation export, session fork/archive/restore, persisted cwd and approval recovery, async/MCP hooks, built-in Bedrock, skill validation, and sandbox hardening | Keep conversation lifecycle, provider integration, hook execution modes, skill tooling, and isolation native. Chedex's blocking repository guardrail remains a synchronous command hook. |
| 0.149.0 | Interactive `codex agents`, `codex queue`, cwd commands, richer Doctor diagnostics, permission-profile restoration, subagent routing fixes, skill catalog controls, and security hardening | Use native agent/session discovery and messaging; add no status UI, mailbox, coordinator, diagnostic layer, model-routing skill metadata, or permission store. |

The `rust-v0.146.1...rust-v0.147.0` review used immutable source commit
`be6e8eac029b183056b7e4402879f15d2c85f61b`. The relevant candidates were
classified as follows:

| Candidate | Decision | Chedex destination |
| --- | --- | --- |
| Portable Agent Plugins, local/personal/workspace/remote search, and isolation | NATIVE | Codex owns plugin packaging, catalogs, installation, policy, and isolation. Chedex's installer remains only because the plugin format does not package custom-agent TOMLs or managed `AGENTS.md` guidance. |
| Persistent thread sections and incremental transcript browsing | NATIVE | Codex owns conversation storage, ordering, and history projection. |
| `--approve-for-me` and approval hardening | NATIVE | Codex owns automatic review, effective permissions, and approval UX. |
| Cursor-managed skill import and external-session synchronization | NATIVE | Codex owns migration and synchronization; Chedex does not add an importer. |
| Opt-in MCP 2026-07-28 protocol support | NATIVE | Codex owns discovery, multi-round requests, startup, authentication, and transport. |
| Bedrock cached web search and remote compaction | NATIVE | Codex owns provider-specific retrieval and session compaction. |
| Secret redaction, project trust, managed-auth restrictions, and plugin network fail-closed behavior | NATIVE | Codex owns security and policy enforcement. |
| Repeatable Chedex upstream refresh and release procedure | PORT | Add `cdx-refresh-upstreams` as a repository-specific method contract over the required evidence, disposition, verification, and authorized release gates. |

That `0.147.0` review produced no MERGE candidate from Codex or OMX behavior.
Its only PORT was the explicitly requested Chedex maintenance workflow above;
it added no runtime, hook, catalog, or native feature wrapper.

The `rust-v0.147.0...rust-v0.149.0` review used immutable source commit
`758ef40f50c1a458425c7cfbf1eb12cbc07af0b0`. The current candidates were
classified as follows:

| Candidate | Decision | Chedex destination |
| --- | --- | --- |
| Conversation export, `codex exec fork`, archive/restore, cwd commands, and persisted resume settings | NATIVE | Codex owns conversation branching, storage, working-directory state, and permission restoration. |
| Interactive `codex agents`, `codex queue`, queued-message delivery, and subagent routing fixes | NATIVE | Codex owns agent discovery, status, session messaging, wake-up, navigation, approvals, and coordination. |
| Background command hooks and MCP hook handlers | NATIVE | Codex owns hook execution modes and MCP invocation. Chedex keeps one synchronous command adapter because generated-file denial must complete before the edit. |
| Skill catalog token budgets and selection plus removal of skill-level model delegation | NATIVE | Codex owns skill discovery, context budgeting, and model selection. Chedex skills contain no model-routing metadata and remain method contracts. |
| Bundled skill validation rejects legacy `argument-hint` frontmatter | MERGE | Remove the unsupported key from 17 skills and enforce its absence in repository verification; names, descriptions, triggers, and method bodies are unchanged. |
| Expanded Doctor, Bedrock, SDK, TUI, plugin, permission, sandbox, and credential hardening | NATIVE | Codex owns diagnostics, providers, clients, policy, trust, and isolation. |
| Multi-word feature maturity reported as missing by Chedex's audit parser | MERGE | Repair `parseCodexFeatures`, add a focused regression, and report `under development` features accurately. |

No new skill, agent, hook event, runtime, dependency, or installer behavior is
justified by this delta. The two compatibility `MERGE` decisions do not expand
the Chedex product surface.

## Complete Chedex Subtraction Pass

The `0.149.0` refresh re-read every Chedex skill, custom-agent prompt and
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
| `cdx-refresh-upstreams` | RETAIN | Encodes Chedex's repository-specific fresh-snapshot, three-way disposition, verification, and authorized release method without owning lifecycle state. |
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

## Local 0.149.0 Evidence

The verified local surface reports:

- `goals stable true`
- `hooks stable true`
- `multi_agent stable true`
- `multi_agent_v2 stable false` (available but not required)
- `remote_plugin stable true`
- `remote_compaction_v2 stable true`
- `auth_elicitation stable true`
- `request_permissions_tool under development false`
- `exec_permission_approvals under development false`

The app-server schema exposes goal set/clear, hook metadata, skill discovery,
permission profiles, external-agent migration, and thread start settings. The
CLI audit also proves `codex agents`, `codex queue`, and `codex exec fork`.
Permission help currently spells the profile placeholder `CONFIG_PROFILE_V2`;
the audit accepts that spelling and the previous `CONFIG_PROFILE` spelling to
avoid a brittle non-semantic failure.

## Recheck Cadence And Triggers

Run the full upstream review for every Chedex release and every proposed skill
or hook change, including removals. Recheck immediately between releases if:

- native goals lose stable/default-on status
- standalone agent or skill locations change
- Chedex needs enforceable organizational policy that plain guidance cannot provide
- a hook use case cannot be expressed as deterministic repository policy without persistent state
- a required workflow needs a connector or tool bundle, in which case a native plugin may be a better package than more installer machinery
