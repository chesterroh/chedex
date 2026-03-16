Task: audit whether the current repo's skills are duly described and duly implemented.

Grounded facts:
- Repo-local skills live under `skills/*/SKILL.md`.
- Installed/default skill registry is hard-coded by `listSkills()` in `scripts/lib.mjs`.
- Install and uninstall flows copy/remove only skills returned by `listSkills()`.
- `npm run verify` passed on 2026-03-16 and reported `verify-ok roles=7 skills=7`.
- `npm run install:user:dry` passed on 2026-03-16 and reported `skills=7`.

Primary surfaces checked:
- `README.md`
- `AGENTS.md`
- `docs/install.md`
- `docs/customizing.md`
- `skills/*/SKILL.md`
- `scripts/lib.mjs`
- `scripts/install-user.mjs`
- `scripts/uninstall-user.mjs`
- `scripts/verify-repo.mjs`

Audit standard:
- "Duly described" means a user can discover the shipped skills and understand their purpose from repo docs without guessing.
- "Duly implemented" means each shipped skill has a concrete `SKILL.md` and is wired into install, uninstall, and verification surfaces.

Artifact note:
- The intended `$CODEX_HOME/workflows/ralph/...` location was not writable in this environment, so these audit artifacts were persisted under `workflows/ralph/repo-skill-audit/` in the repo as a fallback.
