---
name: autoresearch-loop
description: Governed baseline-experiment-decide loop for metric-driven optimization
argument-hint: "<spec path, handoff path, or optimization brief>"
---

# Autoresearch Loop

Use this when a metric-driven optimization problem is grounded enough to run a governed baseline/experiment/decide loop with stop-gated persistence.

## Artifact Root

Store artifacts under `$CODEX_HOME/workflows/autoresearch-loop/<slug>/`.
If `CODEX_HOME` is unset, default to `~/.codex/workflows/autoresearch-loop/<slug>/`.

Recommended files:
- `context.md` for grounded repo facts, constraints, and touchpoints
- `spec.md` for the accepted research spec
- `handoff.json` for governed execution admission, including stored `architect` and `verifier` approvals
- `progress.json` for loop status and next step
- `results.tsv` for the append-only experiment ledger
- `verify.md` for baseline, best-run, and closeout evidence

## Loop

1. Ground the current best-known state before changing the mutable layer.
2. Refuse governed execution until `spec.md`, `results.tsv`, and `handoff.json` are in place.
3. Record or inspect the baseline first.
4. Run one bounded hypothesis at a time unless the change is inherently coupled.
5. Keep the fixed layer stable for fair comparison.
6. Update `results.tsv`, `verify.md`, and `progress.json` after each meaningful step.
7. Keep the loop active until it is completed, paused, blocked, failed, or cancelled with explicit evidence.
8. Mark `completed` only after the best-known state and closeout evidence are recorded, verification is satisfied, and `progress.json.verification.review` records a verifier `pass`.

## Rules

- `autoresearch-loop` is a governed workflow owner; assume native `SessionStart` and `Stop` hooks will restore and gate it.
- Use `mode: "autoresearch-loop"` in `progress.json`.
- Keep `results.tsv` append-only and durable. Record identifier, metric, status, cost, and short description for every run, including crashes.
- Do not rewrite history as the default keep-or-revert mechanism.
- Use `ultrawork` only when experiment lanes are truly independent, preserve the same fixed layer, and do not sync competing governed state from the same workspace.
- Within one workspace, `autoresearch-loop` remains the governed owner by default. Nested helper lanes should report through the current loop instead of syncing a competing workflow entry.
- Governor admission for this mode expects `artifacts.spec`, `artifacts.results`, `artifacts.handoff`, and `artifacts.verify` to be present and resolvable.
- On pause, block, failure, or cancellation, record `next_step` or `blocker` clearly enough that the loop can resume without re-deriving the research state.
- `completed` is not enough by itself. The stop gate allows completion only when verification is satisfied.

## Progress Shape

`progress.json` should include at least:
- `schema_version`
- `mode`
- `task`
- `active`
- `phase`
- `status`
- `updated_at`
- `workflow_root`
- `next_step`
- `artifacts`
- `verification`
- `blocker`
- `risks`

`artifacts` should include:
- `spec`
- `results`
- `handoff`
- `verify`

Status vocabulary:
- non-terminal: `active`
- safe-stop terminal: `completed`, `paused`, `blocked`, `failed`, `cancelled`

## Output

- Current objective and primary metric
- Baseline result and best result so far
- Current hypothesis or latest decision
- Artifact paths produced
- Remaining risks, blocker, or next experiment
