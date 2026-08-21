---
name: cdx-analyze
description: Perform read-only deep repository analysis and return a ranked synthesis with confidence, file evidence, and explicit unknowns.
---

# Analyze

Use when the user wants explanation, diagnosis, or impact analysis before changes are proposed.

## Method

1. Restate the question and what evidence would answer it.
2. Map relevant files, symbols, call paths, tests, configuration, and history.
3. Distinguish observed facts from inferences and unresolved unknowns.
4. Rank explanations or findings by impact and evidence strength.
5. Trace competing hypotheses far enough to reject or retain them.
6. Stop when the question is answered; do not edit product files.

Use native read-only subagents only when delegation is allowed and independent search lanes would materially improve coverage.

## Output

- concise answer
- ranked findings with file and line references
- evidence / inference / unknown labels
- confidence for each material conclusion
- recommended next diagnostic or execution step
