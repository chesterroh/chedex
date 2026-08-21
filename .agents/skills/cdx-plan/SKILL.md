---
name: cdx-plan
description: Turn a grounded request into a concise, dependency-aware, testable implementation plan; supports an explicit consensus review pass.
---

# Plan

Use this when the user asks for a plan or the task is too broad to execute safely in one direct lane.

## Method

1. Inspect the repository before asking about codebase facts.
2. Define scope, non-goals, acceptance criteria, constraints, and rollback boundaries.
3. Produce 3-7 dependency-ordered steps with a concrete proof for each meaningful step.
4. Identify independent work separately from sequential work.
5. End with risks, mitigations, and the recommended execution skill.

## Consensus Option

When the user asks for consensus or the plan is high risk:

1. Draft the plan.
2. Run a read-only architecture challenge for boundaries and tradeoffs.
3. Run a verification-readiness challenge for testability and missing evidence.
4. Perform a pre-mortem: list the most likely ways the plan could appear complete while still being wrong.
5. Revise once and state any remaining dissent.

Use native custom agents for those reviews only when delegation is allowed; otherwise perform the passes sequentially in the main thread.

Do not implement inside this skill unless the user explicitly switches to execution.
