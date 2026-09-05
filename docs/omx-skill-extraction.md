# Legacy Aggregation Extraction Audit

This document is the evidence ledger for reviews of the Oh My Codex (OMX)
package. Chedex treats OMX as a comparison source for methods to evaluate, not
as an authoritative source, implementation dependency, or origin claim. Every
retained method is re-specified against current native Codex behavior and the
Chedex product boundary.

Each refresh must follow [upstream-review.md](upstream-review.md). The snapshot
below is evidence from a completed review, never permission to skip retrieving
the current Codex and OMX implementations on the next review.

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

## Current Review Receipt

The 2026-09-05 refresh resolved and retrieved both upstreams before evaluating
the delta:

| Evidence | Value |
| --- | --- |
| Codex stable package/tag | `0.153.4` / `rust-v0.153.4` |
| Codex release range | `rust-v0.150.1...rust-v0.153.4`; 353 source commits |
| Codex release commit | `3d2ee51ca2d5db578f328aa75e20aa22c0197c9a` |
| OMX stable package/tag | `0.21.3` / `v0.21.3` |
| OMX stable commit | `2da36489cfa07ef1df802f01865e7d959d36f236` |
| OMX default-branch commit | `2da36489cfa07ef1df802f01865e7d959d36f236` |
| OMX default tag status | npm `latest`, `v0.21.3`, and default branch `main` resolve to the same release; no unreleased default-branch delta |
| Previous reviewed default | `3ad79a8a6fe6e95fdbb8c00e40716fffe4011ce2` (`v0.21.0`) |
| OMX previous-to-current default delta | `3ad79a8a6fe6e95fdbb8c00e40716fffe4011ce2..2da36489cfa07ef1df802f01865e7d959d36f236`; 165 commits and 167 changed files |
| Result | no new OMX `MERGE` or `PORT`; compatibility `MERGE` advances Chedex to `0.153.4`; all 18 skills, five custom agents, and the bounded project hook remain current with no product-surface change |

Sources were retrieved into system temporary directories and were not added to
the repository. The npm `latest` tag and installed Codex CLI both resolved to
`0.153.4`; `0.154.0-alpha.3` was excluded as a prerelease. All eight stable
Codex release notes since `0.150.1`, their full changelogs and source commit
range, the current manual, and relevant exact-release implementation/tests
were reviewed. OMX stable advanced from the previously recorded npm `0.20.5`
to `0.21.3`; `v0.21.0` had already been reviewed as the previous default.
The new `0.21.1`–`0.21.3` changelog and release notes, full commit/file inventory,
changed skill contracts, and relevant hook, setup, runtime, and test changes
were reviewed. No role prompt changed in this range. Both current OMX refs
were fetched and resolved; they share one source snapshot because the commits
are identical.

