---
name: execute
description: Implement and verify until done or clearly blocked
---

# Execute

Use this when the task is clear enough to act on directly.

## Rules

- Explore before editing.
- Prefer the smallest correct diff.
- Keep going until the task is complete or there is a real blocker.
- Verify every meaningful change with fresh evidence.
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
