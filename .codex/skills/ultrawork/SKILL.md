---
name: ultrawork
description: Parallel execution layer for independent work
---

# Ultrawork

Use this when the task has multiple independent lanes and parallel execution is the main need.

## Rules

- Launch only truly independent lanes in parallel.
- Keep dependent steps sequential and explicit.
- Match each lane to the smallest native role that can finish it.
- Nested `ultrawork` inside `ralph` reports through the parent workflow and stays stateless.
- In the same workspace, nested `ultrawork` should not sync separate governed state. Direct top-level governed `ultrawork` is for work whose active workspace entry is `mode: "ultrawork"`.
- Direct top-level `ultrawork` should create only the minimum governed state it needs under `$CODEX_HOME/workflows/ultrawork/<slug>/`.
- That minimum state is: `progress.json` with the governed schema, active workflow registration when the governor is installed, and `verify.md` only when the lane needs a durable evidence log.
- Direct top-level `ultrawork` does not require `handoff.json`; if the task needs a plan ratchet or resumable execution artifacts beyond that minimum, escalate to `ralph`.
- Even without `handoff.json`, a completed top-level `ultrawork` still needs `progress.json.verification.review` with a verifier `pass` and matching governor-stamped completion provenance before stop will clear it.
- If the task is a sequential baseline/experiment/ledger loop rather than independent parallel lanes, prefer `autoresearch-plan`, `autoresearch-loop`, or `ralph` over `ultrawork`.
- If the task needs resumable artifacts or a hard completion loop beyond a direct top-level fan-out, escalate to `ralph`.

## Output

- Parallel lanes launched
- Dependency edges or serialization points
- Verification evidence gathered
- Remaining risks or next lane
