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
compaction, subagent, stop, and session-end events. Command handlers can run
synchronously or in the background, and hooks can invoke MCP tools. Tool hooks
still do not cover every hosted or specialized tool path. Those limits make
hooks useful guardrails, not a complete security boundary.

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

The reviewed stable upstream is Oh My Codex `v0.20.5` at commit
`27b3a91c2ea630c2a82cdbcd45a1f1de30d9bb2a`:
<https://github.com/Yeachan-Heo/oh-my-codex/tree/v0.20.5>.
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

OMX default-branch commit `e94437fd141b4623d12a7c712d6f318e7aa47439`
differs from the stable tag only in a README callout and reductions to its
native-hook and packed-install smoke surfaces. Those changes apply to omitted
OMX runtime packaging and do not create a Chedex hook requirement. Codex
`0.148.0` added background command hooks and MCP hook handlers, while Chedex
keeps its blocking generated-file policy in one synchronous command adapter.

OMX also documents several native gaps that no longer match Codex `0.149.0`—for
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