Verification passed agent generation (zero drift), the Codex surface audit,
user-install dry run, the complete repository/hook/install regression suite,
and `git diff --check`. See [local evidence](native-delta-audit.md#local-01534-evidence)
for outputs and the temporary-home warning. The temporary upstream snapshots
were removed after review; no upstream code or runtime asset was retained.

## Current Delta Disposition

The [reviewed range](https://github.com/Yeachan-Heo/oh-my-codex/compare/v0.21.0...v0.21.3)
adds advisory planning and repairs product-specific runtime behavior. Stable
and default-branch sources are identical. The complete changed candidate
inventory was compared against Codex `0.153.4` and current Chedex:

| Candidate / upstream evidence | Native Codex coverage | Current Chedex coverage | Decision / destination |
| --- | --- | --- | --- |
| Ralplan Advisory / Contract A (`skills/ralplan`, `src/ralplan/advisory-*`, #3594) | Native permissions and user direction determine execution authority; plans/reviews require no local authority receipt | `cdx-plan` already runs sequential architecture/readiness challenges and ends with a plan; `cdx-review` assesses evidence | NATIVE for authority and existing planning method; no new advisory skill |
| Advisory byte digests, journals, leases, recovery, and routing classifiers (`src/ralplan`, `src/state`) | Native goals, threads, and permissions own lifecycle | No Chedex workflow state or receipt verifier | DROP; do not import the supporting state machine |
| Team reasoning guidance (`skills/team`) | Codex owns supported effort values, explicit spawn requests, and inheritance | Guidance and custom agents preserve caller choices without model pins | NATIVE; no Team-specific effort enum or fallback |
| Duplicate Team wakes and terminal-projection retirement (`src/team/notice-ledger.ts`, associated tests, #3608) | Native subagents own result delivery and continuation | `cdx-ultrawork` uses native coordination | NATIVE for the outcome; DROP the OMX notice ledger and projections |
| HUD topology, detached cleanup, scrollback limits, composer triage, GitGuardex progress (#3577/#3584/#3595/#3601/#3610/#3612) | Native CLI owns transcript, terminal UI, and agent activity | No tmux, HUD, detached process manager, or GitGuardex integration | DROP; no Chedex UI/runtime surface |
| Cache/launcher provenance, trusted npm publication, and native runtime hydration (#3552/#3561/#3566/#3570/#3571/#3572/#3602) | Native plugin manager owns catalogs and plugin lifecycle | Private dependency-free content package; installer does not hydrate binaries or publish npm artifacts | DROP OMX release/cache machinery; preserve existing installer |
| Windows/macOS process identity, locks, cancellation, empty hook-state recovery, and SparkShell parsing (`src/state`, `src/config`, `src/scripts/codex-native-hook.ts`) | Native permissions, hooks, and session lifecycle remain authoritative | Stateless project hook and reversible install/uninstall tests | DROP; repairs apply to runtime surfaces Chedex does not ship |
| Setup/Doctor CLI path fixes, translations, dependency bumps, release collateral, and regression tests | Native discovery/Doctor cover Codex diagnostics | Chedex has its own docs and dependency-free verification | DROP; no missing reusable Chedex method |

There are no MERGE or PORT candidates above the extraction threshold from OMX.
No skill, hook, state, or runtime implementation was imported as a result of
this review.

## Native Codex Boundary

The local target is Codex CLI `0.153.4`. Current official Codex guidance says:

- persisted goals and automatic continuation are stable and on by default
- native subagents provide parallel delegation and project-scoped custom agents
- `codex agents`, `codex queue`, session forking, and archive/restore provide native agent and conversation control surfaces
- standalone agent TOMLs require `name`, `description`, and
  `developer_instructions`
- repository skills belong under `.agents/skills`
- portable plugins package skills, MCP/apps, and hooks, but do not replace
  Chedex's custom-agent or managed-guidance installation
- hooks support synchronous/background commands and MCP handlers, but a
  prompt-only workflow should not add hooks merely to emulate orchestration
  state
- native `Interrupt` hooks and task messaging remain Codex-owned lifecycle and
  coordination surfaces
- `update_plan` is opt-in and async questions depend on available model tools;
  Chedex's conversational plans and clarification methods require neither tool
- experimental context management is excluded from the default-enabled
  baseline; Chedex does not enable it or create a substitute memory runtime

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

Retain the existing workflow vocabulary and the six high-value skills from the
original comparison extraction:

- `cdx-analyze`
- `cdx-best-practice-research`
- `cdx-ai-slop-cleaner`
- `cdx-design`
- `cdx-ultraqa`
- `cdx-visual-ralph`

Add `cdx-refresh-upstreams` for the explicitly requested, Chedex-specific
fresh-snapshot, three-way disposition, verification, and authorized release
procedure. The resulting 18 skills are method prompts, not a runtime. Existing skills are
updated to use in-thread plans, native Goal mode when explicitly requested,
native subagents when delegation is permitted, and fresh verification evidence.

## Runtime Removal Plan

1. Remove the Chedex workflow governor, release-start hook, custom
   progress/handoff schemas, and hook verifier.
2. Stop writing `goals = true`; goals are stable and default-on in Codex 0.150.1.
3. Stop installing project workflow caches or user-global hook configuration.
4. Move canonical repository skills to `.agents/skills` and generated native
   agents to `.codex/agents`.
5. Keep only migration cleanup needed to remove an older Chedex-managed config
   block or hook entries during reinstall/uninstall.
6. Require complete native agent TOMLs, including `description`.
7. Keep a development-time Codex surface audit; it observes compatibility but
   never changes the user's Codex runtime.

## Hook Structure Reassessment

The current hook reassessment used OMX npm stable/default `v0.21.3`, commit
`2da36489cfa07ef1df802f01865e7d959d36f236`, and current Codex hook
documentation. Chedex retains the useful structural seam—native event
registration, one stdin/stdout adapter, event-specific handlers, and focused
ownership tests—but not OMX's orchestration behavior.

The resulting Chedex hook is project-local and stateless. It protects generated
agent files and reminds regeneration after canonical source edits. Chedex does
not adopt `.omx` state, keyword routing, Stop continuation, tmux/notify
fallbacks, an internal plugin event bus, or installer-written trust hashes.

## Regression And Verification Plan

Before production edits, add a failing thin-native regression check that proves:

- exactly the 18 intended skills are present
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
