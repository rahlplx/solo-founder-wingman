# Spec Discovery Skill

Turn research and intent into a plain-language "SPEC" for founder review before a single line of code is written. Inspired by the vibecode-pro "Spec-driven" methodology.

## When to Activate

- After BRIEF (research) is complete, before starting PATH (planning).
- When a new feature request is made.
- If the founder says "I want [X]" but haven't defined the behavior yet.

## Why Spec-Driven?

A SPEC captures **what the founder wants and why** in a way they can actually read and approve. It prevents the agent from building the "wrong thing" right.

## Instructions for Agent

1. **Plain Language**: Write for the founder, not an engineer. No file paths, no database schemas, no library names in the core SPEC.
2. **Behavioral Outcomes**: Describe "What happens" (e.g., "The user sees a red error message if the email is invalid") rather than "How it happens" (e.g., "The Zod validation catches the email format error").
3. **Flow Diagrams**: Use ASCII diagrams to map the user journey.
4. **Acceptance Criteria**: Every requirement must have a "Proven By" statement (e.g., "Proven By: E2E test simulating a failed login").
5. **Freeze the Spec**: Once the founder says "Yes, build that", the SPEC is frozen. Any changes later must be explicitly approved as a "Scope Change".

## Report Format

Generate a `{feature}_SPEC.md` file with these sections:
- **Summary**: One-sentence goal.
- **User Stories**: "As a [User], I want to [Action] so that [Value]."
- **Behavioral Rules**: The "What happens" list.
- **ASCII Flow Diagram**: The user journey map.
- **Acceptance Criteria**: List of testable outcomes.
- **Out of Scope**: Explicit "No" list.
