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
- Stop once the request is concrete enough to plan or execute safely.
- If the user explicitly wants to skip clarification, stop and hand off with visible assumptions.

## Output

Produce a short spec with:
- Goal
- Constraints
- Non-goals
- Acceptance criteria
- Open assumptions
- Recommended next step: `plan` or `execute`
