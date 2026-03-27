# Task To Research Spec

Use this template to convert a loose optimization task into a compact research plan that can hand off cleanly to `autoresearch-loop`.

## Minimum Required Spec

This is the default planning shape for `autoresearch-plan`.
Before handoff, `spec.md` should cover these fields directly or explain why a field is intentionally unavailable.

```yaml
objective: >
  What should improve?

primary_metric:
  name: ""
  direction: "minimize|maximize"
  source: ""

secondary_costs:
  - runtime
  - memory
  - complexity

fixed_layer:
  - data or fixtures that must stay constant
  - evaluation harness or rubric
  - protected files or interfaces
  - environment assumptions

mutable_layer:
  - files, prompts, configs, parameters, or strategies that may change

entrypoint:
  inspect_command: ""
  baseline_command: ""
  experiment_command: ""

budget:
  per_run_time: ""
  per_run_cost: ""
  hard_limits:
    - ""

ledger:
  path: "results.tsv"
  format: "tsv|csv|jsonl|md"
  fields:
    - id
    - metric
    - cost
    - status
    - description

artifacts:
  - logs
  - metrics
  - outputs

decision_rule:
  keep_when: ""
  discard_when: ""
  crash_when: ""
```

## Handoff-Ready Checklist

The plan is ready for `autoresearch-loop` only if you can answer yes to all of these:

- Is the primary metric observable from a stable baseline path?
- Is the fixed layer explicit enough for fair comparison?
- Is the mutable layer narrow enough for a first bounded experiment?
- Is there a concrete experiment command or equivalent run path?
- Are per-run budget and hard limits visible?
- Is there a ledger with explicit path and fields?
- Are keep, discard, and crash rules explicit?

## Normalization Rules

- Make the fixed layer explicit before proposing experiments.
- Keep the mutable layer narrow at first; expand only when necessary.
- Prefer one primary metric. Track costs separately instead of mixing them into the main score.
- If no real metric exists, define a proxy and label it clearly.
- If no run command exists, identify the closest reproducible evaluation path.
- If no ledger exists, create the smallest one that supports comparison.

## Fallbacks

Use these defaults when the task is underspecified:

- `objective`: improve outcome quality under stable comparison conditions
- `primary_metric`: the clearest existing score, eval, accuracy, latency, pass rate, or human rubric
- `secondary_costs`: runtime, memory, implementation complexity
- `ledger`: append-only TSV or JSONL with one line per experiment
- `decision_rule.keep_when`: primary metric improves enough to justify complexity
- `decision_rule.discard_when`: metric regresses, stability drops, or complexity rises without value

## Fast Checklist

- Can the user tell what is fixed versus mutable?
- Is the baseline observable?
- Can one experiment be run without ambiguity?
- Is there a place to record every result?
- Is the keep-or-revert rule explicit?
