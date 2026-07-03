# UI/UX Design Skill

Design intelligence for web and mobile. Provides a systematic approach to choosing styles, color systems, and interaction patterns across different technology stacks. Inspired by UI/UX Pro Max.

## When to Activate

- When designing or refactoring a UI component (buttons, forms, charts).
- When starting a new page (Landing Page, Dashboard, SaaS).
- Before shipping a user-facing feature to ensure high perceived quality.

## The Design System Master (DSM) Pattern

Every project should maintain a `design-system/MASTER.md` file that acts as the "Source of Truth" for:
- **Core Styles**: (e.g., Minimalism, Bento Grid, Glassmorphism).
- **Color Systems**: Primary, Secondary, Neutrals (OKLCH preferred).
- **Typography**: Font pairings and modular scales.
- **Components**: Standard patterns for common elements.

## Instructions for Agent

1. **Hierarchy of Rules**:
   - **P1: Structure & Hierarchy**: What is the most important element?
   - **P2: Interaction States**: How does it look when clicked, hovered, or loading?
   - **P3: Responsive Flow**: How does the layout adapt from Mobile to Desktop?
   - **P4: Visual Polish**: Shadows, gradients, and micro-animations.
2. **Hierarchical Retrieval**:
   - Check if `design-system/pages/{page-name}.md` exists for page-specific overrides.
   - Fallback to `design-system/MASTER.md`.
3. **Anti-Pattern Check**:
   - No "identical card grids" without rhythm.
   - No "modal-first" thinking for simple data entry.
   - No inaccessible color contrasts.

## Report Format

Present a **Design Recommendation** before coding:
- **Style Selection**: (e.g., "SaaS Modern")
- **Color Palette**: (e.g., "Deep Indigo + Soft Slate")
- **Typography**: (e.g., "Inter + Geist Mono")
- **Layout Strategy**: (e.g., "Sidebar-focused dashboard with dense data tables")
