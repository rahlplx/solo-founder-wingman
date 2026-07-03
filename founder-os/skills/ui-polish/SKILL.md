# UI Polish Skill

Production-grade frontend refinement. Designs and iterates on interfaces with exceptional craft, focusing on production-readiness, accessibility, and delight. Derived from the Impeccable methodology.

## When to Activate

- After a UI component or page is implemented (`SHIP` phase).
- When a founder asks for "polish", "refinement", or says a design looks "cheap" or "generic".
- Before a final deployment to production.

## The 3 Registers

1. **Brand**: Design IS the product (Marketing, Landing, Portfolio). Goal: Personality, Conversion, Dazzle.
2. **Product**: Design SERVES the product (Dashboard, Admin, Tools). Goal: Clarity, Efficiency, Low Cognitive Load.
3. **Empty/Error**: Design SAVES the product (Onboarding, 404s, Failures). Goal: Reassurance, Guidance.

## Instructions for Agent

1. **Audit (Technical)**: Check a11y (contrast, keyboard nav), performance (image sizing, layout shifts), and responsive behavior (mobile-first).
2. **Polish (Visual)**:
   - **Typography**: Modular scale (>=1.25), line length (65-75ch), clear hierarchy.
   - **Color**: Use OKLCH, tinted neutrals, and a committed palette (no random hex codes).
   - **Layout**: Rhythmic spacing, eliminate "card-soup", fix alignment.
3. **Harden (Edge Cases)**: Address text overflow, loading states, empty states, and error handling.
4. **Delight (Emotional)**: Add purposeful motion (ease-out curves), strategic color moments, and clear UX writing (labels that lead).

## Rules of the Polish

- **No generic slop**: Avoid side-stripe borders, gradients on small text, and glassmorphism by default.
- **Physical scene forces the answer**: Dark mode vs light mode depends on the brand's physical context, not a default toggle.
- **Evidence over claims**: Run a linter or accessibility check and report the results.
