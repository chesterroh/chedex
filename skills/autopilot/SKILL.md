---
name: autopilot
description: End-to-end delivery workflow from idea to verified implementation
argument-hint: "<brief product idea or broad task>"
---

# Autopilot

Use this for broad, multi-phase requests where the user wants the system to carry the work from idea to verified result.

## Artifact Root

Store artifacts under `$CODEX_HOME/workflows/autopilot/<slug>/`.
If `CODEX_HOME` is unset, default to `~/.codex/workflows/autopilot/<slug>/`.

Recommended files:
- `context.md` for grounded facts and constraints
- `spec.md` for the execution-ready spec
- `plan.md` for the implementation plan
- `handoff.json` for the governed execution handoff
- `progress.json` for phase and status tracking
- `verify.md` for final evidence

## Phases

1. Clarify
   - If the request is vague, run `clarify` to close the biggest gaps.
   - If ambiguity remains high or the task needs durable requirements artifacts, run `deep-interview` and reuse its `context.md`, `interview.md`, and `spec.md`.
   - Ground the work in `context.md`.
2. Specify
   - Turn the request into a compact spec in `spec.md`.
   - Record acceptance criteria and non-goals.
3. Plan
   - Build an actionable plan in `plan.md`.
   - Produce or refresh `handoff.json`.
   - Note risks, dependencies, and proof steps before execution starts.
   - Run an `architect` pass and a `verifier` pass before handoff to confirm the governed plan is grounded enough to execute.
4. Execute
   - Hand research-loop execution to `autoresearch` when the task is stable-metric optimization over a fixed comparison boundary.
   - Hand off general implementation to `ralph` only after the plan-hardening pass agrees the work is execution-ready.
   - Let `ralph` use `ultrawork` for parallel execution only when the work splits cleanly.
   - Reuse the same facts, plan, and verification targets instead of re-deriving them.
5. Verify
   - Run the relevant diagnostics, tests, and review passes.
   - Capture completion evidence in `verify.md`.
6. Validate
   - Run an independent completion pass before marking the workflow complete.
   - Default to a `verifier` pass, and include `architect` for broad or high-risk work.

## Rules

- Complete phases in order; skip only when an earlier artifact is already good enough.
- Prefer native roles already present in Chedex: `explore`, `planner`, `executor`, `architect`, `verifier`, `debugger`, and `test-engineer`.
- `autopilot` owns the lifecycle, `autoresearch` owns governed experiment loops, `ralph` owns general persistence and verification, and `ultrawork` owns parallel fan-out.
- Reuse existing `clarify` or `deep-interview` artifacts when they are still accurate instead of re-deriving them.
- `autopilot` is a governed workflow owner; assume native `SessionStart` and `Stop` hooks will restore and gate it.
- Governed execution is not admitted until the `architect` and `verifier` plan-hardening passes both agree the work is ready to run.
- Use parallel delegation only inside a grounded phase.
- Do not depend on tmux workers, custom state servers, or non-native orchestration commands.
- If execution becomes a single focused change, drop down to `ralph` or `execute`.
- If repeated verification failures indicate a real blocker, stop and report it instead of looping blindly.

## Progress Shape

`progress.json` should include at least:
- `schema_version`
- `mode`
- `task`
- `phase`
- `active`
- `status`
- `updated_at`
- `workflow_root`
- `next_step`
- `artifacts`
- `verification`
- `blocker`
- `risks`

`phase` and `risks` are required fields, not optional hints.

## Output

- Current phase
- Artifacts produced
- Verification evidence
- Remaining risks or blocker
