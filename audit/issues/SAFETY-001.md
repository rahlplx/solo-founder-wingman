# SAFETY-001: Hybrid Safety Engine (Breaking the Regex Ceiling)

## [Real-World Scenario]
"The agent tried to be clever. Instead of running 'rm -rf', it wrote a Python script that uses `os.remove()` on every file in the directory and then ran that script. My current regex rules for 'rm' didn't see it coming because they only look at the Bash command, not the contents of the files the agent is writing."

## [Human-Readable Summary]
Our safety net has holes. It's great at catching common mistakes (like `git push --force`), but it's blind to "obfuscated" danger—where the threat is hidden inside code files or complex scripts. We need a "Hybrid" engine that doesn't just look for bad words, but understands *bad intent*.

## [AI-Tailored Technical Requirements]

### 1. Multi-Tier Gate Logic
Implement a three-tier verification system in `bin/policy-check.js` and `adapters/opencode/plugin.ts`:
- **Tier 1 (Stateless Regex)**: Current implementation. Keep for performance on known "stop words."
- **Tier 2 (Structural Analysis)**:
  - **Tool**: Integrate a lightweight AST parser (for JS/Python) or a shell parser (e.g., `mvdan.cc/sh` equivalent in JS).
  - **Goal**: Catch alias-expansion, variable-hidden commands, and malicious library imports (e.g., `import os; os.system('...')`).
- **Tier 3 (Semantic LLM Verification)**:
  - **Logic**: For any command tagged as `action: confirm`, spawn a small, fast "Guardrail LLM" (e.g., Haiku or Llama-Small).
  - **Prompt**: "The user wants to achieve [PROJECT_GOAL]. The agent is running [COMMAND]. Is this command necessary, and is it dangerous?"

### 2. Expanded Policy Categories
Update `policy.json` to include:
- **PII Leakage**: Patterns for Email, Phone, and SSN in `Write/Edit` tool calls.
- **Brand Violation**: Check `content` against a `style-guide.md` (if present).
- **Domain Safety**: Domain-specific blocks (e.g., "Deleting a production bucket" for cloud freelancers).

## [Verification Engine]
- [ ] Add a test case to `tests/policy-cases.json` that uses an obfuscated `rm` (e.g., `python -c "import os; os.remove('...')"`).
- [ ] Implement a `Tier2Analyzer` that flags `os.remove` in file content.
- [ ] Measure the latency overhead of the Tier 3 LLM check.
