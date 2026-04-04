---
name: autopilot
description: Strict operator-facing shell for broad iterative work
argument-hint: "<brief idea, broad task, or evolving objective>"
---

# Autopilot

Use this when you want one high-iteration entrypoint for broad work and you want the broader loop itself to stay stop-gated and resumable.

## Artifact Root

Store artifacts under `$CODEX_HOME/workflows/autopilot/<slug>/`.
If `CODEX_HOME` is unset, default to `~/.codex/workflows/autopilot/<slug>/`.

Recommended files:
- `context.md` for grounded facts and constraints
- `spec.md` for the current execution-ready shape
- `plan.md` for the current implementation plan
- `handoff.json` for governed execution admission
- `progress.json` for phase and status tracking
- `verify.md` for current proof, rejections, and closeout evidence

## Workflow Contract

`autopilot` is an operator shell and a governed workflow owner.

- It may iterate aggressively across clarify, specify, plan, execute, and verify.
- It should keep the working contract tight as the task evolves.
- It should use native `SessionStart`, `UserPromptSubmit`, and `Stop` hook behavior through the same governed contract as the narrower lanes.
- It should not invent extra runtime semantics beyond the native governor contract and the narrower lanes already present in Chedex.
- Within one workspace, `autopilot` remains the governed owner by default. Nested `ralph` or `ultrawork` execution slices should report through the current `autopilot` workflow instead of syncing competing governed state.
- If the task resolves into a pure governed research loop, explicitly hand governed ownership to `autoresearch-loop` instead of keeping `autopilot` active in the same workspace.
- Governor admission for `autopilot` currently enforces `progress.json` plus `artifacts.handoff`; the other recommended artifacts remain workflow guidance rather than hard runtime requirements.

## Phases

1. Clarify
   - If the request is vague, run `clarify` to close the biggest ambiguity first.
   - If ambiguity remains high, use `deep-interview` and reuse its artifacts instead of rediscovering them.
   - Update `context.md` with grounded repo facts, user constraints, `Non-goals`, and `Decision boundaries`.
2. Specify
   - Keep `spec.md` compact and current.
   - Record acceptance criteria, proof expectations, and explicit restrictions before broad execution continues.
3. Plan
   - Build or refresh `plan.md`.
   - Tighten sequencing, dependencies, rollback boundaries, and verification steps.
   - Produce or refresh `handoff.json`, including stored `architect` and `verifier` approvals in `approvals`.
   - For broad or high-risk work, run an `architect` pass and a `verifier` pass before deep execution.
4. Execute
   - Drop to `execute` for small direct work.
   - Hand durable implementation slices to `ralph` when resumable governed execution is needed, but keep `autopilot` as the parent owner unless you are explicitly handing off the whole workflow.
   - Use `autoresearch-plan` while a metric-driven task still needs a grounded research contract.
   - Hand stable governed optimization to `autoresearch-loop` when the work has clearly become a research loop rather than a broad delivery loop.
   - Let `ralph` use `ultrawork` only when lanes are truly independent.
5. Verify
   - Refresh `verify.md` with tests, diagnostics, rejections, and remaining risk.
   - Record the verifier review record in `progress.json.verification.review` before marking the workflow completed.
   - Loop back to clarify, specify, or plan when evidence shows the contract is still weak.

## Rules

- Keep iteration high, but keep the contract tight.
- Do not allow broad execution to outrun `spec.md`, `plan.md`, or the current proof path.
- Treat `autopilot` as the operator-facing owner for broad governed work, not as a substitute runtime beneath Codex.
- Reuse existing artifacts when they are still accurate instead of restarting phases.
- Prefer native roles already present in Chedex: `explore`, `planner`, `executor`, `architect`, `verifier`, `debugger`, and `test-engineer`.
- Use native Codex agents and repo-local commands only.
- Do not depend on tmux workers, custom state servers, or non-native orchestration commands.
- If the task narrows enough, drop down to `execute`, hand controlled execution slices to `ralph`, or explicitly transfer ownership to `autoresearch-loop` instead of keeping the broader shell in control longer than necessary.
- `autopilot` is a governed workflow owner; keep `progress.json` current after meaningful steps and require verification before completion.
- If repeated verification failures expose a real blocker, report it plainly instead of looping blindly.

## Iteration Boundaries

Allowed loops:
- `clarify -> specify`
- `specify -> plan`
- `plan -> execute`
- `execute -> verify`
- `verify -> clarify|specify|plan|execute` when new evidence invalidates the current contract

Disallowed defaults:
- skipping straight to broad execution without current acceptance criteria
- parallel fan-out before the dependency edges are explicit
- allowing nested governed lanes in the same workspace to steal runtime ownership from the current `autopilot` workflow without an explicit handoff

## Output

- Current phase
- Current contract status
- Artifacts produced or refreshed
- Verification evidence
- Next narrow handoff or next iteration step
