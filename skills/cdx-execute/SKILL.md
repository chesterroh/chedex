---
name: cdx-execute
description: Implement and verify until done or clearly blocked
---

# Execute

Use this when the task is clear enough to act on directly.

## Rules

- Explore before editing.
- Prefer the smallest correct diff.
- Keep going until the task is complete or there is a real blocker.
- Verify every meaningful change with fresh evidence.
- Stay in `cdx-execute` only while the task is a direct lane with no need for governed workflow state.
- Escalate to `cdx-deep-interview` when the task needs a higher-rigor requirements artifact before planning or execution.
- Escalate to `cdx-autoresearch-plan` when a repeatable metric-driven optimization task still needs a grounded research spec.
- Escalate to `cdx-autoresearch-loop` when the task is already a governed baseline/experiment/ledger loop with a stable evaluation path and explicit keep-or-revert decisions.
- Escalate to `cdx-plan` when scope or sequencing needs to be made explicit before acting.
- Escalate to `cdx-ralph` when the task needs resumable artifacts, governed progress tracking, or a hard verification loop.
- Escalate to `cdx-autopilot` when the task needs a stricter broad-work shell across clarify/spec/plan/execute before dropping into a narrower execution lane.
- If blocked, try another grounded approach before escalating.

## Completion Gate

Do not claim completion until:
- the requested behavior is implemented
- relevant diagnostics are checked
- relevant tests pass or the gap is explicit
- build/typecheck status is stated when applicable

## Output

- Changes made
- Verification evidence
- Remaining risks or assumptions
