---
name: cdx-autoresearch-plan
description: Turn an optimization problem into a grounded research spec and loop handoff
argument-hint: "<optimization target, repo path, or experiment brief>"
---

# Autoresearch Plan

Use this when the task is a metric-driven optimization problem but the loop is not grounded enough to run yet.

## Artifact Root

Store artifacts under `$CODEX_HOME/workflows/autoresearch-plan/<slug>/`.
If `CODEX_HOME` is unset, default to `~/.codex/workflows/autoresearch-plan/<slug>/`.

Recommended files:
- `context.md` for grounded repo facts, constraints, and in-scope surfaces
- `spec.md` for the compact research spec
- `handoff.json` when the plan is ready to flow into governed `cdx-autoresearch-loop`
- `results.tsv` only when pre-seeding the ledger header helps the loop start cleanly

## Workflow Contract

- `cdx-autoresearch-plan` owns the normalization step between a loose optimization ask and a runnable experiment contract.
- It should make the loop shape explicit before governed execution begins.
- It should hand off to `cdx-autoresearch-loop` only when the experiment can run without re-deriving the core research state.
- It is artifact-backed but not a governed execution mode by default.

## Rules

- Normalize the task into a compact research spec before changing the mutable surface.
- `spec.md` must make the objective, primary metric, fixed layer, mutable layer, execution path, per-run budget, ledger, and keep-or-revert rule explicit. If one of those fields is not yet known, record the gap plainly instead of hand-waving it.
- Treat [`references/spec-template.md`](./references/spec-template.md) as the default planning shape whenever the task is broad, underspecified, or not already framed as an experiment loop.
- Read [`references/examples.md`](./references/examples.md) when adapting a non-training repo into the same research shape.
- Ask the minimum question needed if the metric, comparison boundary, evaluation path, or decision rule is still weak.
- Route back to `cdx-clarify` or `cdx-deep-interview` when the real objective, success metric, or decision boundary is still unstable.
- Route to `cdx-plan`, `cdx-execute`, or `cdx-autopilot` instead of forcing a research shape when the work is not actually a metric-driven optimization loop.
- Do not run the experiment loop directly inside `cdx-autoresearch-plan`.
- Do not produce `handoff.json` until the handoff-readiness gate below is satisfied.
- If the plan is ready for governed execution, produce `handoff.json` with `task`, `acceptance_criteria`, `verification_targets`, `delegation_roster`, `execution_lane`, `source_artifacts`, and `approved_at`.

## Planning Protocol

1. Ground
   - Inspect the repo and capture constraints, unknowns, and in-scope surfaces in `context.md`.
2. Normalize
   - Write `spec.md` with objective, metric, fixed layer, mutable layer, entrypoint, budget, ledger, and decision rule.
   - Keep the mutable layer as narrow as possible for the first run.
3. Stress-test the loop
   - Check that the baseline is observable.
   - Check that one bounded experiment can run without redefining the task.
   - Check that the fixed layer is stable enough for fair comparison.
   - Check that the per-run budget and hard limits are concrete enough to prevent drift.
4. Prepare execution
   - Seed `results.tsv` if a clean ledger header is useful.
   - Produce `handoff.json` when `cdx-autoresearch-loop` should take over governed execution.
5. Stop
   - Hand off explicitly to `cdx-autoresearch-loop` once the loop is grounded enough to run.

## Handoff-Readiness Gate

Treat the plan as ready for `cdx-autoresearch-loop` only when all of the following are true:

- the objective is concrete enough that a single primary metric can judge progress
- the fixed layer and mutable layer are explicit enough to preserve fair comparison
- the baseline path is observable
- one bounded experiment path is defined
- the ledger path and fields are explicit, including `results.tsv` when that is the chosen ledger
- the per-run budget and hard limits are visible
- the keep, discard, and crash rules are explicit
- unresolved assumptions are either low-risk or written down as real blockers

## Disallowed Defaults

- handing off with only a vague objective such as "make it better" or "improve quality"
- treating the baseline as implied instead of naming how it will be observed
- widening the mutable layer before the first bounded experiment justifies it
- mixing cost and quality into one ambiguous primary metric unless the tradeoff is explicitly defined
- running the experiment loop directly inside `cdx-autoresearch-plan`

## Verification And Completion

- `cdx-autoresearch-plan` is complete when `context.md` and `spec.md` are strong enough that `cdx-autoresearch-loop` can start without reopening the core framing by default.
- If the loop is ready, include `handoff.json` and any seeded ledger artifact needed for a clean first run.
- If the loop is not ready, end with the blocking ambiguity or missing evidence stated plainly.

## Output

- Current objective and primary metric
- Handoff-readiness verdict
- Fixed layer and mutable layer
- Artifact paths produced
- Remaining ambiguity or blocker
- Recommended next step: `cdx-autoresearch-loop`, `cdx-deep-interview`, `cdx-clarify`, `cdx-plan`, `cdx-execute`, or `cdx-autopilot`
