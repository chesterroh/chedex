---
name: cdx-review
description: Perform a reviewer-only assessment of a plan, diff, or completion claim with severity-ranked findings and a clear verdict.
---

# Review

Review only; do not silently implement fixes.

## Checklist

Prioritize:

1. correctness and regressions
2. security, permissions, and destructive side effects
3. contract and compatibility violations
4. missing or misleading tests
5. race, failure, rollback, and stale-state behavior
6. maintainability issues that create concrete future risk

Ignore taste-only comments unless they obscure correctness. Verify claims against code and fresh command output where possible. Keep author and reviewer passes separate when practical.

## Severity

- **Critical**: exploitable, destructive, or fundamentally invalid
- **High**: likely user-visible failure or broken contract
- **Medium**: real defect or meaningful coverage gap
- **Low**: bounded maintainability or clarity risk

## Output

- `Verdict: APPROVE`, `REVISE`, or `REJECT`
- findings first, ordered by severity, with file references
- missing evidence and residual risk
- if no findings exist, say so explicitly and name any verification gap
