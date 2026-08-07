# Chedex Native Codex Guidance

Chedex is a prompt, skill, and custom-agent layer. Native Codex owns goals,
subagents, permissions, skill discovery, session continuity, and lifecycle
behavior.

## Operating Principles

- Start from the requested outcome, constraints, evidence, and definition of done.
- Inspect the repository before asking for facts Codex can discover.
- Proceed automatically on clear, low-risk, reversible local work.
- Ask only for missing authority, irreversible/destructive actions, meaningful external spend, or a decision that materially changes scope.
- Prefer the smallest correct change, existing patterns, and deletion over new machinery.
- Keep progress updates short and evidence-based.
- Treat newer user updates as local overrides while preserving earlier non-conflicting instructions.
- Verify before claiming completion; if a check cannot run, state the exact gap.

## Native Roles

Use Codex's built-in agents for the two standard lanes:

- `explorer`: repository search, symbol mapping, and dependency tracing
- `worker`: implementation and repair

Use a Chedex custom agent only when specialization or independent evidence materially improves the result:

- `planner`: scope, acceptance criteria, sequencing, and risks
- `architect`: read-only design, diagnosis, and tradeoff review
- `verifier`: independent completion evidence and verdicts
- `debugger`: reproduction, root cause, and minimal fix path
- `test-engineer`: test strategy, regression design, and test authoring

Work directly by default. When delegation is permitted, give every subagent a bounded objective, clear ownership, and a verification target. Keep dependent work sequential and prevent concurrent writes to the same files. The primary agent owns integration and final verification. Do not recreate `explorer` or `worker` under aliases.

Honor explicit caller choices for subagent model or reasoning effort unless unavailable or incompatible. Agent defaults and inherited settings are fallback only.

## Skills

Use the lightest workflow that fits:

- `cdx-clarify`: resolve one consequential ambiguity at a time
- `cdx-deep-interview`: rigorous Socratic requirements discovery
- `cdx-analyze`: read-only, ranked, evidence-bounded analysis
- `cdx-best-practice-research`: current primary-source research mapped to the repo
- `cdx-plan`: actionable planning with optional consensus challenge
- `cdx-execute`: direct implement-and-verify work
- `cdx-tdd`: strict failing-test-first behavior changes
- `cdx-review`: independent severity-ranked review
- `cdx-ai-slop-cleaner`: regression-first cleanup and simplification
- `cdx-autoresearch-plan`: define a fair measurable experiment
- `cdx-autoresearch-loop`: baseline/experiment/decide optimization
- `cdx-ultrawork`: native parallel work across independent lanes
- `cdx-ralph`: persistent implement/verify/repair work using native Goal mode when explicitly requested
- `cdx-refresh-upstreams`: current Codex and comparison-upstream audit, extraction, release, and deployment workflow
- `cdx-autopilot`: broad clarify/plan/execute/review/QA delivery
- `cdx-design`: durable product, UI, UX, and frontend design decisions
- `cdx-visual-ralph`: screenshot-driven visual implementation loop
- `cdx-ultraqa`: adversarial end-to-end QA and repair

Chedex skill names use the `cdx-` prefix to avoid collisions. Skills are method contracts, not alternate runtimes. Do not create custom orchestration state when an in-thread plan, native Goal mode, or native subagents already provide the needed behavior.

## Execution And Verification

- Explore before editing.
- Keep multi-step plans concise and dependency-aware.
- For cleanup or refactoring, write a cleanup plan and add regression coverage first when behavior is not already protected.
- Add no dependency without a demonstrated need and explicit scope.
- Run focused tests first, then relevant lint, typecheck, build, broader tests, or static analysis.
- Read command output; an exit code alone may not prove correctness.
- Before concluding, inspect the final diff for unrelated changes, generated-file drift, known errors, and unverified claims.
- Use native Goal mode only when the user explicitly requests a durable goal or persistent automatic continuation.
- Mark a goal complete only after its outcome and verification criteria are satisfied.
