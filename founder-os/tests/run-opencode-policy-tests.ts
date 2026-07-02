/**
 * Runs tests/policy-cases.json through the actual OpenCode adapter logic
 * (adapters/opencode/plugin.ts's evaluate()), not a reimplementation of it.
 * This is the parity check: the same fixture used against the Claude Code
 * adapter (tests/run-policy-tests.js) is run here too, so a rule that
 * silently diverges between the two independent implementations gets
 * caught instead of assumed away.
 *
 * OpenCode has no "ask" mode (see adapters/opencode/plugin.ts) -- "ask" and
 * "deny" in the shared fixture both collapse to "block" here, which is the
 * platform's actual ceiling, not a test bug.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { evaluate, loadRules } from "../adapters/opencode/plugin.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE_PATH = join(__dirname, "policy-cases.json");

interface TestCase {
  description: string;
  toolName: "Bash" | "Edit" | "Write" | "MultiEdit" | "ApplyPatch";
  command?: string;
  filePath?: string;
  content?: string;
  newString?: string;
  patchText?: string;
  platforms?: string[];
  expectDecision: "allow" | "ask" | "deny";
}

function toOpenCodeToolName(toolName: TestCase["toolName"]): string {
  if (toolName === "ApplyPatch") return "apply_patch";
  return toolName.toLowerCase();
}

function buildArgs(testCase: TestCase): Record<string, unknown> {
  if (testCase.toolName === "Bash") {
    return { command: testCase.command };
  }
  if (testCase.toolName === "ApplyPatch") {
    return { patchText: testCase.patchText };
  }
  const args: Record<string, unknown> = { filePath: testCase.filePath };
  if (testCase.content !== undefined) args.content = testCase.content;
  if (testCase.newString !== undefined) args.newString = testCase.newString;
  return args;
}

function expectedOpenCodeDecision(expectDecision: TestCase["expectDecision"]): "allow" | "block" {
  // OpenCode collapses "ask" (confirm-level rules) into "block" -- see
  // module-level comment in adapters/opencode/plugin.ts for why.
  return expectDecision === "allow" ? "allow" : "block";
}

function main(): void {
  const { cases: allCases } = JSON.parse(readFileSync(FIXTURE_PATH, "utf8")) as { cases: TestCase[] };
  const cases = allCases.filter((c) => !c.platforms || c.platforms.includes("opencode"));
  const rules = loadRules();

  let pass = 0;
  let fail = 0;
  const failures: string[] = [];

  for (const testCase of cases) {
    const toolName = toOpenCodeToolName(testCase.toolName);
    const args = buildArgs(testCase);
    const { decision } = evaluate(rules, toolName, args);
    const expected = expectedOpenCodeDecision(testCase.expectDecision);

    if (decision === expected) {
      pass++;
    } else {
      fail++;
      failures.push(
        `FAIL: ${testCase.description}\n` +
          `      expected=${expected} actual=${decision}\n` +
          `      case=${JSON.stringify(testCase)}`
      );
    }
  }

  console.log(`OpenCode adapter (plugin.ts): ${pass} passed, ${fail} failed, ${cases.length} total`);
  if (failures.length > 0) {
    console.log("\n" + failures.join("\n\n"));
    process.exit(1);
  }
  process.exit(0);
}

main();
