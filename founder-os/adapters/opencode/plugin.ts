/**
 * founder-os OpenCode adapter.
 *
 * Implements the same policy.json rule set as the Claude Code hook
 * (bin/policy-check.js), via OpenCode's `tool.execute.before` plugin hook.
 * This is real code-level interception, same as Claude Code -- unlike the
 * Codex adapter, which has no hook mechanism and can only rely on sandbox
 * policy (see adapters/codex/).
 *
 * Confirmed (July 2026, via OpenCode plugin docs and issue tracker):
 * tool.execute.before has no native "ask for confirmation" mode, only
 * allow-or-throw. "confirm"-level rules are therefore treated the same as
 * "block" here -- that is the platform's actual ceiling, not a shortcut we
 * chose to take.
 *
 * evaluate() is exported so tests/run-opencode-policy-tests.ts can run the
 * same fixture (tests/policy-cases.json) used against the Claude Code
 * adapter through this actual matching logic, to catch drift between the
 * two independent implementations rather than assuming they stay in sync.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const POLICY_PATH = join(__dirname, "..", "..", "policy.json");

interface PolicyRule {
  id: string;
  category: string;
  pattern: string;
  flags?: string;
  action: "block" | "confirm";
  message: string;
}

function loadRules(): PolicyRule[] {
  const raw = readFileSync(POLICY_PATH, "utf8");
  return JSON.parse(raw).rules as PolicyRule[];
}

function extractCheckableStrings(toolName: string, args: Record<string, unknown>): string[] {
  const strings: string[] = [];
  if (toolName === "bash" && typeof args.command === "string") {
    strings.push(args.command);
  }
  if (toolName === "edit" || toolName === "write") {
    const filePath = args.filePath ?? args.file_path;
    if (typeof filePath === "string") {
      strings.push(filePath);
      if (typeof args.content === "string") strings.push(args.content);
      const newString = args.newString ?? args.new_string;
      if (typeof newString === "string") strings.push(newString);
    }
  }
  return strings;
}

interface EvaluationResult {
  decision: "allow" | "block";
  reason: string;
}

/**
 * Pure evaluation: given a rule list, a tool name, and its args, return the
 * decision without throwing. This is what both the exported hook below and
 * the test runner call, so there is exactly one implementation of the
 * matching logic, not a copy inside a test file.
 */
export function evaluate(
  rules: PolicyRule[],
  toolName: string,
  args: Record<string, unknown>
): EvaluationResult {
  const strings = extractCheckableStrings(toolName, args);
  if (strings.length === 0) return { decision: "allow", reason: "" };

  for (const rule of rules) {
    let re: RegExp;
    try {
      re = new RegExp(rule.pattern, rule.flags ?? "");
    } catch {
      continue; // malformed pattern -- skip rather than crash the session
    }
    for (const str of strings) {
      if (re.test(str)) {
        // OpenCode has no "ask" mode (see module comment) -- both "block"
        // and "confirm" rule actions resolve to a hard block here.
        return { decision: "block", reason: `[${rule.id}] ${rule.message}` };
      }
    }
  }

  return { decision: "allow", reason: "" };
}

export { loadRules, extractCheckableStrings };

export const FounderOsPolicy = async () => {
  let rules: PolicyRule[] = [];
  try {
    rules = loadRules();
  } catch (err) {
    // Fail open rather than crashing plugin init / disabling all plugins on
    // a missing or malformed policy.json -- but say so loudly.
    console.error("[founder-os] Failed to load policy rules:", err);
  }

  return {
    "tool.execute.before": async (
      input: { tool: string; sessionID: string; callID: string },
      output: { args: Record<string, unknown> }
    ) => {
      const { decision, reason } = evaluate(rules, input.tool, output.args);
      if (decision === "block") {
        throw new Error(reason);
      }
    },
  };
};

export default FounderOsPolicy;
