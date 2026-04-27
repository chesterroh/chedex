---
name: cdx-ultrawork
description: Parallel execution layer for independent work
---

# Ultrawork

Use this when the task has multiple independent lanes and parallel execution is the main need.

## Rules

- Launch only truly independent lanes in parallel.
- Keep dependent steps sequential and explicit.
- Match each lane to the smallest native role that can finish it.
- Nested `cdx-ultrawork` inside `cdx-ralph` reports through the parent workflow and stays stateless.
- In the same workspace, nested `cdx-ultrawork` should not sync separate governed state. Direct top-level governed `cdx-ultrawork` is for work whose active workspace entry is `mode: "ultrawork"`.
- Direct top-level `cdx-ultrawork` should create only the minimum governed state it needs under `$CODEX_HOME/workflows/ultrawork/<slug>/`.
- That minimum state is: `progress.json` with the governed schema, active workflow registration when the governor is installed, and `verify.md` by the verify phase or terminal states.
- Direct top-level `cdx-ultrawork` does not require `handoff.json`; if the task needs a plan ratchet or resumable execution artifacts beyond that minimum, escalate to `cdx-ralph`.
- Even without `handoff.json`, a completed top-level `cdx-ultrawork` still needs `progress.json.verification.review` with a verifier `pass`, matching governor-stamped completion provenance, and a stable evidence reference before stop will clear it.
- If the task is a sequential baseline/experiment/ledger loop rather than independent parallel lanes, prefer `cdx-autoresearch-plan`, `cdx-autoresearch-loop`, or `cdx-ralph` over `cdx-ultrawork`.
- If the task needs resumable artifacts or a hard completion loop beyond a direct top-level fan-out, escalate to `cdx-ralph`.

## Output

- Parallel lanes launched
- Dependency edges or serialization points
- Verification evidence gathered
- Remaining risks or next lane
