---
name: cdx-deep-interview
description: Run a high-rigor Socratic requirements interview when intent, scope, or decision rights are too ambiguous for safe execution.
---

# Deep Interview

Use this only when the user requests a rigorous interview or material ambiguity remains after repository inspection.

## Rules

- Do not implement during the interview.
- Separate discoverable facts from decisions only the user can make.
- Ask exactly one highest-value question per round.
- Prioritize intent, outcome, scope, constraints, non-goals, decision boundaries, and acceptance criteria before implementation preferences.
- After the obvious questions, run one pressure pass for contradictions, hidden stakeholders, failure tolerance, rollback needs, and evidence standards.
- Stop when downstream work should not need to reopen the core requirements.
- Keep the result in the conversation unless the user requests a durable requirements file.

## Readiness Test

The interview is complete when the objective is stable, success is measurable, boundaries are explicit, remaining assumptions are visible, and the next execution lane is clear.

## Output

- execution-ready requirements
- decisions and rationale
- open assumptions or blockers
- recommended next skill
