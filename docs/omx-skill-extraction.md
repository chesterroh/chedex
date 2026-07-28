# Legacy Aggregation Extraction Audit

This document records a one-time catalog review of the Oh My Codex (OMX)
package. Chedex treats OMX only as a historical aggregation/index of workflow
excerpts associated with other agent harnesses, not as an authoritative source,
implementation dependency, or origin claim. The catalog was useful for finding
ideas to evaluate; every retained method was re-specified against native Codex
behavior and the Chedex product boundary.

## Objective

Chedex should remain a thin Codex customization layer:

- durable repository policy in `AGENTS.md`
- reusable workflows in native skills
- a small set of native custom agents
- reversible install and uninstall scripts
- no OMX command, state directory, hook runtime, tmux coordinator, HUD, MCP
  server, or package dependency

Native Codex owns long-running goals, subagent lifecycle, plan state, skill
discovery, permissions, hooks, browser/image tools, and session continuity.
Chedex should describe how to use those capabilities, not reimplement them.

## Aggregation Snapshot

The review used the latest stable npm release available on 2026-07-28:

| Field | Value |
| --- | --- |
| Package | `oh-my-codex` |
| Version/tag | `0.20.3` / `v0.20.3` |
| Commit | `6c970cc12da256bfc7667edd0a9183b158d4a7a7` |
| Catalog version | `2026.02.28.1` |
| Catalog skills | 50 |
| Package metadata license | MIT |
| Repository | <https://github.com/Yeachan-Heo/oh-my-codex> |
| Stable source | <https://github.com/Yeachan-Heo/oh-my-codex/tree/v0.20.3> |

A temporary ignored snapshot was reviewed at
`.omx/upstream/oh-my-codex-v0.20.3` and deleted after the inventory was
completed; it was never a vendored dependency. Because the aggregation does not
establish original authorship for its catalog entries, Chedex does not treat it
as provenance for retained methods. The reviewed tag also lacked an obvious
root license file even though its package metadata declares MIT, so Chedex
re-specifies behavior from first principles instead of copying skill files.

## Native Codex Boundary

The local target is Codex CLI `0.145.0`. Current official Codex guidance says:

- persisted goals and automatic continuation are stable and on by default
- native subagents provide parallel delegation and project-scoped custom agents
- standalone agent TOMLs require `name`, `description`, and
  `developer_instructions`
- repository skills belong under `.agents/skills`
- hooks are available for lifecycle enforcement, but a prompt-only workflow
  should not add hooks merely to emulate orchestration state

References:

- <https://developers.openai.com/codex/codex-manual.md>
- <https://learn.chatgpt.com/docs/long-running-work>
- <https://learn.chatgpt.com/docs/agent-configuration/subagents>
- <https://learn.chatgpt.com/docs/build-skills>

## Decision Labels

- **PORT**: add a compact native Chedex skill because the method remains useful
  and native Codex does not provide the full procedure.
- **MERGE**: fold the useful method into an existing Chedex skill rather than
  add another public entry point.
- **NATIVE**: rely on a native Codex capability or a durable `AGENTS.md` rule.
- **DROP**: omit product-specific runtime, compatibility shim, alias, or
  low-value surface.

## Complete OMX Skill Disposition

