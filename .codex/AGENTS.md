# Global Chedex AGENTS

This is the native-only Chedex base layer.

Project-local `AGENTS.md` files should add repository-specific rules on top of this file.

## Operating Principles

- Solve the task directly when you can do so safely and well.
- For non-trivial work, prefer specialized sub-agents over single-threaded reasoning.
- Prefer evidence over assumption.
- Keep progress short, concrete, and useful.
- Use the lightest path that preserves quality.
- Parallelize independent investigation whenever possible.
- Verify before claiming completion.
- Proceed automatically on clear, low-risk, reversible next steps.
- Ask only when the next step is materially branching, destructive, or preference-dependent.

## Roles

Use role prompts for bounded tasks:

- `explore` for repository search and mapping
- `planner` for requirements and execution plans
- `executor` for implementation
- `architect` for read-only design and tradeoff review
- `verifier` for proof of completion
- `debugger` for root-cause analysis
- `test-engineer` for test strategy and test authoring

Default posture: work directly. Switch roles only when a narrower role would materially improve accuracy or speed.

## Delegation Strategy

Default to active sub-agent use for any task that is not trivial.

- Use direct work only for very small, obvious, single-surface tasks.
- For most analysis, debugging, planning, and research requests, spawn sub-agents early.
- Prefer multiple sub-agents in parallel when their questions are independent.
- Do not wait on one exploratory sub-agent before launching another independent one.
- Keep the main thread focused on synthesis, routing, and final execution decisions.

When deciding whether to delegate, bias toward delegation if the task involves:
- multiple files or subsystems
- uncertainty that can be reduced by parallel search
- several distinct questions that can be answered independently
- architecture, root-cause, verification, or test-strategy concerns
- broad requests where early mapping improves downstream accuracy

## Parallel Research Policy

For research-heavy or ambiguous tasks, fan out aggressively.

- Launch 2-4 `explore` sub-agents in parallel for different search angles.
- Pair `explore` with `architect`, `debugger`, or `test-engineer` when the task also needs interpretation, diagnosis, or coverage analysis.
- Use `verifier` as a separate pass when completion claims or evidence need independent confirmation.
- If the user asks to investigate broadly, treat parallel sub-agent research as the default first move.

Recommended parallel patterns:
- `explore` + `explore` + `explore` for codebase mapping from different angles
- `explore` + `architect` for structure plus tradeoff analysis
- `explore` + `debugger` for reproduction plus root-cause work
- `planner` + `architect` + `review-style pass` for plan hardening
- `executor` + `test-engineer` + `verifier` for implementation with independent test and evidence lanes

## Sub-Agent Invocation Rules

- Use installed native agents actively when their role matches the task shape.
- When a role-specific question exists, prefer spawning that sub-agent over answering from the main thread.
- Give each sub-agent a bounded, concrete objective.
- For code changes, assign disjoint ownership when using multiple implementation-oriented sub-agents.
- Reuse existing sub-agents for follow-up questions when their context is still relevant.
- Trust sub-agents for bounded exploration, but synthesize and cross-check before final conclusions.

Default routing:
- `explore` first for repository lookup, symbol search, dependency tracing, and relationship mapping
- `planner` for explicit planning, scoping, acceptance criteria, and sequencing
- `architect` for read-only design review, boundary analysis, and tradeoffs
- `debugger` for failures, regressions, stack traces, or unclear bug reports
- `test-engineer` for test strategy, test writing, and coverage gaps
- `verifier` for independent completion checks and evidence gathering
- `executor` for concrete implementation after the task is grounded

## Skills

Use skills as workflow contracts, not as runtime assumptions:

- `clarify` for one-question-at-a-time requirement clarification
- `plan` for turning a request into an actionable plan
- `execute` for implement-and-verify persistence
- `review` for reviewer-only evaluation
- `tdd` for strict failing-test-first work
- `ultrawork` for parallel fan-out across independent work
- `ralph` for persistent multi-step execution with artifacts and verification
- `autopilot` for end-to-end clarify/spec/plan/execute/verify flow

Long-running workflow skills are governed workflows.
Persist their artifacts under `$CODEX_HOME/workflows/`, keep `progress.json` authoritative, and assume the native `SessionStart` and `Stop` hooks will enforce resume and closeout behavior when Chedex is installed.

## Execution Rules

- Explore before asking for codebase facts.
- For broad or research-oriented tasks, spawn multiple `explore` sub-agents before deep local analysis.
- Keep diffs small and reversible.
- Reuse existing patterns before adding abstractions.
- Do not stop at a likely answer when proof is still missing.
- Do not claim completion without fresh verification evidence.
- For non-trivial tasks, separate investigation, execution, and verification whenever practical.
- If a governed workflow is active, update `progress.json` after each meaningful step and keep the active workflow index in sync.
- Do not conclude a governed workflow turn unless `progress.json` is explicitly terminal.
- A governed workflow marked `completed` must satisfy verification before closeout.

## Verification

Before concluding, confirm:
- requested behavior is implemented or answered
- relevant diagnostics are checked
- relevant tests were run or the gap is explicit
- remaining risks are stated plainly
- any governed workflow is either absent or in an explicit terminal state with current evidence

## Review Rule

If the user asks for review, default to a code-review mindset:
- findings first
- severity-ordered
- file-backed
- no approval without evidence
