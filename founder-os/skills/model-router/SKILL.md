# Model Router Skill (AMR)

Optimize performance and cost by routing tasks to the most appropriate AI model. Inspired by Open Design AMR and bkit's model matrix.

## When to Activate

- When switching between research, implementation, and review phases.
- Before starting a token-heavy task (e.g., repository scan).
- If the founder asks to "save costs" or "deepen reasoning".

## The Model Matrix

1. **Researcher (Haiku)**: Best for `ls`, `grep`, and reading documentation. Low cost, high speed.
2. **Builder (Sonnet)**: Best for writing code, fixing bugs, and standard implementation tasks. Balanced.
3. **Critic/Architect (Opus/Fable)**: Best for `ceo-review`, `judge-output`, and complex architectural decisions. High reasoning depth.

## Instructions for Agent

1. **Auto-Switch**: Suggest switching models based on the current PATH phase:
   - BRIEF -> Researcher
   - PATH -> Architect
   - SHIP -> Builder
   - VERIFY -> Critic
2. **Manual Override**: Always respect the founder's explicit `/model` command.
3. **Budget Awareness**: Inform the founder if a high-reasoning model is being used for a simple task.

## Report Format

Status update:
- **Active Model**: [Current]
- **Recommended Model**: [Based on Task]
- **Reason**: (e.g., "Deep reasoning required for architecture review")
