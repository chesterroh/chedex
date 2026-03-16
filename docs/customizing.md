# Customizing

## Add a New Role

1. Add the role metadata to `registry/agent-definitions.mjs`
2. Ensure `registry/agent-definitions.ts` still typechecks
3. Add the prompt file to `prompts/<role>.md`
4. Run:

```bash
npm run generate:agents
npm run verify
```

## Add a New Skill

1. Create `skills/<name>/SKILL.md`
2. Register it in `scripts/lib.mjs` inside `listSkills()`
3. Update docs if the skill should be part of the default install set
4. If the skill creates persistent artifacts, document the `$CODEX_HOME` path it owns
5. If the skill is a governed workflow, document its `progress.json` and `handoff.json` expectations

## Change Install Paths

Update:
- `scripts/lib.mjs`
- `README.md`
- `docs/install.md`
- `docs/governor.md`
- `scripts/verify-repo.mjs`
- any uninstall guidance produced by the install script

## Change Governor Behavior

Update together:

- `hooks/chedex-governor.mjs`
- `scripts/install-user.mjs`
- `scripts/uninstall-user.mjs`
- `docs/governor.md`
- `skills/plan/SKILL.md`
- `skills/ralph/SKILL.md`
- `skills/autopilot/SKILL.md`
- `scripts/verify-governor.mjs`
