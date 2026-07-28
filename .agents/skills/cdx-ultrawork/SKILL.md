---
name: cdx-ultrawork
description: Coordinate multiple independent work lanes through native Codex subagents, then integrate and verify the combined result.
argument-hint: "<multi-lane task>"
---

# Ultrawork

Use when at least two bounded lanes can make useful progress independently.

## Rules

- Delegate only when the user or current session policy permits subagents.
- Give each lane a concrete deliverable, ownership boundary, and verification target.
- Keep dependent tasks sequential.
- Avoid concurrent writes to the same files; use worktrees when isolation is required.
- Use the most specific native or Chedex custom agent for each lane.
- Ask agents for concise evidence-backed summaries, not raw transcripts.
- The primary agent owns integration, conflict resolution, final tests, and the completion claim.
- If useful parallelism does not outweigh coordination cost, use `cdx-execute` instead.

## Output

- lane map and ownership
- dependency or serialization points
- integrated result
- final verification evidence
- unresolved risks