| # | Aggregated catalog entry | Aggregation status | Decision | Chedex/native destination |
| ---: | --- | --- | --- | --- |
| 1 | `autopilot` | active | MERGE | Strengthen `cdx-autopilot` with clarify/plan/execute/review/QA phases. |
| 2 | `ralph` | active | MERGE | Use `cdx-ralph` over native Goal mode; no custom loop state. |
| 3 | `ultrawork` | active | MERGE | Keep bounded parallel lanes in `cdx-ultrawork` using native subagents. |
| 4 | `team` | active | NATIVE | Native subagents and worktrees replace tmux team orchestration. |
| 5 | `ecomode` | deprecated | DROP | Deprecated model-routing mode. |
| 6 | `ultraqa` | active | PORT | Add `cdx-ultraqa` for adversarial end-to-end verification. |
| 7 | `autoresearch` | active | MERGE | Fold validator-gated experiments into `cdx-autoresearch-loop`. |
| 8 | `autoresearch-goal` | active | MERGE | Use native goals from the existing autoresearch plan/loop pair. |
| 9 | `performance-goal` | active | MERGE | Treat performance work as a metric profile of autoresearch. |
| 10 | `pipeline` | active | MERGE | `cdx-autopilot` owns the small fixed workflow chain. |
| 11 | `ultragoal` | active | MERGE | Native Goal mode plus `cdx-ralph`; no parallel state machine. |
| 12 | `swarm` | deprecated | NATIVE | Native subagents replace the deprecated alias/runtime. |
| 13 | `plan` | active | MERGE | Preserve actionable planning in `cdx-plan`. |
| 14 | `ralplan` | active alias | MERGE | Consensus mode becomes an option inside `cdx-plan`. |
| 15 | `deep-interview` | active | MERGE | Preserve ambiguity gating in `cdx-deep-interview`. |
| 16 | `prometheus-strict` | active | MERGE | Add sequential challenge and readiness passes to consensus planning. |
| 17 | `best-practice-research` | active | PORT | Add `cdx-best-practice-research`. |
| 18 | `analyze` | active | PORT | Add `cdx-analyze` for ranked, evidence-bounded repository analysis. |
| 19 | `deepsearch` | deprecated | MERGE | Covered by `cdx-analyze` and best-practice research. |
| 20 | `tdd` | deprecated | MERGE | Retain the narrower existing `cdx-tdd` workflow. |
| 21 | `build-fix` | deprecated | MERGE | Covered by `cdx-execute` plus the debugger role. |
| 22 | `ai-slop-cleaner` | active | PORT | Add `cdx-ai-slop-cleaner` with test-first cleanup gates. |
| 23 | `code-review` | active | MERGE | Strengthen `cdx-review`; avoid a duplicate entry point. |
| 24 | `security-review` | deprecated | MERGE | Security findings remain a severity lane in `cdx-review`. |
| 25 | `visual-verdict` | deprecated | MERGE | Make visual evidence an internal step of `cdx-visual-ralph`. |
| 26 | `web-clone` | deprecated | MERGE | Reference matching is a `cdx-visual-ralph` input mode. |
| 27 | `visual-ralph` | active | PORT | Add `cdx-visual-ralph` using native browser/image/vision surfaces. |
| 28 | `design` | active | PORT | Add `cdx-design` around a repo-local `DESIGN.md`. |
| 29 | `frontend-ui-ux` | deprecated | MERGE | Covered by `cdx-design` and `cdx-visual-ralph`. |
| 30 | `git-master` | alias | NATIVE | Git plus repository commit policy is sufficient. |
| 31 | `review` | deprecated | MERGE | Covered by `cdx-review`. |
| 32 | `ask` | active | NATIVE | Native specialized subagents replace external advisor CLIs. |
| 33 | `ask-claude` | deprecated | DROP | External product alias. |
| 34 | `ask-gemini` | deprecated | DROP | External product alias. |
| 35 | `cancel` | active | NATIVE | Native goal controls and ordinary user interruption own cancellation. |
| 36 | `doctor` | active | DROP | OMX installation diagnostics have no Chedex role. |
| 37 | `wiki` | active | DROP | Persistent wiki machinery is outside the thin core. |
| 38 | `help` | deprecated | NATIVE | Native skill discovery and repository docs provide help. |
| 39 | `note` | deprecated | NATIVE | Chat continuity, AGENTS files, and explicit docs replace runtime notes. |
| 40 | `trace` | deprecated | NATIVE | Native Codex diagnostics and command output provide evidence. |
| 41 | `skill` | active | NATIVE | Bundled `skill-creator` and `skill-installer` own skill management. |
| 42 | `hud` | active | DROP | Tmux/HUD runtime surface. |
| 43 | `omx-setup` | active | DROP | OMX bootstrap surface. |
| 44 | `configure-notifications` | active | NATIVE | Native Codex notification settings own this concern. |
| 45 | `configure-discord` | merged | DROP | Product-specific compatibility alias. |
| 46 | `configure-telegram` | merged | DROP | Product-specific compatibility alias. |
| 47 | `configure-slack` | merged | DROP | Product-specific compatibility alias. |
| 48 | `configure-openclaw` | merged | DROP | Product-specific compatibility alias. |
| 49 | `ralph-init` | deprecated | MERGE | `cdx-ralph` starts or resumes native goal work directly. |
| 50 | `worker` | internal | NATIVE | Native built-in and custom subagents own worker lifecycle. |

## Target Chedex Surface

Retain the existing workflow vocabulary and add only six high-value skills:

- `cdx-analyze`
- `cdx-best-practice-research`
- `cdx-ai-slop-cleaner`
- `cdx-design`
- `cdx-ultraqa`
- `cdx-visual-ralph`

The resulting 17 skills are method prompts, not a runtime. Existing skills are
updated to use in-thread plans, native Goal mode when explicitly requested,
native subagents when delegation is permitted, and fresh verification evidence.

## Runtime Removal Plan

1. Remove the Chedex workflow governor, release-start hook, custom
   progress/handoff schemas, and hook verifier.
2. Stop writing `goals = true`; goals are stable and default-on in Codex 0.145.
3. Stop installing project workflow caches or user-global hook configuration.
4. Move canonical repository skills to `.agents/skills` and generated native
   agents to `.codex/agents`.
5. Keep only migration cleanup needed to remove an older Chedex-managed config
   block or hook entries during reinstall/uninstall.
6. Require complete native agent TOMLs, including `description`.
7. Keep a development-time Codex surface audit; it observes compatibility but
   never changes the user's Codex runtime.

## Hook Structure Reassessment

The later hook review used the same OMX `v0.20.3` snapshot and current Codex
hook documentation. Chedex adopts the useful structural seam—native event
registration, one stdin/stdout adapter, event-specific handlers, and focused
ownership tests—but not OMX's orchestration behavior.

The resulting Chedex hook is project-local and stateless. It protects generated
agent files and reminds regeneration after canonical source edits. Chedex does
not adopt `.omx` state, keyword routing, Stop continuation, tmux/notify
fallbacks, an internal plugin event bus, or installer-written trust hashes.

## Regression And Verification Plan

Before production edits, add a failing thin-native regression check that proves:

- exactly the 17 intended skills are present
- canonical skills live under `.agents/skills`
- generated agent TOMLs contain all native required fields
- tracked product surfaces contain no OMX runtime commands or `.omx` state paths
- no Chedex governor, Stop gate, or hook-owned workflow-schema surface remains
- the bounded project hook covers only generated-agent repository mechanics
- install does not write native feature flags or install hooks/workflow caches

After implementation, run:

```bash
npm run generate:agents
npm run verify
npm run install:user:dry
```

Also inspect the final diff for copied aggregation prose, stale mirrored files,
generated-agent drift, and any remaining runtime dependency.
