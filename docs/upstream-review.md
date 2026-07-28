# Upstream Review And Extraction Workflow

This is the default Chedex maintenance workflow for capability refreshes,
releases, and every proposed skill or hook change. It keeps Chedex centered on
small additions to native Codex instead of accumulating a parallel runtime.

## Scope And Baseline

The native baseline is the latest stable Codex CLI with its default-enabled
features and documented built-in surfaces. Experimental opt-ins, private
rollouts, and third-party plugins or connectors are not part of the baseline.

Chedex's primary product surface is limited to:

- a native skill when a reusable method is missing from that baseline
- a native hook when deterministic lifecycle enforcement is missing and cannot
  be expressed safely through guidance, a skill, or native permissions

Guidance, custom agents, installers, audits, and tests may support those
surfaces, but are not reasons to duplicate native behavior.

A differently named command, longer prompt, or convenience alias is not a
capability gap. If ordinary Codex guidance or a built-in workflow can reach the
same outcome reliably, classify the candidate as native. A retained skill must
add a distinct, reusable procedure with evidence that the procedure itself is
missing. Existing Chedex skills are not grandfathered: every release review
revalidates the complete installed skill and hook set, and affected surfaces
are reclassified during intermediate reviews.

## 1. Establish The Current Codex Baseline

Never start from the version recorded in an earlier audit.

1. Resolve the installed and latest stable versions:

   ```bash
   codex --version
   npm view @openai/codex version dist-tags --json
   ```

2. Read the official release notes and full changelog from the last verified
   Chedex boundary through the latest stable release.
3. Refresh the current Codex manual and inspect the sections for every affected
   capability, especially skills, hooks, goals, subagents, permissions,
   plugins, and session lifecycle.
4. Retrieve the exact stable release source into a system temporary directory.
   Inspect the relevant implementation and tests when documentation alone does
   not prove the behavior:

   ```bash
   codex_snapshot="$(mktemp -d)"
   git clone --depth 1 --branch "rust-v<version>" --filter=blob:none \
     https://github.com/openai/codex.git "$codex_snapshot/codex"
   git -C "$codex_snapshot/codex" rev-parse HEAD
   ```

5. Run `npm run audit:codex`. If the latest stable release is newer than
   Chedex's boundary, update the package and compatibility versions only after
   the repository passes against that release.

Record the stable version, release tag, immutable source commit, retrieval
date, release range reviewed, manual sections used, and local audit result.

## 2. Retrieve The Current Comparison Upstream

Resolve both the latest published stable package and the repository's current
default branch. A release tag is the reproducible product snapshot; the default
branch catches unreleased implementation changes. Do not rely on the prior
vendored path, a cached checkout, or a remembered catalog.

```bash
npm view oh-my-codex version dist-tags repository --json
comparison_snapshot="$(mktemp -d)"
git clone --depth 1 https://github.com/Yeachan-Heo/oh-my-codex.git \
  "$comparison_snapshot/oh-my-codex"
git -C "$comparison_snapshot/oh-my-codex" fetch --depth 1 origin \
  "refs/tags/v<version>:refs/tags/v<version>"
git -C "$comparison_snapshot/oh-my-codex" rev-parse HEAD
git -C "$comparison_snapshot/oh-my-codex" rev-parse "v<version>^{}"
```

Read `CHANGELOG.md`, the latest release notes, and the diff from the last
reviewed immutable commit. Inventory changed skills, hooks, prompts, runtime
state, installation behavior, and tests. Use a temporary snapshot only; never
vendor it or make it a Chedex dependency.

Record the package version, tag commit, default-branch commit, retrieval date,
reviewed range, changed capability inventory, and whether default branch differs
materially from the stable release.

## 3. Build The Three-Way Delta

Compare these three sources in this order:

| Source | Question |
| --- | --- |
| Current stable Codex | What behavior exists natively with default settings? |
| Current Chedex | Is the method already covered, and can anything now be deleted? |
| Retrieved comparison upstream | What changed, and is any method still missing after native subtraction? |

Every candidate receives one disposition:

- **NATIVE** — Codex already covers the outcome; rely on Codex and remove any
  obsolete Chedex duplication.
- **MERGE** — a useful delta fits an existing Chedex skill or hook without a new
  public surface.
- **PORT** — a reusable method remains absent from the native baseline and is
  worth a focused Chedex skill, or a deterministic native lifecycle gap
  justifies a bounded hook.
- **DROP** — the candidate is product-specific runtime, compatibility glue,
  aliasing, orchestration state, or insufficiently valuable.

The evidence table must state the candidate, upstream change, native Codex
coverage, current Chedex coverage, decision, and destination. An audit with no
`MERGE` or `PORT` decision is a valid and desirable result.

## 4. Extract The Smallest Native Addition

For a retained method:

1. Re-specify the behavior from first principles against current Codex
   contracts; do not copy source text or implementation machinery.
2. Prefer deletion, then guidance, then merging into an existing skill. Add a
   new `cdx-` skill only when it has a distinct trigger and method contract.
3. Add or extend a hook only when the requirement is deterministic and
   lifecycle-bound. Keep it project-local, short-lived, dependency-free,
   stateless, trust-preserving, and routed through the existing adapter.
4. Do not reproduce schedulers, persistent workflow state, model routers,
   terminal coordination, status interfaces, plugin buses, or native feature
   ownership.
5. Add regression evidence before behavior-changing cleanup when coverage is
   missing.

When Codex newly covers an existing Chedex feature, extraction runs in reverse:
delete the redundant Chedex surface and update install/uninstall migration as
needed.

## 5. Record And Verify

Update both evidence ledgers:

- `docs/native-delta-audit.md` for Codex capability and replacement decisions
- `docs/omx-skill-extraction.md` for retrieved versions, changed candidates,
  complete dispositions, and the final extraction or no-change result

Then run:

```bash
npm run generate:agents
npm run audit:codex
npm run install:user:dry
npm run verify
git diff --check
```

Inspect the final diff for copied material, duplicated native behavior,
unnecessary dependencies, hook scope growth, installer side effects, generated
drift, and stale version or commit receipts.

The workflow is complete only when the two upstream snapshots are current, all
candidates have evidence-backed dispositions, retained behavior is minimal and
native-shaped, the ledgers are updated even for a no-change result, and every
required verification gate passes.
