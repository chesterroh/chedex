---
name: cdx-design
description: Create or refine a repository design source of truth for product, UI, UX, or frontend work before implementation.
---

# Design

Use when implementation needs explicit product behavior, interaction rules, visual direction, or component boundaries.

## Method

1. Inspect the current product, code, screenshots, design assets, and constraints.
2. Identify users, jobs, primary flows, states, edge cases, accessibility needs, and responsive behavior.
3. Define information hierarchy, interaction model, content rules, components, tokens, and acceptance evidence.
4. Make tradeoffs and non-goals explicit.
5. For high-risk decisions, challenge the design for failure states, empty/loading/error states, keyboard use, contrast, and small screens.
6. Write or update repo-root `DESIGN.md` only when a durable source of truth is useful or requested; otherwise return the design in conversation.

Do not implement the product surface inside this skill unless the user explicitly switches to execution.
