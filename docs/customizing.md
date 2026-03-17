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
3. Update docs if the skill should be part of the default install set
4. If the skill creates persistent artifacts, document the `$CODEX_HOME` path it owns
5. If the skill is a governed workflow, document its `progress.json` and `handoff.json` expectations
6. If the skill is mirrored under `.codex/`, refresh the mirror before verifying

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
