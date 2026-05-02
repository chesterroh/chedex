# Native Delta Audit

Use this checklist when changing Chedex surfaces that may diverge from native Codex.

The goal is not to remove every Chedex behavior. The goal is to keep only the
delta that is justified by a clear workflow need, while preferring native Codex
surfaces for everything else.

## Baseline

Current comparison boundary:

- Codex CLI: `0.128.0`
- Chedex: `0.128.0`
- Native hook surface: stable `codex_hooks`
- Native multi-agent surface: stable `multi_agent`
- Native goal workflow surface: `under development`, default on in the local
  `codex features list` probe
- Bundled system skills live under `~/.codex/skills/.system/`
- Chedex-managed user skills live under `~/.codex/skills/cdx-<name>/`

Validation note: `0.128` is the Codex release boundary for this audit, not a scalar compatibility score.

If an audit compares against upstream Codex source code instead of installed
Codex behavior, record that boundary explicitly before making decisions.

## Codex 0.128 Delta

Codex `0.128.0` is a direct stable-release jump from `0.125.0` in the
published `@openai/codex` package; the observed npm stream has `0.126.0`
alpha builds but no stable `0.126.0` or `0.127.0` boundary.

The important native additions for Chedex are:

- persisted `/goal` workflows with app-server APIs, model tools, runtime
  continuation, and TUI create/pause/resume/clear controls
- native `codex update`
- expanded permission profiles with built-in defaults, sandbox CLI profile
  selection, cwd controls, active-profile metadata, and `--full-auto`
  deprecation
- plugin marketplace install, remote bundle caching, remote uninstall,
  plugin-bundled hooks, hook enablement state, and external-agent config import
- external agent session import
- more explicit MultiAgentV2 thread caps, wait controls, root/subagent hints,
  and depth handling
- app-server schema exposure for thread goals, goal notifications, permission
  profiles, plugin install/uninstall/read/list, external-agent config import,
  and subagent metadata

Local probe evidence:

- `codex --version` reports `codex-cli 0.128.0`
- `codex features list` reports `codex_hooks`, `multi_agent`, `plugins`,
  `tool_search`, `image_generation`, `browser_use`, `computer_use`, and
  `workspace_dependencies` as stable/enabled
- `codex features list` reports `goals` as `under development true`
- `codex update --help` is available
- `codex plugin marketplace --help` exposes `add`, `upgrade`, and `remove`

## 0.128 Alignment Actions

Treat this as the extracted replacement list for the Chedex 0.128 compatibility
bump. These actions exist because native Codex now owns the same capability, or
because the old Chedex behavior only existed for pre-0.128 compatibility.

| Surface | Label | Why 0.128 changes it | Recommended action |
| --- | --- | --- | --- |
| `codex_hooks = true` compatibility config write | `replace` | Hooks are stable/default-on in the 0.128 baseline, and install only needs to detect lifecycle hook support. | Stop writing the flag on install; keep install/uninstall cleanup for older managed entries. |
| `multi_agent = true` compatibility config write | `replace` | Multi-agent is stable/enabled in the 0.128 local feature surface. | Stop forcing the flag on install; fail fast if the user disabled native multi-agent support. |
| `chedexMinimumCodexVersion = 0.114.0` and conditional `UserPromptSubmit` support | `replace` | The 0.128 baseline always has the lifecycle hooks Chedex uses. | Raise the minimum to `0.128.0`, always wire `UserPromptSubmit`, and remove old hook-event branching from install behavior. |
| Generic release-upgrade advisory in `SessionStart` | `narrow` | Native `codex update` now exists. | Point upgrade guidance at native `codex update`, with Chedex-specific verification and delta follow-up. |
| Dynamic release-delta guidance for ordinary Codex upgrades | `narrow` | Native release/update surfaces now cover more of the operator path. | Keep deltas focused on Chedex-managed runtime behavior: hooks, workflows, skills, agents, install/uninstall, and permission/profile compatibility. |
| Direct Chedex install copying hooks/skills/agents into `~/.codex` | `defer` | 0.128 improves plugin marketplace install, remote bundle caching, plugin-bundled hooks, hook enablement state, and external-agent config import. | Recheck whether Chedex should become a native plugin package before adding more install machinery; do not migrate until plugin hook behavior is stable enough for the governor. |
| Absolute generated agent `config_file` paths | `defer` | 0.125 already made relative config paths safer, and 0.128 adds external-agent config import. | Keep until install portability is prioritized, then test relative paths or native external-agent import as a replacement. |
| Chedex governed workflow runtime (`progress.json`, `handoff.json`, `verify.md`, `_active.json`, `Stop` gate) | `defer` | 0.128 adds native `/goal` workflows, but local feature maturity is `under development true` and it does not yet prove Chedex-style stop-gated verification ownership. | Do not obsolete yet. Reclassify only after `/goal` is stable and can enforce resumable workflow ownership plus verified closeout. |

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
- legacy compatibility flag cleanup for older Chedex installs
- lifecycle-governor behavior with no native equivalent for Chedex `progress.json`, `handoff.json`, and `verify.md` ownership

## Current Surface Classification

| Surface | Label | Rationale | Recheck Trigger |
| --- | --- | --- | --- |
| `~/.codex/hooks.json` lifecycle wiring | `keep` | Native hooks run the governor, but Codex does not provide Chedex governed workflow state or closeout semantics. | Codex ships native resumable workflow ownership with stop-gated verification. |
| `SessionStart` restore and soft-clear notice | `keep` | Required to resume governed workflow context and preserve protection after chat clear. | Codex exposes equivalent workflow restore state. |
| `UserPromptSubmit` integrity guard | `keep` | Narrow fail-closed guard for unreadable or invalid governed state. | Codex exposes native governed-state integrity checks. |
| `Stop` closeout gate | `keep` | Required to prevent active or unverified governed workflows from disappearing silently. | Codex exposes native stop-gated workflow completion. |
| Release audit on `SessionStart` | `narrow` | Native `codex update` now owns the generic upgrade path; Chedex only needs compatibility drift guidance. | Keep advisory behavior, but make the first upgrade step `codex update` and keep deltas Chedex-specific. |
| Legacy `codex_hooks = true` compatibility feature write | `remove` | Required only while Chedex supports Codex versions where hooks are feature-gated; 0.128 is stable/default-on. | Do not write on install; strip older managed entries during install/uninstall cleanup. |
| Legacy `multi_agent = true` compatibility feature write | `remove` | Required only while Chedex supports older versions where multi-agent may not be stable/enabled. | Do not write on install; strip older managed entries during install/uninstall cleanup. |
| Generated agent TOMLs | `keep` | Native Codex agent roles consume TOML config files; generation keeps prompt and registry surfaces aligned. | Codex provides a better native registry format or generation is no longer needed. |
| Absolute agent `config_file` paths | `defer` | Valid today and avoids path-resolution ambiguity; Codex relative path fixes and 0.128 external-agent import are additive. | Install path changes, plugin packaging, or portable config becomes a priority. |
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
