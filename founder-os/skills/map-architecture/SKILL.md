# Map Architecture Skill

Design the "Blueprint" for the founder's vision, focusing on stateful agents, scalable stacks, and visual hierarchy. Inspired by Open Design and VibeSDK (Cloudflare) patterns.

## When to Activate

- During the PATH phase, before implementation begins.
- When adding a new major component (e.g., Auth, Database, UI System).
- When a founder asks "how will this work under the hood?".

## Architectural Pillars

1. **Stateful vs Stateless**: Identify which components need persistent state (e.g., User Profiles, Message History) vs. pure logic (e.g., Formatters, Calculators).
2. **"Design-First" Hierarchy**: Use the 9-section `DESIGN.md` schema to map the visual direction before coding.
3. **Infrastructure Boundaries**: Define where the data lives (Edge, Worker, Database) and how it flows.

## Instructions for Agent

1. **Visual Mapping**: Create an ASCII diagram of the system components and their interactions.
2. **Stack Selection**: Recommend the most efficient "Vibe-Stack" for the job (e.g., Cloudflare Workers + D1 for speed, or Supabase for rapid auth/db).
3. **Design Intent**: Map the visual hierarchy:
   - **Visual Direction**: (e.g., Minimal, Brutalist, Enterprise).
   - **Primary Actions**: What should the user see first?
   - **State Machine**: Map the "Happy Path" and "Error Path" states.
4. **Safety Boundaries**: Define the "Sanitized" and "Privileged" zones for data handling.

## Report Format

Generate a `MAP.md` or update `PRD.md` with:
- **System Diagram**: ASCII architecture map.
- **Data Flow**: Step-by-step trace of a core action.
- **Visual Spec**: Hierarchy, colors, and typography direction.
- **Scalability Note**: What happens when the user count 10x?
