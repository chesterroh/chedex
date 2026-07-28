---
name: cdx-visual-ralph
description: Iteratively implement a frontend against a generated image, static reference, or live URL using native browser, image, screenshot, and vision tools.
argument-hint: "<reference image, URL, or visual brief>"
---

# Visual Ralph

Use when visual similarity and interaction fidelity are explicit acceptance criteria.

## Input Modes

- generated reference from a visual brief
- attached or repository image
- live URL inspected through the native browser

## Loop

1. Confirm the target viewport, critical states, and reference source.
2. Inspect the current implementation and extract reusable tokens: type, spacing, color, radius, elevation, and motion.
3. Implement the smallest coherent visual slice.
4. Render the real page at the target viewport and capture a screenshot.
5. Compare structure, hierarchy, spacing, typography, color, states, responsiveness, and accessibility. Use pixel difference only as supporting evidence, not the sole verdict.
6. Rank mismatches by perceptual impact, fix the top group, and repeat.
7. Verify keyboard interaction, loading/empty/error states, and at least one narrow viewport.
8. Finish with reproducible commands, screenshots, and remaining deviations.

Use native image generation only when the user requested a generated reference or asset. Do not copy protected branding or inaccessible source assets.
