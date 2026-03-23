---
name: deep-interview
description: High-rigor Socratic requirements clarification with durable artifacts
argument-hint: "<idea, problem, or under-specified request>"
---

# Deep Interview

Use this when the user explicitly wants a rigorous requirements pass, or when lightweight `clarify` would still leave too much ambiguity around intent, scope, constraints, `Non-goals`, or `Decision boundaries`.

## Artifact Root

Store artifacts under `$CODEX_HOME/workflows/deep-interview/<slug>/`.
If `CODEX_HOME` is unset, default to `~/.codex/workflows/deep-interview/<slug>/`.

Recommended files:
- `context.md` for grounded repo facts, constraints, and touchpoints
- `interview.md` for resolved decisions, open tensions, and the interview trail
- `spec.md` for the execution-ready requirements artifact

## Rules

- Do not implement directly inside `deep-interview`.
- Ask one question at a time.
- Inspect the repository first when brownfield facts can reduce what you need to ask.
- Start with intent, desired outcome, scope, constraints, `Non-goals`, and `Decision boundaries` before implementation detail.
- Reduce hidden assumptions instead of collecting trivia.
- Keep user effort low: only ask what materially changes the downstream plan or execution lane.
- Treat newer user updates as local overrides for the active interview branch while preserving earlier non-conflicting instructions.
- Persist artifacts in place so the interview can resume without restarting.
- `deep-interview` is artifact-backed but not a governed execution workflow by default; do not assume `progress.json`, `handoff.json`, or governor admission.
- Stop when `spec.md` is concrete enough that downstream planning or execution should not need to reopen discovery by default.
- If the user exits early, produce the best current `spec.md` and make unresolved assumptions visible.

## Flow

1. Ground the request in `context.md`.
   - Capture current repo facts, constraints, unknowns, and the problem frame.
2. Run the interview loop.
   - Ask the single highest-value next question.
   - Update `interview.md` with resolved decisions, open tensions, and remaining ambiguity.
3. Crystallize `spec.md`.
   - Include Intent, Desired outcome, Constraints, `Non-goals`, `Decision boundaries`, Acceptance criteria, and Open assumptions.
4. Hand off explicitly.
   - Recommend `execute`, `autoresearch`, `plan`, `ralph`, or `autopilot` based on execution weight.
   - Treat `spec.md` as the downstream source of truth unless the user revises it.

## Output

- Current question or artifact update
- Artifact paths produced
- Remaining ambiguity or unresolved decisions
- Recommended next step: `execute`, `autoresearch`, `plan`, `ralph`, or `autopilot`
