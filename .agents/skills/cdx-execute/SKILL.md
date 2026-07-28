---
name: cdx-execute
description: Implement a clear task directly and continue through fresh verification or a genuine blocker.
argument-hint: "<scoped task>"
---

# Execute

Use this when the task is clear enough to act on without a separate planning phase.

## Method

1. Inspect the relevant code and existing patterns.
2. Make the smallest correct change.
3. Run the narrowest test that proves the changed behavior.
4. Expand to typecheck, lint, build, or broader tests when the change can affect them.
5. Read the results and repair failures before reporting completion.

Escalate to `cdx-plan` when sequencing or tradeoffs are unclear, `cdx-tdd` when a behavior change needs a failing regression first, `cdx-ralph` for explicitly requested durable Goal-mode execution, or `cdx-autoresearch-plan` for metric-driven optimization.

## Completion Gate

Do not claim completion until the requested behavior works, relevant checks pass, known gaps are explicit, and the final diff contains no unrelated changes.
