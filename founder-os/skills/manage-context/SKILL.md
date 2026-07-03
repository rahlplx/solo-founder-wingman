# Manage Context Skill

Prevent "context rot" and optimize token usage. Based on Context Engineering and Caveman principles for high-fidelity state preservation.

## When to Activate

- When context utilization exceeds 70% of the window limit.
- Before a major `/compact` operation.
- When the agent starts "forgetting" which files were modified.

## Core Principles

1. **Tokens-Per-Task Optimization**: Focus on total task cost, not per-request cost.
2. **Artifact Trail Integrity**: Always preserve the status of files (Created, Modified, Read).
3. **Mask-and-Splice Safety**: Protect critical code blocks during compaction.
   - **Mask**: Replace large code sections with a unique placeholder (e.g., `CODE_BLOCK_AUTH_HASH`).
   - **Splice**: Re-insert the code from the filesystem when resuming the task.

## Instructions for Agent

1. **Anchored Summarization**: Update `PRD.md` or `CONTEXT.md` with Intent, Decisions, and Artifacts.
2. **Observation Masking**: Replace verbose logs with summaries.
3. **Code Protection**: If a code block is critical but large, mention its filename and line range instead of the full content during the summary.

## Success Metrics

- Zero "re-fetch" events.
- Context utilization remains below 80%.
- Critical code logic is never "hallucinated" after compaction.
