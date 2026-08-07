---
name: cdx-refresh-upstreams
description: Refresh Chedex against the latest stable Codex CLI and the current comparison upstream. Use for Chedex capability audits, releases, Codex compatibility-boundary updates, or any Chedex skill or hook addition, change, or removal that requires current upstream evidence, three-way disposition, verification, and an optionally authorized commit, push, or user deployment.
---

# Refresh Chedex Upstreams

Treat `docs/upstream-review.md` as the repository source of truth. Run the full
workflow even when the expected result is no code change.

## Workflow

1. Read the active `AGENTS.md`, `docs/upstream-review.md`, both delta ledgers,
   the package metadata, and the current Git state. Preserve unrelated work.
2. Establish the current Codex baseline from fresh evidence:
   - resolve the installed and latest stable CLI versions;
   - read the official release notes and full changelog from the last verified
     boundary through latest stable;
   - refresh the current Codex manual;
   - retrieve the exact release source into a system temporary directory and
     record its immutable commit;
   - run `npm run audit:codex` before changing the compatibility boundary.
3. Retrieve the current comparison upstream into a separate system temporary
   directory. Resolve both the latest stable package/tag and the current
   default branch, record both commits, and review the changelog plus relevant
   skill, hook, prompt, installer, runtime, and test changes since the last
   reviewed commit.
4. Build the three-way delta in native-first order: current stable Codex,
   current Chedex, then the comparison upstream. Revalidate every installed
   Chedex skill and hook; do not grandfather existing surfaces. Classify every
   candidate as `NATIVE`, `MERGE`, `PORT`, or `DROP` with evidence.
5. Implement the smallest justified result:
   - prefer deletion, then guidance, then merging into an existing skill;
   - add a skill only for a distinct reusable method absent from native Codex;
   - add a hook only for a deterministic lifecycle gap that guidance, skills,
     or native permissions cannot enforce;
   - never copy or depend on reviewed upstream implementation machinery;
   - update compatibility versions only after the current CLI passes the audit.
6. Update `docs/native-delta-audit.md` and `docs/omx-skill-extraction.md` with
   versions, immutable commits, retrieval date, reviewed ranges, complete
   dispositions, manual sections, and the extraction or no-change result.
   Update affected registries, docs, installers, and regression checks together.
7. Validate changed skills with the bundled skill validator, then run:

   ```bash
   npm run generate:agents
   npm run audit:codex
   npm run install:user:dry
   npm run verify
   git diff --check
   ```

8. Review the final diff for unrelated changes, copied material, duplicated
   native behavior, generated drift, unnecessary dependencies, hook growth,
   installer side effects, and stale receipts. Remove temporary snapshots.

## Release Gate

Commit, push, publish, or deploy only when the caller explicitly authorizes the
corresponding action. Before committing, verify the intended file set and
current branch. Before pushing, confirm the commit and upstream. For Chedex's
local user deployment, run `npm run install:user` only after all gates pass,
then inspect its reported Codex version, agent count, skill count, runtime-hook
status, and feature-flag status. Report any unavailable external release or
deployment surface as an explicit gap rather than inventing one.
