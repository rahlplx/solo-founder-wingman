# Ship Checklist Skill (PDCA-Powered)

The final "Quality Gate" before a feature is considered done. Incorporates the bkit PDCA (Plan-Do-Check-Act) methodology and 11 quality gates.

## When to Activate

- After implementation is complete (according to the agent).
- Before presenting the feature to the founder for final approval.
- When the founder asks "is it ready to ship?" or "is it done?".

## The 4 PDCA Quality Gates

1. **Plan Match (P)**: Does the implementation match the approved PATH plan? (Zero feature drift).
2. **Design Integrity (D)**: Does the code follow the project's architectural conventions and domain language?
3. **Check/Verify (C)**: Do all tests pass? Are all PATH dimensions (Primary, Alternate, Transitions, Hostile) covered?
4. **Act/Repair (A)**: If any gate above fails, the agent must auto-repair the code (up to 3 cycles) before asking the founder.

## Instructions for Agent

1. **Gap Detection**: Compare the final `PRD.md` and `Plan` against the actual code. List any missing requirements or "ghost" features that weren't planned.
2. **Data-Flow Integrity**: Trace the 7-layer hop: UI -> Client -> API -> Validation -> DB -> Response -> UI. If any hop is broken or unobserved, it fails the gate.
3. **Evidence Report**: Produce a final summary for the founder:
   - **Spec Match**: [Percentage]
   - **Tests**: [Pass/Fail Count]
   - **Security Scan**: [Clean/Issues]
   - **Founder Verdict**: Ready to Ship? (Yes/No)

## Rules of the Gate

- **Zero "claims"**: Never say "it works" without showing the `npm test` output or a Playwright screenshot.
- **Auto-Repair**: If a test fails, try to fix it once. If it still fails, explain the root cause to the founder instead of hiding it.
- **Client Presence**: Imagine the founder is showing this to *their* client. Is the quality high enough for that?
