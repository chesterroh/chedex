# Customizing Chedex

Chedex keeps one canonical native location for each installable surface:

- skills: `.agents/skills/`
- generated project agents: `.codex/agents/`
- agent prompt sources: `prompts/`
- role metadata: `registry/agent-definitions.mjs`
- global guidance source: `AGENTS.template.md`
- project hooks: `.codex/hooks.json` routed through `hooks/chedex-native-hook.mjs`

## Add Or Change A Skill

1. Create or edit `.agents/skills/cdx-<name>/SKILL.md`.
2. Give frontmatter an exact `name` and a concrete trigger-oriented `description`.
3. Keep the skill focused on one reusable method.
4. Prefer native Goal mode, subagents, browser, image, and retrieval tools over helper runtimes.
5. Add the name to `chedexSkills` in `scripts/lib.mjs`.
6. Document it in `README.md`, `docs/install.md`, and `AGENTS.template.md`.
7. Add or update verification expectations in `scripts/verify-repo.mjs` when the skill creates a new contract.
8. Run `npm run verify`.

New skills must use the `cdx-` prefix. Merge aliases or minor variants into an
existing skill instead of expanding the public vocabulary.

## Add Or Change A Role

1. Edit `registry/agent-definitions.mjs`.
2. Add or edit the corresponding `prompts/<role>.md`.
3. Keep the role narrow, with an explicit posture, tool policy, done definition, and handoff targets.
4. Run `npm run generate:agents`.
5. Verify the generated `.codex/agents/<role>.toml` contains `name`, `description`, and `developer_instructions`.
6. Update `AGENTS.template.md`, `README.md`, and install tests when adding a role.
7. Run `npm run verify`.

Do not pin model or reasoning effort in a generated role without an explicit
product requirement; native caller choices and inheritance should remain in
control.

## Change Install Paths

Update these together:

- `scripts/lib.mjs`
- `scripts/install-user.mjs`
- `scripts/uninstall-user.mjs`
- `scripts/verify-install.mjs`
- `docs/install.md`
- `README.md`

Installation must remain reversible and must not overwrite unrelated user
content. New hook events must enforce deterministic repository mechanics,
remain project-local and dependency-free, and have focused regression coverage.
Feature flags, daemons, workflow stores, user-global hooks, and hook-managed
orchestration remain out of bounds unless a documented native capability gap
justifies them.

## Add Or Change A Hook

1. Confirm that guidance, a skill, or a native permission rule cannot provide the same deterministic behavior.
2. Register the smallest event and matcher in `.codex/hooks.json`.
3. Route it through `hooks/chedex-native-hook.mjs`; do not add a second event runtime.
4. Keep the handler inert outside the Chedex checkout and avoid transcript parsing or persistent hook state.
5. Add a focused case to `scripts/verify-hooks.mjs`.
6. Update `docs/hooks.md` and run `npm run verify`.

Do not write `hooks.state.*.trusted_hash`. Non-managed hooks must remain subject
to Codex's `/hooks` review and hash-based trust flow.

## Verification

```bash
npm run generate:agents
npm run audit:codex
npm run install:user:dry
npm run verify
```

Review the final diff for generated drift, duplicate native surfaces, hidden
install behavior, and unnecessary dependencies.
