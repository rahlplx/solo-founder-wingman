# Strategic Compact Skill

Suggests manual `/compact` at strategic points in your workflow rather than relying on arbitrary auto-compaction.

## When to Activate

- Running long sessions that approach context limits (200K+ tokens).
- Working on multi-phase tasks (e.g., BRIEF research → PATH plan → SHIP implementation).
- After completing a major milestone and starting new work.
- When responses slow down or become less coherent.

## Why Strategic Compaction?

Auto-compaction triggers at 95% usage, often mid-task, losing important context. Strategic compaction at logical boundaries ensures:
- **After exploration, before execution:** Compact research context, keep implementation plan.
- **After completing a milestone:** Fresh start for the next phase.

## Instructions for Agent

1. Monitor context usage (if tool available) or session length.
2. At the end of a major phase (e.g., Plan approved, Tests passed), suggest to the user: "I have completed [Phase]. Should we `/compact` now to optimize the context window for the next step?"
3. Always ensure the current PRD and Plan are saved to files before compacting so they can be re-read.
