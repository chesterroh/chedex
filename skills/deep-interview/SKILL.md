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

## Workflow Contract

- `deep-interview` owns the high-rigor discovery step between a vague request and an execution-ready requirements artifact.
- It should reduce ambiguity by exposing decision-critical assumptions, not by collecting trivia.
- It should keep user effort low while still making the downstream execution lane obvious.
- It is artifact-backed but not a governed execution workflow by default; do not assume `progress.json`, `handoff.json`, or governor admission.

## Rules

- Do not implement directly inside `deep-interview`.
- Ask one question at a time.
- Inspect the repository first when brownfield facts can reduce what you need to ask.
- Start with intent, desired outcome, scope, constraints, `Non-goals`, and `Decision boundaries` before implementation detail.
- Reduce hidden assumptions instead of collecting trivia.
- Keep user effort low: only ask what materially changes the downstream plan or execution lane.
- Treat newer user updates as local overrides for the active interview branch while preserving earlier non-conflicting instructions.
- Persist artifacts in place so the interview can resume without restarting.
- Prefer questions that collapse multiple downstream uncertainties at once.
- If a grounded repo fact answers the question well enough, record the fact instead of asking the user.
- Stop when `spec.md` is concrete enough that downstream planning or execution should not need to reopen discovery by default.
- If the user exits early, produce the best current `spec.md` and make unresolved assumptions visible.

## Question Priority

When choosing the next question, prefer this order unless the repo evidence shows a different blocker is more important:

1. Intent
   - What problem is actually worth solving?
2. Desired outcome
   - What does success look like from the user's perspective?
3. Scope
   - What is in and out of bounds?
4. Constraints
   - What technical, organizational, product, or time limits are real?
5. `Non-goals`
   - What should not be optimized or changed?
6. `Decision boundaries`
   - Which tradeoffs are already decided, and which are still open?
7. Acceptance criteria
   - How will downstream work know it is done?
8. Preferences and implementation detail
   - Only after the higher-order boundaries are stable

## Interview Protocol

1. Ground the request in `context.md`.
   - Capture current repo facts, constraints, unknowns, and the problem frame.
   - Record what the repo already answers so the interview does not ask redundant questions.
2. Run the interview loop.
   - Ask the single highest-value next question.
   - Prefer the question whose answer most reduces downstream branching risk.
   - Update `interview.md` with resolved decisions, open tensions, and remaining ambiguity.
3. Crystallize `spec.md`.
   - Include Intent, Desired outcome, Constraints, `Non-goals`, `Decision boundaries`, Acceptance criteria, and Open assumptions.
4. Hand off explicitly.
   - Recommend `execute`, `autoresearch-plan`, `autoresearch-loop`, `plan`, `ralph`, or `autopilot` based on execution weight.
   - Treat `spec.md` as the downstream source of truth unless the user revises it.

## Stop Test

`deep-interview` is ready to stop when all of the following are true:

- the real objective is stable enough that downstream work is not optimizing the wrong thing
- the desired outcome and acceptance criteria are concrete enough to judge success
- scope, constraints, `Non-goals`, and `Decision boundaries` are explicit enough to prevent avoidable rework
- the next execution lane is clear
- remaining assumptions are either low-risk or written down plainly in `spec.md`

## Disallowed Defaults

- asking implementation-detail questions before intent, scope, or boundary questions are stable
- asking multiple user questions at once by default
- asking the user for repo facts that can be gathered directly
- collecting preferences that do not materially affect the downstream lane
- ending the interview with a vague `spec.md` that still forces `plan` or `execute` to rediscover the requirements

## Verification And Completion

- `deep-interview` is complete when `context.md`, `interview.md`, and `spec.md` make the problem frame, decisions, and remaining assumptions visible enough for the recommended next lane to proceed safely.
- If ambiguity remains, name the blocker instead of implying the interview is done.
- If the user exits early, preserve the best current `spec.md` and unresolved assumptions as the resumable source of truth.

## Output

- Current question or readiness verdict
- Artifact paths produced
- Remaining ambiguity or unresolved decisions
- Recommended next step: `execute`, `autoresearch-plan`, `autoresearch-loop`, `plan`, `ralph`, or `autopilot`
