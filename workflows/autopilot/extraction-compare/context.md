## Task

Compare the Chedex implementation against the original implementation in `/Users/chester/work/oh-my-codex`, using `EXTRACTION_GUIDE.md` as the evaluation contract, then leave the conclusion in `COMPARISON.md`.

## Grounding

- `EXTRACTION_GUIDE.md` defines the canonical keep/remove boundary.
- Canonical upstream sources:
  - `prompts/*.md`
  - `skills/*/SKILL.md`
  - `src/agents/definitions.ts`
  - `src/agents/native-config.ts`
  - `src/config/generator.ts`
- The upstream repo also includes an `@chedex/` pack that shows an earlier native-only extraction baseline.

## Key Facts

- Chedex contains the expected native layers: `AGENTS.template.md`, `prompts/`, `skills/`, `registry/`, `agents/`, `scripts/`, and `docs/`.
- `diff -ru /Users/chester/work/oh-my-codex/@chedex/prompts /Users/chester/work/chedex/prompts` produced no differences.
- Chedex keeps 7 roles, matching the guide's reduced core set.
- Chedex keeps 8 skills: the 5 `@chedex` baseline skills plus reduced native versions of `ultrawork`, `ralph`, and `autopilot`.
- Chedex install/config scripts target `~/.codex` and only retain `.omx` references for legacy cleanup.

## Constraints

- The session could not write to `/Users/chester/.codex/workflows/...`, so audit artifacts are stored in repo-local `workflows/autopilot/extraction-compare/` instead of the preferred global artifact root.
- Verification should follow the commands listed in `EXTRACTION_GUIDE.md`.
