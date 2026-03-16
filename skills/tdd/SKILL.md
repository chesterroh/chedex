---
name: tdd
description: Strict failing-test-first workflow
---

# TDD

## Iron Law

No production code without a failing test first.

## Cycle

1. RED: write one failing test for the next behavior
2. GREEN: write the minimum code to pass it
3. REFACTOR: clean up while staying green
4. REPEAT

## Rules

- One behavior per cycle.
- If the test passes immediately, the test is wrong or too broad.
- Run tests in each phase and report fresh output.
- Match the repository's existing test patterns.

## Output

## TDD Cycle

### Red
- test added
- expected failure
- actual failure evidence

### Green
- minimal implementation
- passing evidence

### Refactor
- cleanup performed
- final passing evidence
