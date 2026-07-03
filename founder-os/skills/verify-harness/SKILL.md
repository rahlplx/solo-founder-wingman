# Verify Harness Skill

Audit the agentic harness to ensure skill reliability and rule integrity. Prevents skill-drift and ensures the agent is using the latest, verified protocols.

## When to Activate

- At the start of every session (`SessionStart`).
- After a `/compact` or `/clear` command to restore context-critical rules.
- When the agent behaves inconsistently with established skills.

## The Skills Registry (Skills.lock)

This project uses a `skills/registry.json` (or `skills.lock`) to track verified skill versions. The agent must verify:
1. **Presence**: Are all required skills installed?
2. **Integrity**: Have the `SKILL.md` files been modified without approval?
3. **Compatibility**: Is the current model capable of executing the skill's logic?

## Instructions for Agent

1. **Verify State**: Read the `skills/registry.json` and compare against the `skills/` directory.
2. **Restore Context**: If rules were lost during compaction, re-read the `PRD.md` and `AGENTS.md`.
3. **Report Drift**: If you find any undocumented skills or rules, flag them to the founder immediately.

## Report Format

Summary for the founder:
- **Registry Status**: [Synced / Out of Sync]
- **Skills Verified**: [Count]
- **Restored Rules**: [List any critical context re-loaded]
