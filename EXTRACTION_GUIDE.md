# Extraction Guide

This document explains how Chedex was extracted from `oh-my-codex`, and how to keep extracting useful pieces from that repo in the future without inheriting its full runtime complexity.

## Core Principle

When evaluating a part of `oh-my-codex`, ask:

Is this teaching Codex how to think and route, or is this teaching OMX how to operate a runtime?

- If it teaches Codex how to think, route, verify, or specialize, it likely belongs in Chedex.
- If it teaches OMX how to coordinate processes, sessions, hooks, workers, or external runtime state, it usually should stay behind.

That distinction is the main filter.

## What Was Worth Extracting

These source layers were the useful nutrient:

- `AGENTS.md` — orchestration policy, delegation posture, verification rules
- `prompts/*.md` — the real sub-agent role surfaces
- `skills/*/SKILL.md` — workflow contracts
- `src/agents/definitions.ts` — role metadata shape
- `src/agents/native-config.ts` — per-agent TOML generation pattern
- `src/config/generator.ts` — Codex-native `[agents.*]` registration pattern

These are the parts that map well to a native-first Codex harness.

## What Was Deliberately Left Behind

These areas were treated as OMX-owned outer runtime machinery and were not carried forward:

- `src/team/`
- most of `src/hooks/`
- `scripts/notify-hook.js`
- tmux worker coordination
- mailbox, leasing, and worker lifecycle state
- HUD, notifications, and linked runtime overlays
- `.omx` state machinery

Those systems solve orchestration/runtime problems, not prompt/contract problems.

## How The Extraction Was Done

The extraction was not a raw copy.

Each retained surface went through a reduction pass:

1. Identify the canonical source file in `oh-my-codex`
2. Preserve the useful invariant
3. Remove OMX-specific runtime assumptions
4. Reduce to the smallest reusable subset
5. Re-home it in Chedex as source, not as a local patch

Examples:

- Role behavior from `prompts/*.md` was kept, but references to `.omx`, `omx explore`, tmux, notify hooks, and OMX-only UI/tooling were removed.
- The broad role catalog was reduced to the smallest useful set:
  - `explore`
  - `planner`
  - `executor`
  - `architect`
  - `verifier`
  - `debugger`
  - `test-engineer`
- Large workflow skills were reduced into portable contracts:
  - `clarify`
  - `plan`
  - `execute`
  - `review`
  - `tdd`
  - `ultrawork`
  - `ralph`
  - `autopilot`
- The native agent TOML pattern was preserved, but the install target was moved into `~/.codex/agents` rather than `~/.omx/agents`.

## The Extraction Layers Inside Chedex

When new value is extracted, place it into the correct layer:

- `AGENTS.template.md`
  - global or project orchestration rules
- `prompts/`
  - role-specific agent surfaces
- `skills/`
  - workflow contracts
- `registry/`
  - structured role metadata
- `agents/`
  - generated native agent TOMLs
- `scripts/`
  - install/generate/uninstall/verify tooling
- `docs/`
  - usage and maintenance guidance

Keep source layers hand-maintained and treat `agents/*.toml` as generated artifacts.

## Future Extraction Workflow

Use this repeatable process whenever you want to piggyback more useful pieces from `oh-my-codex`.

### 1. Classify the candidate

Ask:

- Is this a native Codex extension surface?
- Or is it an OMX runtime subsystem?

Keep:

- AGENTS policy
- prompt contracts
- skill contracts
- role registry ideas
- native agent config patterns
- Codex config registration patterns

Reject unless absolutely necessary:

- tmux runtime logic
- notify hook automation
- `.omx` state systems
- worker mailboxing
- team lifecycle machinery
- linked mode synchronization

### 2. Find the canonical source

Use the original repo as the truth source.

Typical mapping:

- role behavior: `prompts/*.md`
- workflow behavior: `skills/*/SKILL.md`
- metadata shape: `src/agents/definitions.ts`
- generated native agent config shape: `src/agents/native-config.ts`
- Codex config wiring: `src/config/generator.ts`

Do not extract from incidental runtime consumers if a cleaner source exists upstream.

### 3. Extract the invariant

Preserve:

- role purpose
- constraints
- operating posture
- output contract
- skill steps
- verification gate

Remove:

- repo-local orchestration assumptions
- OMX-only commands
- special state directories
- runtime-only dependencies
- implementation details that exist only to support OMX’s runtime

### 4. Reduce before copying

Do not import whole catalogs blindly.

Questions to ask:

- What is the smallest useful subset?
- Which role or skill is the actual nutrient here?
- Can this be simplified without losing the essential behavior?

Bias toward:

- fewer roles
- fewer skills
- stronger contracts
- simpler install shape

### 5. Re-home the extracted piece

Put it in the right Chedex layer:

- prompt -> `prompts/`
- skill -> `skills/`
- metadata -> `registry/`
- install/runtime wiring -> `scripts/`
- operator guidance -> `docs/`

Do not leave extracted logic stranded in one-off local files.

### 6. Regenerate derived artifacts

If the change affects roles:

1. update `registry/agent-definitions.mjs`
2. update `registry/agent-definitions.ts`
3. update or add the prompt in `prompts/`
4. run `npm run generate:agents`

If the change affects install behavior:

1. update `scripts/lib.mjs`
2. update install/uninstall scripts
3. update docs

### 7. Verify the repo

After each extraction round, run:

```bash
npm run generate:agents
node scripts/verify-repo.mjs
npx tsc --noEmit
npm run install:user:dry
```

That verifies:

- prompts and generated agents are aligned
- the typed registry still checks
- the install shape still works
- the repo is still reusable, not just locally hacked

## Practical Heuristics For Future Juice Extraction

When looking at `oh-my-codex`, good candidates usually have one or more of these traits:

- they sharpen agent behavior
- they improve delegation quality
- they improve verification rigor
- they improve role clarity
- they improve install-time integration with native Codex features
- they remain valuable even if tmux/hooks/runtime state disappear

Bad candidates usually have one or more of these traits:

- they exist to manage background processes
- they depend on session state machines
- they assume `.omx` durability
- they are mostly transport plumbing
- they only make sense when team orchestration is active

## Current Chedex Mental Model

Chedex is not trying to reproduce OMX.

It is trying to preserve the strongest parts of OMX’s prompt and contract design while staying:

- native-first
- repo-portable
- runtime-light
- explicit and reversible

That is the bar future extractions should keep.
