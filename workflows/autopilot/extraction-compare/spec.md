## Goal

Produce an evidence-backed comparison showing whether Chedex successfully extracted the Codex-native surfaces from `oh-my-codex` while leaving OMX runtime machinery behind.

## Acceptance Criteria

- Compare Chedex to the guide's canonical upstream surfaces.
- Check prompts, skills, registry shape, generated agent TOMLs, install/config wiring, and verification tooling.
- Call out any meaningful drift from the guide, including whether it is acceptable.
- Write the verdict in `COMPARISON.md`.
- Run:
  - `npm run generate:agents`
  - `node scripts/verify-repo.mjs`
  - `npx tsc --noEmit`
  - `npm run install:user:dry`

## Non-Goals

- Recreate or validate omitted OMX runtime subsystems such as tmux team mode, hooks, MCP servers, HUD state, or `.omx` persistence.
- Prove parity for behavior that the guide explicitly says should not be extracted.
