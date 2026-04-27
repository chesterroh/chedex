---
name: cdx-ralph
description: Persistent execution loop that wraps ultrawork with artifacts and verification
argument-hint: "<task, spec, or plan path>"
---

# Ralph

Use this when the task is substantial enough to need persistent context, resumable progress, and a hard verification loop, but not specialized enough to want a different loop contract such as `cdx-autoresearch-loop`.

## Artifact Root

Store artifacts under `$CODEX_HOME/workflows/ralph/<slug>/`.
If `CODEX_HOME` is unset, default to `~/.codex/workflows/ralph/<slug>/`.

Recommended files:
- `context.md` for grounded facts, constraints, and touchpoints
- `plan.md` for the current execution plan
- `handoff.json` for execution admission, including `task`, `acceptance_criteria`, `verification_targets`, `delegation_roster`, `execution_lane`, `source_artifacts`, `approved_at`, and stored `approvals`
- `progress.json` for task status and next step
- `verify.md` for verification evidence
- `prd.md` only when the user explicitly wants a PRD-style definition of done

## Loop

1. Ground the task before execution.
2. Reuse existing artifacts when they are still accurate; resume instead of restarting.
3. If the task is still ambiguous, run `cdx-clarify` first, or `cdx-deep-interview` when the work needs a more durable requirements artifact.
4. If the task is really a repeatable metric-driven experiment loop, use `cdx-autoresearch-plan` while the spec is still forming and `cdx-autoresearch-loop` once the governed loop is ready to own execution.
5. If there is no usable plan yet, create or refresh `plan.md`.
6. Refuse deep execution until `handoff.json` declares the task, acceptance criteria, verification targets, delegation roster, intended execution lane, source artifacts, approval timestamp, and approved `architect` plus `verifier` provenance entries.
7. Use `cdx-ultrawork` as the parallel execution layer when the task splits into independent lanes.
8. Keep `progress.json` current after each meaningful step and sync the active workflow index when the governor is installed.
9. Verify with fresh evidence before claiming progress or completion.
10. Run an independent `verifier` pass before closeout, record it in `progress.json.verification.review`, and re-open the loop if it rejects the result.

## Rules

- Use native Codex agents and repo-local commands only.
- Do not depend on tmux, HUD state, notify hooks, or custom state servers.
- Ralph owns persistence and verification; `cdx-ultrawork` owns parallel fan-out inside the execution slice.
- Ralph is a governed workflow owner; assume native `SessionStart` and `Stop` hooks will restore and gate it.
- Governor validation requires `plan.md` and `handoff.json` by `cdx-execute`, and `verify.md` by `verify` or terminal states.
- Prefer the smallest execution slice that produces fresh evidence.
- Keep artifacts short and update them in place rather than creating throwaway copies.
- On pause or cancellation, mark the current state in `progress.json` instead of deleting artifacts.
- `completed` is not enough by itself. The stop gate allows completion only when verification is satisfied and `progress.json.verification.review` records a verifier `pass` with governor-stamped completion provenance and a stable evidence reference.

## Progress Shape

`progress.json` should stay compact and machine-readable. Include at least:
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

`phase` and `risks` are required fields, not optional hints.

Status vocabulary:
- non-terminal: `active`
- safe-stop terminal: `completed`, `paused`, `blocked`, `failed`, `cancelled`

## Output

- Current status
- Changes made
- Verification evidence
- Remaining risks or next step
