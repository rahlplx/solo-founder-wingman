# Deep Dive Audit: Implementing Google OKF (Open Knowledge Format) in Founder OS

## 1. Overview
OKF v0.1 (Open Knowledge Format) is a structural knowledge specification optimized for AI agent retrieval and human readability. It uses Markdown files with YAML frontmatter to represent concepts as a navigable graph.

## 2. Why OKF for Founder OS?
Currently, Founder OS uses monolithic files (`PRD.md`, `AGENTS.md`) which grow in complexity and become difficult for agents to parse as the project scales. OKF enhances this by:
- **Atomicity**: Breaking down "The Data Model" into individual concepts (Tables, Schemas).
- **Progressive Disclosure**: Using `index.md` to guide agents only to the context they need.
- **Traceability**: Using `log.md` to track the evolution of requirements and technical decisions.
- **Interoperability**: Providing a standard format that any compliant agent can read and maintain.

## 3. Implementation Plan: Where and How

### A. Artifact Refactoring
We will move from a flat root file structure to a `.okf/` knowledge bundle:
- `.okf/index.md`: Root discovery file (The "Map").
- `.okf/prd/`: Granular requirements (BRIEF components, Behavior Rules).
- `.okf/lego/`: Data models, API endpoints, and Auth policies.
- `.okf/decisions/`: Recorded ADRs (Architectural Decision Records).
- `.okf/log.md`: Project-wide change history.

### B. Skill Enhancements
- **`/founding-prompt`**: Updated to initialize the `.okf/` bundle instead of just generating `PRD.md`.
- **`/map-architecture`**: Updated to write LEGO blocks as individual OKF concepts with `type: Table` or `type: API`.
- **`/weekly-plan`**: Updated to write reconciliation logs directly into `.okf/log.md`.
- **New Skill: `/okf`**: A dedicated skill for bundle maintenance, validation, and visualization.

### C. Technical Enhancements for Agents
- **Metadata-Driven Routing**: Agents can filter by `type: behavior-rule` or `tag: security` to find relevant constraints.
- **Graph Navigation**: Using bundle-relative links (`/lego/users.md`) allows agents to "walk" the architecture.
- **Structural Parsing**: Enforcing `# Schema` and `# Examples` sections ensures consistent tool usage.

## 4. Gap Analysis (OKF vs. Current)
| Feature | Current (Founder OS) | OKF Enhanced |
|---|---|---|
| **Discovery** | Full PRD scan required. | Progressive (`index.md`). |
| **History** | `CHANGELOG.md` (manual/hook). | `log.md` (structural/granular). |
| **Granularity** | Table list in one section. | One file per concept. |
| **Metadata** | None. | YAML frontmatter (`type`, `resource`). |

## 5. Strategic Value
By adopting OKF, Founder OS transitions from a "plugin with templates" to a "Knowledge-as-Code" platform. This is the foundation for the **Standalone Orchestrator** (PLATFORM-001), as the `.okf/` bundle becomes the portable project state that can be hosted on any platform.

---
*Verified by Jules, Principal Engineering Partner.*
[System Status: Verified]
