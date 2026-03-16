# Chedex Extraction Comparison

This audit used `EXTRACTION_GUIDE.md` as the contract and compared Chedex against both the canonical upstream sources in `/Users/chester/work/oh-my-codex` and the earlier native-only `@chedex/` pack.

## Verdict

Yes: the extraction was successful enough, and the bare-metal integrity of Codex is still intact.

More precisely:

- Chedex preserved the native Codex extension surfaces the guide says to keep.
- Chedex left the OMX runtime machinery behind instead of re-importing it through the back door.
- The main drift is deliberate reduction and native re-homing, not accidental contamination.

## What Matches The Guide

### 1. The right layers were extracted

The guide says the useful nutrient is:

- `AGENTS.md`
- `prompts/*.md`
- `skills/*/SKILL.md`
- `src/agents/definitions.ts`
- `src/agents/native-config.ts`
- `src/config/generator.ts`

Chedex contains the matching native layers:

- `AGENTS.template.md`
- `prompts/`
- `skills/`
- `registry/`
- `agents/`
- `scripts/`
- `docs/`

That is exactly the re-homing pattern the guide describes, rather than a loose patch dump.

### 2. The role catalog was reduced correctly

The guide explicitly says the broad OMX role catalog should be reduced to:

- `explore`
- `planner`
- `executor`
- `architect`
- `verifier`
- `debugger`
- `test-engineer`

Chedex keeps exactly those 7 roles. Upstream `oh-my-codex` still carries a 30-agent catalog, including review, domain, product, and coordination roles that were intentionally not brought over. That matches the "smallest useful subset" rule rather than violating it.

### 3. Prompt extraction looks clean

The strongest signal here is simple: `diff -ru /Users/chester/work/oh-my-codex/@chedex/prompts /Users/chester/work/chedex/prompts` returned no differences.

That means the current Chedex prompt surfaces are not a degraded reinterpretation. They match the native-only extraction baseline already living in the upstream repo.

### 4. Skill extraction matches the guide's intent

The original `@chedex` pack contained 5 reduced skills:

- `clarify`
- `plan`
- `execute`
- `review`
- `tdd`

Chedex preserves those and adds reduced native versions of:

- `ultrawork`
- `ralph`
- `autopilot`

Those three additions align with the guide, which explicitly lists them as part of the reduced portable workflow stack.

The reduction is substantial and directionally correct:

- `ultrawork`: 143 lines upstream -> 23 lines in Chedex
- `ralph`: 249 lines upstream -> 59 lines in Chedex
- `autopilot`: 234 lines upstream -> 68 lines in Chedex

What disappeared was exactly what should disappear: `.omx` state, MCP lifecycle tools, team mode, UltraQA loops, tmux assumptions, HUD cleanup, and pipeline/runtime orchestration.

## Where Chedex Deliberately Drifted

### 1. The registry is smaller and more native

Upstream `src/agents/definitions.ts` models a larger OMX runtime/router world:

- `modelClass`
- `routingRole`
- `category`
- broader posture choices such as `frontier-orchestrator`

Chedex strips that down to the metadata that still matters for a native Codex harness:

- id
- summary
- goal
- posture
- reasoning effort
- tool policy
- done definition
- handoff targets

That is a good reduction, not a loss of integrity. The extracted registry still preserves role purpose, posture, and execution boundaries, while deleting OMX-specific routing taxonomy.

One real drift: `planner`, `architect`, and `verifier` now use `read-only-reviewer` posture, and most default efforts were raised to `high`. That is a tuning change relative to upstream, but it does not break the extraction goal. It makes the native harness stricter and more review-oriented.

### 2. Generated agent TOMLs kept the pattern, not the OMX overlays

Upstream `src/agents/native-config.ts` generates TOMLs into `~/.omx/agents`, layering in OMX posture and model-class overlays.

Chedex preserves the actual invariant:

- read prompt
- strip frontmatter
- emit per-role TOML
- include role metadata in `developer_instructions`

But it drops the OMX-specific extras and installs to `~/.codex/agents` instead. That is exactly what the guide says should happen.

### 3. Config wiring was reduced to native agent registration only

Upstream `src/config/generator.ts` merges a large OMX-managed config block:

- top-level `notify`
- MCP servers
- OMX team server
- `[tui]`
- native agent entries

Chedex keeps only the Codex-native core:

- `[features]` with `multi_agent = true` and `child_agents_md = true`
- a managed `[agents.*]` block pointing at installed TOMLs

This is the right cut. The guide said to preserve the Codex-native `[agents.*]` registration pattern, not the OMX runtime block around it.

## Evidence That Runtime Machinery Stayed Behind

Chedex does not reintroduce:

- `src/team/`
- notify hooks
- tmux worker coordination
- mailbox or leasing state
- HUD/runtime overlays
- MCP server installation
- `.omx` persistence as an active runtime dependency

The remaining `.omx` references are bounded and acceptable:

- legacy cleanup helpers that remove old `~/.omx/agents` files during install/uninstall
- explanatory text that explicitly says these OMX systems are excluded

That is cleanup compatibility, not runtime coupling.

## Verification Evidence

The guide's own verification steps passed:

- `npm run generate:agents`
  - `generated 7 agent toml files (0 updated)`
- `node scripts/verify-repo.mjs`
  - `verify-ok roles=7 skills=8`
- `npx tsc --noEmit`
  - passed
- `npm run install:user:dry`
  - targeted `codex_home=/Users/chester/.codex`
  - reported `roles=7`
  - reported `skills=8`
  - reported no legacy OMX install present

That verification matters because Chedex is not just textually similar to the guide. The generated agents, install flow, and typed registry still cohere as a working native repo.

## Bottom Line

The extraction did not smuggle OMX back in.

What survived is the Codex brain:

- orchestration policy
- role prompts
- workflow contracts
- compact role metadata
- generated native agent definitions
- native install/config registration

What got cut away is the OMX body:

- tmux runtime
- hook machinery
- MCP runtime block
- team lifecycle/state systems
- `.omx`-bound persistence and overlays

So the answer is yes: Chedex is credibly extracted, reduced, and still "bare metal" enough to count as a native Codex harness rather than a thin OMX clone.

## Bounded Caveats

- Chedex is not a parity build of all OMX behavior. It is a selective extraction, which is what the guide wanted.
- The registry and AGENTS template have been intentionally tuned beyond the earlier `@chedex` snapshot. That is acceptable drift, but it is drift.
- During this audit, workflow artifacts could not be written under `/Users/chester/.codex/workflows/` from this session, so audit artifacts were stored under repo-local `workflows/autopilot/extraction-compare/`.
