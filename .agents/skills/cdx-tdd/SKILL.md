---
name: cdx-tdd
description: Apply a strict failing-test-first cycle to a behavior change that can be proved with automated tests.
---

# Test-Driven Development

Use only when the next change has observable behavior and a meaningful automated test boundary.

## Cycle

1. **Red**: add one focused test and run it; confirm it fails for the intended reason.
2. **Green**: implement the minimum change and run the focused test.
3. **Refactor**: simplify without changing behavior and keep the test green.
4. Run the relevant surrounding suite before completion.

If the test passes before implementation, strengthen or correct it. Do not use this workflow for prose-only, metadata-only, or mechanically generated changes that lack a real behavior boundary.

## Output

Report red evidence, green evidence, refactoring performed, and final suite status.
