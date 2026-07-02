# PLATFORM-001: Transition to Standalone Orchestration (Moving beyond the Plugin)

## [Real-World Scenario]
"I'm a freelance marketing consultant. I love the idea of Founder OS, but I don't want to install Claude Code or OpenCode on my terminal just to use it. I want a website where I can log in, link my project (Google Drive, GitHub, or Notion), and have a safe agent build my campaign while protecting me from 'agent-hallucination' risks like accidentally leaking my client's budget sheet to a public API."

## [Human-Readable Summary]
Currently, Founder OS is a plugin that lives *inside* other tools. To become a standalone platform and serve freelancers, it needs to flip the script: it must become the *host*. This means moving the safety logic from "hooks" into a "proxy" that sits between the user, the agent, and the tools.

## [AI-Tailored Technical Requirements]

### 1. Proxy Architecture
- **Requirement**: Replace `PreToolUse` and `tool.execute.before` hooks with an API-level Proxy.
- **Logic**: All agent tool calls must be routed through a central `Orchestrator` service.
- **Verification**: The orchestrator must evaluate the `policy.json` rules *before* forwarding any command to the underlying execution environment (Sandbox).

### 2. Sandbox Execution Environment
- **Requirement**: Move from local Bash execution to a containerized sandbox (e.g., Docker or WASM-based).
- **Security**: The sandbox should have "Default Deny" network policies, with explicit allow-listing managed by the orchestrator.

### 3. State Management
- **Requirement**: Implement a persistent Project State store.
- **Feature**: Track the "Audit Trail" of every blocked command and human confirmation for multi-session persistence (unlike the current transient terminal session).

### 4. Domain Adapters
- **Requirement**: Refactor the `skills/` directory to support `DomainManifests`.
- **Implementation**: Introduce a `domain` field in `SKILL.md`. If `domain: creative`, replace `npm test` with a configurable `validation_command`.

## [Verification Engine]
- [ ] Create a prototype `PlatformProxy` that wraps a standard LLM API call.
- [ ] Verify that a simulated "rm -rf" tool call is intercepted by the Proxy even without a terminal hook.
- [ ] Demonstrate a "Freelancer" project template that doesn't include a `package.json`.
