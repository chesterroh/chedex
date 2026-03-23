---
name: autoresearch-plan
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
- `handoff.json` when the plan is ready to flow into governed `autoresearch-loop`
- `results.tsv` only when pre-seeding the ledger header helps the loop start cleanly

## Rules

- Normalize the task into a compact research spec before changing the mutable surface.
- Make the objective, primary metric, fixed layer, mutable layer, execution path, per-run budget, ledger, and keep-or-revert rule explicit in `spec.md`.
- Read [`references/spec-template.md`](./references/spec-template.md) when the task is broad or not already framed as an experiment loop.
- Read [`references/examples.md`](./references/examples.md) when adapting a non-training repo into the same research shape.
- Ask the minimum question needed if the metric, comparison boundary, or decision rule is still weak.
- Do not run the experiment loop directly inside `autoresearch-plan`.
- If the plan is ready for governed execution, produce `handoff.json` with `task`, `acceptance_criteria`, `verification_targets`, `delegation_roster`, `execution_lane`, `source_artifacts`, and `approved_at`.
- `autoresearch-plan` is artifact-backed but not a governed execution mode by default.

## Flow

1. Ground
   - Inspect the repo and capture constraints, unknowns, and in-scope surfaces in `context.md`.
2. Normalize
   - Write `spec.md` with objective, metric, fixed layer, mutable layer, entrypoint, budget, ledger, and decision rule.
3. Prepare execution
   - Seed `results.tsv` if a clean ledger header is useful.
   - Produce `handoff.json` when `autoresearch-loop` should take over governed execution.
4. Stop
   - Hand off explicitly to `autoresearch-loop` once the loop is grounded enough to run.

## Output

- Current objective and primary metric
- Fixed layer and mutable layer
- Artifact paths produced
- Remaining ambiguity or blocker
- Recommended next step: `autoresearch-loop`
