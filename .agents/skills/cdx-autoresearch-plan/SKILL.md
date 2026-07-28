---
name: cdx-autoresearch-plan
description: Turn a metric-driven optimization request into a fair, bounded, reproducible experiment specification.
argument-hint: "<optimization target or experiment brief>"
---

# Autoresearch Plan

Use when success is comparative and measurable but the experiment loop is not yet safe to run.

## Required Specification

- objective and one primary metric
- baseline command and expected output
- fixed layer that must remain comparable
- mutable layer allowed to change
- candidate hypothesis and first bounded experiment
- per-run time, cost, and resource limits
- keep, discard, crash, and rollback rules
- ledger location and fields
- stopping condition

Inspect the repository and evaluation path before asking questions. Ask only for metric or decision boundaries that cannot be discovered. Challenge proxy metrics, contaminated baselines, nondeterminism, and over-wide mutable layers.

A handoff is ready only when another agent can run the baseline and first experiment without redefining the problem. Do not execute experiments inside this planning skill.
