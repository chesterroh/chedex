---
name: autoresearch
description: Route research-shaped work to autoresearch-plan or autoresearch-loop
argument-hint: "<optimization target, spec path, or experiment brief>"
---

# Autoresearch

Use this when the task is research-shaped but it is not yet clear whether you need to ground the research spec or run the loop.
This is the compatibility router for the split research workflow surface.

## Rules

- If the task still needs a defensible metric, fixed layer, mutable layer, or experiment queue, use `autoresearch-plan`.
- If the research spec is already grounded and the task is ready for governed loop baseline/experiment/decide/repeat execution, use `autoresearch-loop`.
- If the user explicitly asks for governed stop-gated research execution, prefer `autoresearch-loop`.
- If the work is broader than a research loop and still needs end-to-end lifecycle ownership, use `autopilot` around the relevant research skill instead of overloading this router.

## Output

- Chosen lane: `autoresearch-plan` or `autoresearch-loop`
- Why that lane fits
- Any prerequisite artifact or blocker
