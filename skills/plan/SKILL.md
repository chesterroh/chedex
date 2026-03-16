---
name: plan
description: Turn a request into an actionable work plan
---

# Plan

Use this when the user explicitly wants a plan, or when the task is broad enough that planning is the safest next step.

## Rules

- Inspect the repository before asking about code facts.
- Ask only when a real branch depends on user preference or scope choice.
- Keep plans actionable and testable.
- Prefer 3-6 steps.
- Include risks and verification.
- If the plan is meant to flow into `ralph` or `autopilot`, treat it as a governed plan.
- Governed plans must produce both `plan.md` and `handoff.json`.
- Governed plans should not be execution-ready until an `architect` pass and a `verifier` pass agree the plan is grounded enough to run, including when `autopilot` owns the lifecycle.

## Output

Every plan should include:
- Scope
- Implementation steps
- Acceptance criteria
- Risks and mitigations
- Verification steps

Governed plans should also include or produce:
- a `handoff.json` with `task`, `acceptance_criteria`, `verification_targets`, `delegation_roster`, `execution_lane`, `source_artifacts`, and `approved_at`
- the intended workflow owner: `ralph` or `autopilot`
- the proof path that the governor will later use to allow completion

If the request is still ambiguous, run `clarify` first.
