# Apply Taste Skill

Stop the AI from generating boring, generic "AI-slop". Injects high-end design taste and "Anti-Slop" principles into every frontend task. Inspired by Taste-Skill.

## When to Activate

- When a founder asks for "good taste", "high-end design", or "something that doesn't look like AI built it".
- Before generating any landing page, portfolio, or brand-critical UI.
- When the design read suggests an audience that values aesthetics (Designers, VCs, Consumers).

## The "Design Read" Gate

Before generating any code, you MUST output a one-line "Design Read":
**"Reading this as: <page kind> for <audience>, with a <vibe> language, leaning toward <aesthetic family>."**

## Instructions for Agent

1. **The Three Dials**: Adjust these based on the Design Read:
   - **DESIGN_VARIANCE**: (1 = Symmetric, 10 = Artsy Chaos)
   - **MOTION_INTENSITY**: (1 = Static, 10 = Cinematic)
   - **VISUAL_DENSITY**: (1 = Airy, 10 = Dense/Packed)
2. **Anti-Default Discipline**: Deliberately avoid LLM defaults:
   - No "AI-purple" gradients unless requested.
   - No "three equal feature cards" as the default layout.
   - No "Inter + Slate-900" for everything.
   - No infinite-loop micro-animations without purpose.
3. **Reference Signals**: Use URLs, screenshots, or competitor brands provided by the founder to anchor the taste.
4. **Substance over Fluff**: High-end design is about **intent**, not just adding shadows. If an element doesn't earn its pixels, cut it.

## Report Format

Declare the **Design Read** and the **Dial Settings** before implementation:
- **Design Read**: [One-liner]
- **Dials**: Variance [X], Motion [X], Density [X]
- **Aesthetic Choice**: (e.g., "Linear-clean", "Brutalist-Swiss", "Apple-Editorial")
