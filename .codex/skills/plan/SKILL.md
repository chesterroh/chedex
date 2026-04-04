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
- Default to compact, evidence-dense planning output.
- Treat newer user updates as local overrides for the active planning branch while preserving earlier non-conflicting instructions.
- Proceed automatically on clear, low-risk, reversible next steps inside the planning workflow.
- If the plan is meant to flow into `ralph`, treat it as a governed plan.
- Governed plans must produce both `plan.md` and `handoff.json`.
- Governed plans should not be treated as execution-ready until an `architect` pass and a `verifier` pass agree the plan is grounded enough to run.
- Governed handoffs must store that reviewer sign-off in `handoff.json.approvals` so runtime admission can verify the approval provenance directly.
- If the task is stable-metric optimization over a fixed comparison boundary, prefer `autoresearch-plan` while the research spec is still forming and `autoresearch-loop` once the governed loop contract is ready to run.
- If `Non-goals` or `Decision boundaries` are still unclear, run `clarify` first, or `deep-interview` when the work needs a durable requirements artifact rather than hand off guesswork.

## Output

Every plan should include:
- Scope
- Implementation steps
- Acceptance criteria
- Risks and mitigations
- Verification steps

Governed plans should also include or produce:
- a `handoff.json` with `task`, `acceptance_criteria`, `verification_targets`, `delegation_roster`, `execution_lane`, `source_artifacts`, `approved_at`, and `approvals`
- `handoff.json.approvals` entries for both `architect` and `verifier`, each with `role`, `verdict`, `evidence_ref`, and `approved_at`
- the intended workflow owner: `ralph` or `autoresearch-loop`
- the proof path that the governor will later use to allow completion

If the request is still ambiguous, run `clarify` first, or `deep-interview` when a higher-rigor requirements pass is the safer next step.
