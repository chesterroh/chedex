---
name: autoresearch
description: Governed baseline-experiment-ledger workflow for metric-driven optimization loops
argument-hint: "<optimization target, repo path, or experiment brief>"
---

# Autoresearch

Use this when the task is a repeatable optimization problem with a stable comparison boundary: improve a metric, keep the evaluation path fair, run small reversible experiments, and record explicit keep-or-revert decisions.

## Artifact Root

Store artifacts under `$CODEX_HOME/workflows/autoresearch/<slug>/`.
If `CODEX_HOME` is unset, default to `~/.codex/workflows/autoresearch/<slug>/`.

Recommended files:
- `context.md` for grounded repo facts, constraints, and in-scope surfaces
- `spec.md` for the compact research spec
- `results.tsv` for the experiment ledger
- `handoff.json` for governed execution admission and verification targets
- `progress.json` for governed workflow status
- `verify.md` for baseline, best-run, and completion evidence

## Rules

- Normalize the task into a compact research spec before changing the mutable surface.
- Make the objective, primary metric, fixed layer, mutable layer, execution path, per-run budget, ledger, and keep-or-revert rule explicit in `spec.md`.
- Read [`references/spec-template.md`](./references/spec-template.md) when the task is broad or not already framed as an experiment loop.
- Read [`references/examples.md`](./references/examples.md) when adapting a non-training repo into the same research shape.
- If the repository already contains a research harness, adapt to it instead of replacing it.
- Always inspect or measure the baseline first.
- Keep the fixed layer stable for fair comparison.
- Prefer one meaningful variable per experiment unless the change is inherently coupled.
- Keep `results.tsv` append-only and durable. Record identifier, metric, status, cost, and short description for every run, including crashes.
- If the task lacks a defensible metric or experiment boundary, ask the minimum question needed or run `deep-interview` before starting the loop.
- `autoresearch` is a governed workflow owner; keep `progress.json` current and assume native `SessionStart` and `Stop` hooks will restore and gate it when Chedex is installed.
- Provide `handoff.json` before deep execution begins, including the fixed layer, mutable layer, metric, experiment command, ledger path, and source artifacts.
- Do not use destructive history rewriting as the default keep-or-revert mechanism. Prefer committing only kept experiments, reverting discarded working-tree changes before commit, or using a scratch branch or worktree when isolation is needed.
- Use `ultrawork` only when experiment lanes are truly independent, preserve the same fixed layer, and keep separate ledgers or run identifiers.
- Stop only when the workflow reaches a governed terminal state with fresh evidence in `verify.md`, or when the user interrupts the loop.

## Flow

1. Normalize
   - Ground the repo in `context.md`.
   - Write `spec.md` with objective, metric, fixed layer, mutable layer, entrypoint, budget, ledger, and decision rule.
   - Produce `handoff.json` before iterative execution starts.
2. Baseline
   - Record the current best-known state.
   - Run or inspect the unmodified baseline when feasible.
   - Log the baseline in `results.tsv`.
3. Experiment
   - Choose one bounded hypothesis.
   - Change only the mutable layer needed to test it.
   - Run the fixed evaluation path and capture metrics and diagnostics.
4. Decide
   - Keep the change only if it materially improves the objective or preserves results while simplifying the system.
   - Revert or discard the change when it regresses, destabilizes, or adds unjustified complexity.
   - Update `results.tsv`, `progress.json`, and `verify.md` with the outcome.
5. Repeat
   - Continue from the current best-known state until interrupted or blocked by a real constraint.

## Output

- Current objective and primary metric
- Fixed layer and mutable layer
- Baseline result and best result so far
- Current hypothesis or latest decision
- Artifact paths produced
- Remaining risks, blocker, or next experiment
