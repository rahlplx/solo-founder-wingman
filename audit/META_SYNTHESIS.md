# Founder OS: Meta-Synthesis of Agentic Engineering

## 1. Repository Post-Mortem & Community Sentiment

| Repository | Stars | Community Verdict (Pros) | Gaps / Cons | Meta-Learning |
|---|---|---|---|---|
| **obra/superpowers** | 244k | Highest industry standard for TDD and Socratic design. | Can be too rigid/slow for rapid prototyping. | **Hard-Gate Design**: Even "simple" things need a spec. |
| **affaan-m/ECC** | 225k | Performance king. Excellent token optimization and context management. | Complex hook setup; hard for non-technical users to debug. | **Context Quality > Quantity**: Compact at milestones. |
| **garrytan/gstack** | 119k | Best "CEO/Manager" orchestration. Great for high-level strategy. | Massive open issue count (762); browser sandbox issues. | **Reversibility**: Classify every action as a One-Way/Two-Way door. |
| **mattpocock/skills** | 154k | Pragmatic, real-world engineering discipline (ADRs, CONTEXT.md). | Lacks the automated gates found in bkit/ECC. | **Domain-Driven Context**: Shared language reduces token rot. |
| **bkit** | 567 | Most advanced automated quality gates (11 gates, matchRate). | Niche community; highly opinionated PDCA cycle. | **Docs = Code**: Sync documents and code in CI. |
| **Leonxlnx/taste-skill**| 55k | Solves "AI-slop" problem. Aesthetic dials are revolutionary. | Limited to frontend; "v2" is still experimental. | **Design Read Gate**: Infer intent before generating. |
| **context-eng** | 16k | Deep research into context engineering (masking, partitioning). | Mostly educational; needs more "ready-to-use" scripts. | **Artifact Trail Integrity**: Never forget file state. |

## 2. Identified Framework & Cognitive Gaps

1. **Skill Reliability (The "Lockfile" Problem)**: Agents often "forget" or hallucinate what a skill can do. We need a `registry.json` or `skills.lock` pattern to enforce versioning.
2. **Reinforcement Feedback (The "Judgment" Loop)**: Integrating a `judge-output` skill that uses Nielsen Heuristics and `matchRate` to force self-correction.
3. **Session Continuity (The "Amnesia" Problem)**: Agents lose the "Reasoning" after a `/compact`. We need an `Anchored Iterative Summarization` pattern.
4. **Multiplayer/Subagent Handoff**: A formal `HANDOFF.md` format for transferring state between agent teams.

## 3. Implementation Roadmap
- [x] **JUDGE-OUTPUT**: 3-Axis Critique (Spec, Tech, Taste).
- [x] **VERIFY-HARNESS**: Registry-based integrity check.
- [ ] **HANDOFF**: Formal state transfer protocol.
- [ ] **SESSION-RESUME**: Hook-driven context restoration.
- [ ] **MASK-AND-SPLICE**: Code protection during compaction.
