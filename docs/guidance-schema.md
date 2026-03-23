# Guidance Schema

Contributor-facing structure contract for CHEDEX instruction surfaces.

## Purpose

CHEDEX has a small number of high-leverage instruction surfaces:

- `AGENTS.template.md`
- role prompts under `prompts/`
- workflow skills under `skills/`

This document defines the canonical section layout those surfaces should follow so behavior does not drift as prompts and skills evolve.

## Required Sections

### 1. Role And Intent

State who the surface is for and what success means.

Examples:

- the global base layer in `AGENTS.template.md`
- the specialist identity in a role prompt
- the workflow purpose in a skill

### 2. Operating Principles And Constraints

State the decision rules and boundaries that should hold while the surface is active.

Examples:

- evidence over assumption
- inspect before asking
- smallest safe change
- no completion claims without proof

### 3. Execution Protocol

State the ordered working flow.

Examples:

- inspect -> plan -> implement -> verify
- clarify -> plan -> hand off
- prove or disprove completion

### 4. Verification And Completion

State what evidence is required before the surface may report success.

Examples:

- tests or diagnostics
- explicit gaps
- remaining risks
- governed workflow terminal-state proof

### 5. Recovery And Lifecycle

State how the surface should handle continuation, resume, handoff, or governed workflow ownership when applicable.

This section is required for:

- `AGENTS.template.md`
- governed workflow skills

This section may be implicit or folded into constraints for small specialist prompts.

## Surface Mapping

| Surface | Role And Intent | Operating Principles And Constraints | Execution Protocol | Verification And Completion | Recovery And Lifecycle |
| --- | --- | --- | --- | --- | --- |
| `AGENTS.template.md` | repo-wide base layer and scope | operating principles, delegation, execution rules | routing and execution policy | verification section | governed workflow and handoff rules |
| `prompts/*.md` | specialist identity | constraints | workflow | success or output contract | only when needed |
| `skills/*/SKILL.md` | workflow purpose and use-when | rules | workflow/output steps | evidence and handoff expectations | governed artifact ownership when needed |

## Optional Sections

Add these only when they materially help:

- invocation guidance
- artifact ownership
- model or reasoning guidance when the behavioral contract needs surface-specific wording
- generated-surface notes
- examples

## Model And Reasoning Guidance

If a surface can influence sub-agent selection, delegation defaults, or generated agent defaults, model or reasoning guidance is not optional.

Such surfaces should state that:

- explicit user-requested model or reasoning settings override built-in defaults unless unavailable or incompatible
- built-in defaults are fallback only and do not justify silent override or downgrade

## Skill Invocation Guidance

Skill invocation policy belongs in repo guidance, not in every skill by default.

Default CHEDEX rule:

- new skills should be explicitly invoked by name first
- add trigger guidance in `AGENTS` only when the trigger is high-signal, low-ambiguity, and materially worth the extra routing complexity

## Change Discipline

When you change an instruction surface:

1. preserve this section layout or improve it deliberately
2. keep the behavioral rules aligned with `docs/prompt-contract.md`
3. update verification if the contract changes
4. if a behavioral invariant must reach role prompts, make it explicit in the prompts and their verification
5. update generated surfaces if prompt wording changes the effective agent contract

Keep the contract small and stable. CHEDEX should gain clarity, not prompt bureaucracy.
