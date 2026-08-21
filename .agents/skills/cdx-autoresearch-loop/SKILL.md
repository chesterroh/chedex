---
name: cdx-autoresearch-loop
description: Run a validator-gated baseline-experiment-decide loop for measurable optimization and keep an honest experiment ledger.
---

# Autoresearch Loop

Use after the objective, metric, comparison boundary, budget, and decision rule are stable.

## Loop

1. Run and record the baseline before changing the mutable layer.
2. State one falsifiable hypothesis.
3. Change the smallest relevant surface.
4. Run the same evaluator under the same fixed conditions.
5. Append the run to the project-appropriate ledger with identifier, change, metric, status, cost, and notes; record crashes and invalid runs too.
6. Keep, revert, or refine according to the predeclared rule.
7. Repeat until the stopping condition, budget, or genuine blocker is reached.
8. Re-run the best candidate and relevant regression checks before closeout.

For performance work, include variance, warm-up, and repeated samples. For quality work, protect against benchmark leakage and subjective metric drift. Do not rewrite failed history or move the goalposts after seeing results.

Use native Goal mode only when the user explicitly requests a durable research goal. The ledger is experiment evidence, not orchestration state.
