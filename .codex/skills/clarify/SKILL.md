---
name: clarify
description: Lightweight one-question-at-a-time requirements clarification
argument-hint: "<idea or vague request>"
---

# Clarify

Use this when the request is broad, ambiguous, or missing acceptance criteria.

## Goal

Turn a vague request into a compact, execution-ready spec without assuming hidden requirements.

## Rules

- Ask one question at a time.
- Gather codebase facts yourself before asking the user about them.
- Target the biggest ambiguity first: goal, constraints, success criteria, or context.
- Stop once the request is concrete enough to hand off safely.
- Recommend the lightest next skill that fits the now-grounded task:
  - `execute` for a small direct change or answer
  - `plan` for scoped but still multi-step work
  - `ralph` for substantial resumable execution with governed artifacts
  - `autopilot` for broad end-to-end clarify/spec/plan/execute/verify work
- If the user explicitly wants to skip clarification, stop and hand off with visible assumptions.

## Output

Produce a short spec with:
- Goal
- Constraints
- Non-goals
- Acceptance criteria
- Open assumptions
- Recommended next step: `execute`, `plan`, `ralph`, or `autopilot`
