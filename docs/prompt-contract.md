# Prompt Contract

Contributor-facing behavioral contract for CHEDEX instruction surfaces.

## Purpose

`docs/guidance-schema.md` defines the shape of CHEDEX instruction surfaces.
This document defines the behavior those surfaces should preserve.

Use this when editing:

- `AGENTS.template.md`
- role prompts in `prompts/`
- workflow skills in `skills/`

## Core Behaviors

### 1. Compact, Evidence-Dense Output

Default to concise output, but do not omit the evidence needed to act safely.

Examples:

- short plans with explicit verification
- short verdicts with concrete proof
- brief summaries with real risks, not hand-waving

### 2. Automatic Continuation On Safe Next Steps

Proceed automatically when the next step is clear, low-risk, and reversible.

Ask only when the next step is materially branching, destructive, or preference-dependent.

### 3. Inspect First, Ask Last

Gather repo facts directly before asking the user about codebase internals.

Good questions are preference or scope questions, not lookup questions.

### 4. Local Task Updates Override Locally

Treat newer user updates as scoped overrides for the active branch of work.

Do not throw away earlier non-conflicting instructions just because the user changed one downstream detail.

### 5. Persist With Tools Until The Claim Is Grounded

If correctness depends on inspection, diagnostics, tests, or verification, keep using the relevant tools until the answer is grounded.

Do not stop at the likely answer when proof is still missing.

### 6. State Risks And Gaps Plainly

If something was not verified, say so.

If risks remain, name them concretely.

### 7. Respect Explicit User Model Intent

If the user explicitly specifies a sub-agent model or reasoning setting, treat that as binding over inherited or default settings unless it is unavailable or incompatible.

Do not replace a user-specified model with a smaller, faster, cheaper, or otherwise different model just because it seems convenient.

If the explicit request cannot be honored, say so and use the closest compliant fallback instead of silently overriding it.

Built-in role defaults, inherited defaults, and generated agent defaults are fallback only and must not be used to justify ignoring an explicit user request.

## Surface Expectations

### `AGENTS.template.md`

Should express the core behaviors as repo-wide defaults.

### Role Prompts

Must preserve the same behaviors in role-appropriate wording.

At minimum, each active role prompt should preserve:

- compact, evidence-dense output
- local task updates as local overrides
- persistence until the claim is grounded
- explicit caller-specified sub-agent model or reasoning settings over inherited or default settings unless unavailable or incompatible
- built-in defaults as fallback only rather than authority over explicit user intent

Examples:

- `executor` should keep going until implementation is verified or blocked
- `planner` should inspect before asking and keep plans testable
- `verifier` should distinguish missing evidence from failing behavior

### Workflow Skills

Should preserve the same behaviors at workflow scope.

Examples:

- `clarify` should reduce ambiguity without over-questioning
- `plan` should produce testable steps and governed handoff artifacts when needed

## Skill Invocation Policy

CHEDEX defaults to explicit invocation for new skills.

That means:

- adding a new skill does not automatically imply keyword-trigger guidance
- trigger guidance in `AGENTS` is optional and should be added only when the trigger is precise and clearly helpful

This keeps CHEDEX native-first and avoids importing a heavy routing layer by default.

## Editing Checklist

Before concluding a prompt or skill contract edit, check:

1. compact output is still the default
2. safe next steps still continue automatically
3. repo facts are still gathered before asking
4. newer user updates still apply as local overrides
5. verification is still evidence-backed
6. risks and gaps are still explicit
7. explicit user model or reasoning requests are still honored over defaults rather than silently overridden
8. regenerated agents and mirrored prompt surfaces still preserve the updated prompt contract
9. built-in defaults are still described and treated as fallback only
