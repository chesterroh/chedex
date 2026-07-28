---
name: cdx-ultraqa
description: Run adversarial end-to-end QA, repair reproducible failures, and repeat until the requested flows are proven or genuinely blocked.
argument-hint: "<feature, command, workflow, or acceptance criteria>"
---

# Ultra QA

Use for user-critical, stateful, integration-heavy, or failure-prone behavior after ordinary tests pass.

## Scenario Matrix

Select relevant hostile cases:

- malformed, empty, boundary, and oversized input
- interrupted commands, partial writes, retries, and stale state
- dirty worktrees, missing files, permissions, and unavailable dependencies
- hung, slow, flaky, concurrent, or reordered operations
- misleading success output and incomplete cleanup
- injection-shaped content and untrusted data boundaries
- resume, rollback, cancellation, and repeated execution

## Loop

1. Translate acceptance criteria into observable scenarios.
2. Reuse the real user entry point; add only minimal temporary harness code.
3. Run the smallest scenario that can disprove correctness.
4. Capture reproduction evidence and root cause.
5. Repair the smallest responsible boundary.
6. Re-run the failed scenario and surrounding regression suite.
7. Continue for a bounded number of cycles; stop on proven completion or a genuine blocker.
8. Remove temporary artifacts and report residual risk.

Never claim success from exit code alone when output or state can contradict it.
