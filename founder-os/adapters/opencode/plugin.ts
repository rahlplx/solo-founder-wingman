/**
 * founder-os OpenCode adapter.
 *
 * Implements the same policy.json rule set as the Claude Code hook
 * (bin/policy-check.js), via OpenCode's `tool.execute.before` plugin hook.
 * This is real code-level interception, same as Claude Code -- unlike the
 * Codex adapter, which has no hook mechanism and can only rely on sandbox
 * policy (see adapters/codex/).
 *
 * Scaffold note: verify the exact shape of `input`/`output` and how
 * "modify vs. throw" is expressed against the current OpenCode plugin docs
 * before relying on this in production -- plugin APIs evolve. OpenCode's
 * tool.execute.before does not have a documented distinct "ask for
 * confirmation" mode the way Claude Code's PreToolUse hook does, so
 * "confirm"-level rules are treated the same as "block" here -- a stricter
 * fallback, not a silent downgrade.
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
      const strings = extractCheckableStrings(input.tool, output.args);
      if (strings.length === 0) return;

      for (const rule of rules) {
        let re: RegExp;
        try {
          re = new RegExp(rule.pattern, rule.flags ?? "");
        } catch {
          continue; // malformed pattern -- skip rather than crash the session
        }
        for (const str of strings) {
          if (re.test(str)) {
            throw new Error(`[founder-os:${rule.id}] ${rule.message}`);
          }
        }
      }
    },
  };
};

export default FounderOsPolicy;
