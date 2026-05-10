# Native Delta Audit

Use this checklist when changing Chedex surfaces that may diverge from native Codex.

The goal is not to remove every Chedex behavior. The goal is to keep only the
delta that is justified by a clear workflow need, while preferring native Codex
surfaces for everything else.

## Baseline

Current comparison boundary:

- Codex CLI: `0.129.0`
- Chedex: `0.129.0`
- Native hook surface: stable `hooks`; legacy `codex_hooks` config is accepted by Codex as an alias but should not be treated as the canonical feature key
- Native multi-agent surface: stable `multi_agent`
- Native goal workflow surface: app-server schema exists in `0.129.0`; the
  effective `goals` feature gate is experimental and Chedex install enables
  `goals = true` so `/goal` remains available after deployment
- Bundled system skills live under `~/.codex/skills/.system/`
- Chedex-managed user skills live under `~/.codex/skills/cdx-<name>/`

Validation note: `0.129` is the Codex release boundary for this audit, not a scalar compatibility score.

If an audit compares against upstream Codex source code instead of installed
Codex behavior, record that boundary explicitly before making decisions.

## Codex 0.129 Delta

Codex `0.129.0` changes the Chedex-relevant native surface from the `0.128.0`
baseline in these ways:

- the visible lifecycle-hook feature key is now `hooks`; `codex_hooks` remains
  only a legacy config alias
- hook schemas add `PreCompact` and `PostCompact`, and app-server hook metadata
  now exposes trust/hash state such as `trustStatus` and `currentHash`
- `goals` is now an experimental feature gate rather than under development,
  but it remains disabled by default locally
- app-server schema adds plugin sharing APIs, remote plugin skill reads,
  plugin availability/share context/keywords, and marketplace source filters
- app-server schema adds unsandboxed process APIs such as `process/spawn`
- thread schemas add `sessionId`, `threadSource`, and `itemsView`; service
  tier fields are open strings, and `persistExtendedHistory` is deprecated

Local probe evidence should come from `npm run audit:codex`. On Codex
`0.129.0`, the required checks are:

- `codex --version` reports `codex-cli 0.129.0`
- `codex features list` reports `hooks`, `multi_agent`, `plugins`,
  `tool_search`, `image_generation`, `browser_use`, `computer_use`, and
  `workspace_dependencies` as stable/enabled
- `codex update --help` is available
- `codex plugin marketplace --help` exposes `add`, `upgrade`, and `remove`
- `codex app-server generate-json-schema --experimental --out <dir>` exposes
  thread goal, hook, plugin sharing, plugin skill-read, app-server process,
  marketplace, permission approval, external-agent import, and thread metadata
  schemas

Optional release gates such as `goals`, `plugin_hooks`, `external_migration`,
`multi_agent_v2`, `remote_plugin`, `request_permissions_tool`,
`exec_permission_approvals`, `auth_elicitation`, `builtin_mcp`, and
`remote_compaction_v2` are reported but not required for the Chedex governor to
install.

## Historical 0.128 Delta

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

Historical 0.128 probe evidence came from `npm run audit:codex`. On Codex
`0.128.0`, the required checks were:

- `codex --version` reports `codex-cli 0.128.0`
- `codex features list` reports `codex_hooks`, `multi_agent`, `plugins`,
  `tool_search`, `image_generation`, `browser_use`, `computer_use`, and
  `workspace_dependencies` as stable/enabled
- `codex update --help` is available
- `codex plugin marketplace --help` exposes `add`, `upgrade`, and `remove`
- `codex app-server generate-json-schema --experimental` exposes thread goal,
  plugin, marketplace, permission approval, external-agent import, and thread
  metadata schemas

Those checks are retained here as historical context only; the current audit
boundary is `0.129.0`.

## 0.129 Alignment Actions

Treat this as the extracted replacement list for the Chedex 0.129 compatibility
bump. These actions exist because native Codex now owns the same capability, or
because the old Chedex behavior only existed for pre-0.129 compatibility.

