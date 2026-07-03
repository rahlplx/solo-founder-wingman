# Founder OS: Deep Meta-Audit & Gap Analysis

## 1. Meta-Learnings & Cognitive Patterns

| Repo | Cognitive Pattern | Meta-Learning |
|---|---|---|
| **bkit** | **PDCA Loop** | "Docs = Code". Every feature is a self-contained document cycle (PRD->Plan->Design->Code->Analysis). |
| **Superpowers** | **Hard Gate Design** | "Anti-Pattern: This is too simple to need a design." Force design approval even for trivial tasks to avoid assumption rot. |
| **Impeccable** | **Heuristic Scoring** | Structure feedback as a Design Director. Use Nielsen's 10 Heuristics for objective UI quality. |
| **gstack** | **One-Way vs Two-Way** | Reversibility x Magnitude classification for every decision. |
| **Taste-Skill** | **Design Read Gate** | "Read the room" before coding. Audience picks the aesthetic, not the agent's default. |
| **ECC** | **Strategic Compaction** | Context quality > quantity. Compact at logical breakpoints, not just at window limits. |
| **Context-Eng** | **Artifact Trail Integrity** | Tokens-per-task optimization. Never forget which files were modified across compaction boundaries. |

## 2. Framework & Format Gaps

1. **Skill Reliability (Vibecode-Pro/bkit)**: Lack of a `skills.lock` or registry to prevent the agent from hallucinating skill capabilities or drift.
2. **Automated Feedback (bkit)**: No `matchRate` calculation or automated "Gap Analysis" between Spec and Implementation.
3. **Multiplayer Handoff (gstack/mattpocock)**: Missing a formal protocol for transferring state between different agents or sessions.
4. **Code Protection (Caveman)**: "Mask-and-splice" technique to protect critical code blocks during compaction/summarization.
5. **Agent Model Routing (AMR)**: No explicit guidance or logic for switching between model tiers (Reasoning vs. Execution vs. Monitoring).

## 3. Implementation Plan for Gaps

- [ ] **Judgment Loop**: Create `judge-output` skill using Impeccable heuristics and bkit quality gates.
- [ ] **Session Continuity**: Implement `handoff` skill for state transfer.
- [ ] **Harness Audit**: Implement `verify-harness` to check `skills.lock` and rule integrity.
- [ ] **Code Protection**: Update `manage-context` with mask-and-splice principles.
- [ ] **Model Matrix**: Add `model-router` guidance to `settings.json` or `AGENTS.md`.
