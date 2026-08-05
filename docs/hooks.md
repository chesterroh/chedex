# Native Hook Architecture

Chedex uses Codex hooks for one narrow purpose: deterministic repository
mechanics that prose guidance cannot reliably enforce. It does not use hooks as
an orchestration layer.

## Current Codex Mechanism

Codex discovers `hooks.json` or inline `[hooks]` tables beside active config
layers. Project hooks load only for trusted projects. Matching hooks from all
active sources are additive, command handlers for the same event may run
concurrently, and non-managed definitions require hash-based review through
`/hooks`.

The current native surface includes session, prompt, tool, permission,
compaction, subagent, stop, and session-end events. Only command handlers run
today; tool hooks do not cover every hosted or specialized tool path. Those
limits make hooks useful guardrails, not a complete security boundary.

Primary references:

- <https://developers.openai.com/codex/hooks>
- <https://github.com/openai/codex/tree/main/codex-rs/hooks/schema/generated>

## Chedex Structure

```text
.codex/hooks.json
        |
        v
hooks/chedex-native-hook.mjs
        |
        +-- SessionStart: compact source-of-truth context
        +-- PreToolUse: deny direct generated-agent patches
        `-- PostToolUse: remind regeneration and verification
```

The adapter receives the native JSON payload on stdin and writes native hook
JSON on stdout only when it has a decision or context to add. It is inert when
the payload's `cwd` is outside the Chedex checkout, has a 1 MiB input limit,
keeps no state, and has no third-party dependency.

Direct `apply_patch` edits under `.codex/agents/*.toml` are denied because those
files are generated. Edits to `prompts/*.md` or
`registry/agent-definitions.mjs` are allowed and followed by a reminder to run:

```bash
npm run generate:agents
npm run verify
```

## OMX Structure: Adopted And Rejected

The reviewed upstream is Oh My Codex `v0.20.3` at commit
`6c970cc12da256bfc7667edd0a9183b158d4a7a7`:
<https://github.com/Yeachan-Heo/oh-my-codex/tree/v0.20.3>.
This receipt is refreshed through [the default upstream workflow](upstream-review.md),
not treated as a permanent current version.

Adopted:

- native Codex hook registration as the outer boundary
- a single adapter that switches on `hook_event_name`
- event-specific behavior behind that adapter
- explicit ownership, installation, and regression checks

Rejected for Chedex:

- `.omx` workflow/session state and an internal plugin event bus
- keyword routing and prompt mutation that duplicate native skill discovery
- `Stop` continuation for custom workflow loops that duplicate native Goal mode
- tmux, notify, watcher, and derived-event fallback runtimes
- installer-written `hooks.state.*.trusted_hash` entries
- user-global hook installation for repository-specific policy

OMX default-branch commit `a62d5bd77bef6d2bc7df467dcae68082b8616239`
adds further hermetic PATH trust, read-only transport, cancellation, process
identity, session ownership, and platform-runtime hardening on top of the
stable receipt. Those changes protect OMX state and orchestration, so they do
not create a Chedex hook requirement. Codex `0.146.1` also preserves
stdout from command hooks that exit before consuming stdin, keeping that
process-level behavior in the native hook runner.

OMX also documents several native gaps that no longer match Codex `0.146.1`—for
example current Codex has `SessionEnd`, `SubagentStart`, and `SubagentStop`.
Chedex therefore treats current Codex documentation as canonical and OMX only
as a structural reference.

## Trust And Failure Policy

- Review or re-review the project hook with `/hooks` whenever its definition changes.
- Never bypass review by writing trust hashes from the installer.
- A malformed adapter input exits non-zero so Codex reports a hook failure.
- The adapter blocks only direct generated-file patches; all other cases fail open.
- Do not add `Stop`, `UserPromptSubmit`, or persistent state without a new documented capability gap and regression plan.

## Verification

`scripts/verify-hooks.mjs` proves registration, shared-adapter routing,
repository scoping, the generated-file denial, and the source-edit reminder.
It runs as part of `npm run verify`.
