Verification run on 2026-03-16:

1. `npm run verify`
   - Result: pass
   - Evidence: `verify-ok roles=7 skills=7`

2. `npm run install:user:dry`
   - Result: pass
   - Evidence:
     - `roles=7`
     - `skills=7`
     - `dry_run=true`

3. Skill inventory consistency check
   - Result: pass
   - Evidence:
     - `skills/` directories exactly match `scripts/lib.mjs:listSkills()`
     - `README.md` core skill list exactly matches `scripts/lib.mjs:listSkills()`

Observed implementation wiring:
- `scripts/lib.mjs:listSkills()` returns `clarify`, `plan`, `review`, `execute`, `tdd`, `ralph`, `autopilot`.
- `scripts/install-user.mjs` copies each skill returned by `listSkills()` into `$CODEX_HOME/skills/`.
- `scripts/uninstall-user.mjs` removes each installed skill returned by `listSkills()`.
- `scripts/verify-repo.mjs` checks that each listed skill has `skills/<name>/SKILL.md`.

Observed description coverage:
- Each shipped skill has clear frontmatter and body-level purpose in `skills/*/SKILL.md`.
- `README.md` lists the seven core skills but does not include short descriptions beside the names.
- `docs/install.md` explains where skills install but not what the shipped skills are.
- `docs/customizing.md` explains how to add a skill but not the meaning of existing ones.

Environment deviation:
- The intended `$CODEX_HOME` and repo `.codex` workflow artifact locations were not writable, so the audit artifacts were stored under `workflows/ralph/repo-skill-audit/`.
