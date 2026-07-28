---
name: cdx-autopilot
description: Execute a broad request autonomously through clarify, plan, implementation, review, adversarial QA, and verified closeout.
argument-hint: "<broad task or evolving objective>"
---

# Autopilot

Use when the user wants one autonomous entry point for a broad but authorized task.

## Phase Chain

1. **Ground**: inspect the repository and identify outcome, constraints, non-goals, and evidence needed.
2. **Clarify**: use `cdx-clarify` or `cdx-deep-interview` only when unresolved intent materially changes the result.
3. **Plan**: use `cdx-plan`; enable its consensus option for broad, architectural, or high-risk work.
4. **Execute**: use `cdx-execute`, `cdx-tdd`, `cdx-autoresearch-loop`, or `cdx-ralph` according to task shape.
5. **Review**: apply `cdx-review` independently from the writer pass when practical.
6. **QA**: apply `cdx-ultraqa` to user-critical or failure-prone flows.
7. **Close**: run the completion audit and report evidence, risks, and any explicit verification gap.

Proceed automatically on clear, reversible local steps. Ask only for a decision that changes scope materially, requires missing authority, spends meaningful external resources, or causes an irreversible/destructive effect.

Use native Goal mode only when the user explicitly requests durable goal execution. Use native subagents only when delegation is allowed and materially helpful. Never invent a parallel orchestration runtime.
