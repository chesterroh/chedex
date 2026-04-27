# Native Delta Audit

Use this checklist when changing Chedex surfaces that may diverge from native Codex.

The goal is not to remove every Chedex behavior. The goal is to keep only the
delta that is justified by a clear workflow need, while preferring native Codex
surfaces for everything else.

## Baseline

Current comparison boundary:

- Codex CLI: `0.125.0`
- Chedex: `0.125.0`
- Native hook surface: stable `codex_hooks`
- Native multi-agent surface: stable `multi_agent`
- Bundled system skills live under `~/.codex/skills/.system/`
- Chedex-managed user skills live under `~/.codex/skills/cdx-<name>/`

Validation note: `0.125` is the Codex release boundary for this audit, not a scalar compatibility score.

If an audit compares against upstream Codex source code instead of installed
Codex behavior, record that boundary explicitly before making decisions.

## Decision Labels

Use exactly one label for each managed surface:

- `keep`: required by the current Chedex contract and no native equivalent is available.
- `narrow`: justified, but scope can be reduced without weakening the contract.
- `replace`: native Codex now provides an equivalent path.
- `remove`: no longer justified by the contract.
- `defer`: decision needs a newer Codex baseline, better evidence, or user policy.

## Audit Rubric

Count a surface as an avoidable runtime delta only when all are true:

- It changes Codex behavior outside plain prompt, skill, or agent content.
- Codex provides an equivalent native capability for the same job.
- Chedex does not need the behavior to preserve governed workflow safety.
- Removal or replacement can be verified with the existing test and install paths.

Do not count these as avoidable runtime deltas by default:

- instruction content in `AGENTS.template.md`, `prompts/`, or `skills/`
- docs-only artifacts
- the checked-in `.codex/` mirror
- compatibility flags required by the supported Codex version range
- lifecycle-governor behavior with no native equivalent for Chedex `progress.json`, `handoff.json`, and `verify.md` ownership

## Current Surface Classification

| Surface | Label | Rationale | Recheck Trigger |
| --- | --- | --- | --- |
| `~/.codex/hooks.json` lifecycle wiring | `keep` | Native hooks run the governor, but Codex does not provide Chedex governed workflow state or closeout semantics. | Codex ships native resumable workflow ownership with stop-gated verification. |
| `SessionStart` restore and soft-clear notice | `keep` | Required to resume governed workflow context and preserve protection after chat clear. | Codex exposes equivalent workflow restore state. |
| `UserPromptSubmit` integrity guard | `keep` | Narrow fail-closed guard for unreadable or invalid governed state. | Codex exposes native governed-state integrity checks. |
| `Stop` closeout gate | `keep` | Required to prevent active or unverified governed workflows from disappearing silently. | Codex exposes native stop-gated workflow completion. |
| Release audit on `SessionStart` | `defer` | Useful for tracking native surface drift, but it is advisory Chedex behavior. | Codex provides equivalent release-delta guidance or audit cost becomes noisy. |
| `codex_hooks = true` compatibility feature | `keep` | Required while Chedex supports Codex versions where hooks are feature-gated. | Minimum supported Codex moves to a stable/default-on hook version. |
| Generated agent TOMLs | `keep` | Native Codex agent roles consume TOML config files; generation keeps prompt and registry surfaces aligned. | Codex provides a better native registry format or generation is no longer needed. |
| Absolute agent `config_file` paths | `defer` | Valid today and avoids path-resolution ambiguity; Codex relative path fixes are additive. | Install path changes or portable config becomes a priority. |
| `cdx-*` Chedex skill namespace | `keep` | Native skill directories are the intended extension surface, and the prefix keeps plain names available for bundled Codex skills. | Codex reserves or documents a first-class vendor namespace mechanism. |
| Legacy unprefixed Chedex skill names such as `plan`, `execute`, `review` | `remove` | Plain-name Chedex skills create future ambiguity with bundled native skills. | Reintroduce only as explicit user-owned aliases outside the default install. |
| Checked-in `.codex/` mirror | `keep` | Repo-only deterministic install mirror, not live runtime behavior. | Mirror maintenance cost exceeds install verification value. |
| `handoff.json.approvals` shape validation | `narrow` | Useful phase-gated admission check, but not yet governor-stamped approval provenance. | Admission approval token design is ready. |

## Productivity Enhancement Candidates

Prefer enhancements that reduce operator effort without adding always-on runtime
behavior:

- Add verification for this audit when new managed surfaces are introduced.
- Keep skill-name collision checks against bundled `.system` skills and require Chedex-managed skills to use the `cdx-` prefix.
- Generate latest verified Codex version text from one metadata source.
- Add governed workflow artifact templates for `progress.json`, `handoff.json`, and `verify.md`.
- Capture `codex exec --json` usage data in research ledgers when available.
- Add optional smoke tests for app-server, plugin, provider-discovery, permission-profile, and rollout-trace paths only when a workflow depends on them.

## Required Verification

Before keeping any native-delta change, run:

```bash
npm run verify
npm run install:user:dry
```

If the change touches prompt, skill, agent, hook, install, uninstall, docs, or
mirror surfaces, also follow the coupling rules in `docs/customizing.md`.
