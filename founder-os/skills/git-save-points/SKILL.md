# Git Save Points Skill

Treat Git commits as "Save Points" for AI-native development. Based on Addy Osmani's methodology for granular, atomic commits (~100 lines) and trunk-based development.

## When to Activate

- Always. Every code change should be committed in small, logical slices.
- Before starting a new sub-task from the PATH plan.
- After a successful "Pass" in the `ship-checklist` for a vertical slice.

## Why Save Points?

Agents write code fast. Without granular commits, debugging a regression requires unwinding hours of work. Save points make changes manageable, reviewable, and reversible.

## Instructions for Agent

1. **Commit Early, Commit Often**: Implement slice → Test → Verify → Commit → Next slice.
2. **Atomic Commits**: Each commit does one logical thing. Do not mix "Refactor" and "New Feature" in the same commit.
3. **Change Sizing**: Aim for ~100 lines per commit. If a change is larger, look for a way to split it into two vertical slices.
4. **Conventional Commits**: Use clear prefixes:
   - `feat:` New feature
   - `fix:` Bug fix
   - `refactor:` Code change that neither fixes a bug nor adds a feature
   - `test:` Adding missing tests or correcting existing tests
5. **No "WIP" Commits**: Every commit must be a "known-good" state where the build passes and tests for that slice pass.

## Commit Message Format

`<type>: <short summary>`

Example:
`feat: add login validation to auth middleware`
