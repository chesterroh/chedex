# Chedex Repo AGENTS

This repository develops a native-first Codex harness.

Use this repo to evolve:
- prompt surfaces
- role registry
- workflow skills
- workflow artifact conventions
- native agent install definitions
- install and uninstall tooling

## Working Rules

- Keep the repo runtime-light and Codex-native.
- Prefer prompts and contract layers over orchestration machinery.
- Avoid hidden install behavior; make generated files and install effects explicit.
- Keep long-running workflow skills portable; artifact roots belong under `$CODEX_HOME`.
- Keep install and uninstall flows reversible.
- Verify generated artifacts before claiming the repo is ready.

## Change Policy

- If you change a role prompt, update any generated native agent TOMLs that depend on it.
- If you add a role, update the registry, prompts, generated agents, and install script coverage together.
- If you change install paths, update install, uninstall, docs, and verification together.
