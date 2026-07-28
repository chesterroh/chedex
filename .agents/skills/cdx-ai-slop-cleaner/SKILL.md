---
name: cdx-ai-slop-cleaner
description: Remove redundant, vague, over-abstracted, or generated-looking code while preserving behavior through regression-first cleanup.
argument-hint: "<files, module, or cleanup scope>"
---

# AI Slop Cleaner

Use for cleanup, deslop, or behavior-preserving refactoring.

## Required Order

1. Write a short cleanup plan naming the behaviors that must not change.
2. Inspect tests. If coverage is missing, add regression tests before production edits and confirm the new tests can detect the protected behavior.
3. Classify concrete smells: duplication, dead code, needless wrappers, speculative abstractions, vague names, commentary that restates code, inconsistent error paths, or accidental complexity.
4. Make one smell-focused pass at a time.
5. Prefer deletion, existing utilities, and repaired boundaries over new abstractions.
6. Run focused tests after each pass, then lint, typecheck, build, broader tests, and static analysis as applicable.
7. Review the final diff for behavioral drift and unnecessary additions.

Do not add dependencies, rewrite working areas without evidence, or mix feature work into cleanup.

## Output

Changed files, deletions/simplifications, regression evidence, full verification, and remaining risk.
