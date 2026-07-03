# Judge Output Skill

Apply a "Critique-before-Ship" cognitive pattern to every major task. Acts as an internal Design Director and Technical Architect to evaluate output against objective rubrics.

## When to Activate

- Before presenting a completed feature to the founder.
- When a sub-task from the PATH plan is finished.
- After a `refactor-safely` operation.
- If the founder asks "how is the quality?".

## The 3-Axis Critique

Evaluate the output on three dimensions:

1. **Spec Match (Product)**: Does it do EXACTLY what the SPEC/PRD says? (1-10)
2. **Technical Health (Engineering)**: Is it tested, clean, and follows project standards? (1-10)
3. **Taste & UX (Design)**: Is it intuitive, polished, and free of "AI-slop"? (1-10)

## Instructions for Agent

1. **Self-Correction Loop**: Run the critique *internally* first. If any axis scores < 8, fix the issue before showing the founder.
2. **Heuristic Audit**: Use Nielsen's 10 Heuristics for UI tasks:
   - Visibility of system status.
   - Match system and real world.
   - User control and freedom.
   - Consistency and standards.
   - Error prevention.
   - Recognition rather than recall.
   - Flexibility and efficiency of use.
   - Aesthetic and minimalist design.
   - Help users with errors.
   - Help and documentation.
3. **Gap Detection**: Explicitly list any "Gaps" (planned but missing) or "Ghost Features" (unplanned additions).

## Report Format

Present a **Quality Verdict** to the founder:
- **Product Score**: [X]/10
- **Eng Score**: [X]/10
- **Design Score**: [X]/10
- **Verdict**: (e.g., "Pass - Ready to Ship" or "Iterating - Needs more polish")
- **Top 3 Findings**: Bullet points of specific issues or wins.
