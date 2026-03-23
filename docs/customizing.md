# Customizing

## Add a New Role

1. Add the role metadata to `registry/agent-definitions.mjs`
2. Ensure `registry/agent-definitions.ts` still typechecks
3. Add the prompt file to `prompts/<role>.md`
4. Run:

```bash
npm run generate:agents
npm run refresh:mirror
npm run verify
```

The checked-in mirror is limited to `.codex/AGENTS.md`, `.codex/prompts/`, `.codex/skills/`, `.codex/agents/`, and `.codex/hooks/chedex/`.
Do not commit repo-local install byproducts such as `.codex/config.toml`, `.codex/hooks.json`, `.codex/CHEDEX_UNINSTALL.md`, `.codex/CHEDEX_UNINSTALL.json`, or workflow state.

## Add a New Skill

1. Create `skills/<name>/SKILL.md`
2. Register it in `scripts/lib.mjs` inside `listSkills()`
3. Decide invocation policy:
   - default new skills to explicit invocation by name
   - add trigger guidance in `AGENTS` only when the trigger is high-signal, low-ambiguity, and worth the extra routing complexity
4. Update docs if the skill should be part of the default install set
5. Keep the skill aligned with `docs/guidance-schema.md` and `docs/prompt-contract.md`
6. If the skill creates persistent artifacts, document the `$CODEX_HOME` path it owns
7. If the skill is a governed workflow, document its `progress.json` and `handoff.json` expectations and update the governor runtime plus `scripts/verify-governor.mjs`
8. If the skill is mirrored under `.codex/`, refresh the mirror before verifying

A skill may exist as a concept-first contract before the governor admits it as a native governed mode. In that case, document the gap explicitly and avoid describing it as stop-gated or governor-restored until the runtime and tests actually support it.

## Change Instruction Surfaces

Update together when instruction behavior changes:

- `docs/guidance-schema.md`
- `docs/prompt-contract.md`
- `AGENTS.template.md`
- relevant files under `prompts/`
- relevant files under `skills/`
- generated files under `agents/` when prompts change
- mirrored files under `.codex/` when mirrored source surfaces change
- `README.md`
- `scripts/verify-repo.mjs`

Keep instruction changes small and coordinated. Structural rules belong in `docs/guidance-schema.md`; behavioral rules belong in `docs/prompt-contract.md`.

If the change affects delegation or sub-agent behavior, update:

- `AGENTS.template.md`
- `docs/prompt-contract.md`
- relevant files under `prompts/`
- generated files under `agents/` when prompts change
- mirrored files under `.codex/` when mirrored source surfaces change
- `scripts/verify-repo.mjs`

Explicit user model and reasoning requests should remain binding over inherited or default settings unless unavailable or incompatible.
Built-in role defaults and generated agent defaults should remain fallback only.

If prompt text changed, run `npm run generate:agents`, `npm run refresh:mirror`, and `npm run verify`.

## Change Install Paths

Update:
- `scripts/lib.mjs`
- `README.md`
- `docs/install.md`
- `docs/governor.md`
- `scripts/refresh-repo-mirror.mjs`
- `scripts/verify-repo.mjs`
- any uninstall guidance produced by the install script

If the changed paths are mirrored under `.codex/`, run `npm run refresh:mirror` before `npm run verify`.

## Change Governor Behavior

Update together:

- `hooks/chedex-governor.mjs`
- `hooks/codex-release-audit.mjs`
- `scripts/install-user.mjs`
- `scripts/uninstall-user.mjs`
- `docs/governor.md`
- `skills/plan/SKILL.md`
- `skills/ralph/SKILL.md`
- `skills/autopilot/SKILL.md`
- `skills/ultrawork/SKILL.md`
- `scripts/verify-governor.mjs`
- `scripts/refresh-repo-mirror.mjs`
