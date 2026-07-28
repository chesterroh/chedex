---
name: cdx-ralph
description: Run a persistent implement-verify-repair loop for substantial work, using native Codex Goal mode when explicitly requested.
argument-hint: "<task, accepted plan, or goal>"
---

# Ralph

Use when the user asks for persistent completion, Goal mode, or an implementation loop that must continue until verified.

## Loop

1. Establish the outcome, constraints, and measurable completion criteria.
2. If the user explicitly requested a durable goal and native goal controls are available, create or continue that goal; do not build a parallel state machine.
3. Keep a concise in-thread plan current.
4. Execute the smallest evidence-producing slice.
5. Run focused verification, repair failures, and repeat.
6. Use `cdx-ultrawork` only for independent lanes and only when delegation is allowed.
7. Before closeout, perform a completion audit: requested behavior, tests, diagnostics, final diff, known errors, and residual risk.
8. Mark a native goal complete only after every required outcome is satisfied. Mark it blocked only under the native blocked-state rules.

## Rules

- Resume from current repository and goal evidence instead of restarting.
- Do not substitute activity, token use, or partial progress for completion.
- Do not create custom progress files, hook gates, or orchestration state.
- When requirements are unclear, route through `cdx-clarify`, `cdx-deep-interview`, or `cdx-plan` before deep execution.

## Output

Current status, changes, verification evidence, and the next action or genuine blocker.