| Surface | Label | Why 0.129 changes it | Recommended action |
| --- | --- | --- | --- |
| Required hook feature probe keyed only to `codex_hooks` | `replace` | Codex 0.129 reports the canonical stable hook feature as `hooks`; `codex_hooks` is only a legacy alias. | Resolve required hook support through canonical `hooks`, accept `codex_hooks` only as a legacy alias, and keep cleanup limited to older managed `codex_hooks = true` entries. |
| `hooks = true` compatibility config write | `remove` | Hooks are stable/default-on in the 0.129 baseline, and install only needs to detect lifecycle hook support. | Do not write the flag on install; also do not strip user-owned `hooks = false` during cleanup. |
| `codex_hooks = true` compatibility config write | `remove` | `codex_hooks` is a legacy alias and should not be written by current Chedex. | Stop writing the flag on install; keep install/uninstall cleanup for older managed true entries. |
| `multi_agent = true` compatibility config write | `remove` | Multi-agent is stable/enabled in the 0.129 local feature surface. | Stop forcing the flag on install; fail fast if the user disabled native multi-agent support and only clean up older managed true entries. |
| `chedexMinimumCodexVersion = 0.128.0` | `replace` | Chedex 0.129 now depends on the canonical `hooks` feature key and verifies 0.129 app-server schema surfaces. | Raise the minimum to `0.129.0`; keep legacy `codex_hooks` cleanup for older installs. |
| Generic release-upgrade advisory in `SessionStart` | `narrow` | Native `codex update` now exists. | Point upgrade guidance at native `codex update`, with Chedex-specific verification and delta follow-up. |
| Dynamic release-delta guidance for ordinary Codex upgrades | `narrow` | Native release/update surfaces now cover more of the operator path. | Keep deltas focused on Chedex-managed runtime behavior: hooks, workflows, skills, agents, install/uninstall, and permission/profile compatibility. |
| Direct Chedex install copying hooks/skills/agents into `~/.codex` | `defer` | 0.129 improves plugin sharing and remote plugin skill reads, but plugin hooks and remote plugin install behavior are still optional gates locally. | Recheck whether Chedex should become a native plugin package before adding more install machinery; do not migrate until plugin hook behavior is stable enough for the governor. |
| Absolute generated agent `config_file` paths | `defer` | Relative config path handling and external-agent import are additive but not required for the current install shape. | Keep until install portability is prioritized, then test relative paths or native external-agent import as a replacement. |
| Chedex governed workflow runtime (`progress.json`, `handoff.json`, `verify.md`, `_active.json`, `Stop` gate) | `defer` | 0.129 marks `/goal` experimental, but it still does not prove Chedex-style stop-gated verification ownership. | Do not obsolete yet. Reclassify only after `/goal` can enforce resumable workflow ownership plus verified closeout. |
| Native `goals = true` feature write | `narrow` | `/goal` is useful operator-facing native UI, but remains experimental and does not replace Chedex governed workflow ownership. | Keep enabling it on install, outside the managed agent block, and recheck parity before using it as the governed workflow substrate. |
| `PreCompact` / `PostCompact` hooks | `defer` | 0.129 exposes compact lifecycle hooks, but Chedex has no verified compact closeout contract yet. | Do not install compact hooks until governor behavior across compaction is specified and tested. |
| App-server `process/spawn` APIs | `defer` | 0.129 exposes unsandboxed process execution APIs through app-server. | Treat as high risk; do not use in Chedex automation unless a workflow explicitly owns host-process risk and verification. |

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
| `goals = true` feature write | `narrow` | `/goal` is an experimental native command Chedex wants available after deployment, while Chedex-owned governed workflows still need their existing runtime. | Write on install outside the Chedex agent block; strip Chedex-managed `goals = true` during cleanup when no backup restore is available. |
| Canonical `hooks = true` compatibility feature write | `remove` | Hooks are stable/default-on in the 0.129 baseline. | Do not write on install, and do not strip user-owned `hooks = false` during legacy cleanup. |
| Legacy `codex_hooks = true` compatibility feature write | `remove` | Required only while Chedex supported Codex versions where hooks were exposed under the legacy key. | Do not write on install; strip older managed true entries during install/uninstall cleanup. |
| Legacy `multi_agent = true` compatibility feature write | `remove` | Required only while Chedex supported older versions where multi-agent may not be stable/enabled. | Do not write on install; strip older managed true entries during install/uninstall cleanup. |
| Generated agent TOMLs | `keep` | Native Codex agent roles consume TOML config files; generation keeps prompt and registry surfaces aligned. | Codex provides a better native registry format or generation is no longer needed. |
| Absolute agent `config_file` paths | `defer` | Valid today and avoids path-resolution ambiguity; Codex relative path fixes and external-agent import are additive. | Install path changes, plugin packaging, or portable config becomes a priority. |
| `cdx-*` Chedex skill namespace | `keep` | Native skill directories are the intended extension surface, and the prefix keeps plain names available for bundled Codex skills. | Codex reserves or documents a first-class vendor namespace mechanism. |
| Legacy unprefixed Chedex skill names such as `plan`, `execute`, `review` | `remove` | Plain-name Chedex skills create future ambiguity with bundled native skills. | Reintroduce only as explicit user-owned aliases outside the default install. |
| Checked-in `.codex/` mirror | `keep` | Repo-only deterministic install mirror, not live runtime behavior. | Mirror maintenance cost exceeds install verification value. |
| `handoff.json.approvals` shape validation | `narrow` | Useful phase-gated admission check, but not yet governor-stamped approval provenance. | Admission approval token design is ready. |

## Productivity Enhancement Candidates

Prefer enhancements that reduce operator effort without adding always-on runtime
behavior:

- Add verification for this audit when new managed surfaces are introduced.
- Keep `npm run audit:codex` aligned with the Codex release-note surfaces that
  Chedex intentionally depends on or defers.
- Keep skill-name collision checks against bundled `.system` skills and require Chedex-managed skills to use the `cdx-` prefix.
- Generate latest verified Codex version text from one metadata source.
- Add governed workflow artifact templates for `progress.json`, `handoff.json`, and `verify.md`.
- Capture `codex exec --json` usage data in research ledgers when available.
- Add optional smoke tests for app-server, plugin, provider-discovery, permission-profile, and rollout-trace paths only when a workflow depends on them.

## Required Verification

Before keeping any native-delta change, run:

```bash
npm run verify
npm run audit:codex
npm run install:user:dry
```

If the change touches prompt, skill, agent, hook, install, uninstall, docs, or
mirror surfaces, also follow the coupling rules in `docs/customizing.md`.
