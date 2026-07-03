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
  scope?: "bash" | "any";
  pattern: string;
  flags?: string;
  action: "block" | "confirm";
  message: string;
  keywords?: string[];
}

interface CompiledRule extends PolicyRule {
  re: RegExp;
  lowerKeywords: string[] | null;
}

/**
 * Throws on a malformed policy.json (missing/non-array "rules") instead of
 * silently returning undefined. Without this, a malformed policy.json used
 * to invert the intended fail-open behavior into fail-everything-closed:
 * loadRules() returned undefined without throwing, the try/catch in
 * FounderOsPolicy() below never fired, and the next evaluate() call threw
 * on a non-iterable from inside the uncaught tool.execute.before hook --
 * which this module's own design treats as a block, so every subsequent
 * tool call got denied instead of the documented "fail open, log loudly."
 */
function loadRules(): PolicyRule[] {
  const raw = readFileSync(POLICY_PATH, "utf8");
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed.rules)) {
    throw new Error("policy.json is missing a valid 'rules' array");
  }
  return parsed.rules as PolicyRule[];
}

interface CheckableString {
  value: string;
  origin: "bash" | "file";
}

/**
 * Each extracted string is tagged with its origin so evaluate() can filter
 * rules by scope -- see the matching comment in bin/policy-check.js for why
 * (editing this project's own tests/policy-cases.json fixture would
 * otherwise trip the bash-only destructive_ops rules).
 */
function extractCheckableStrings(toolName: string, args: Record<string, unknown>): CheckableString[] {
  const strings: CheckableString[] = [];
  if (toolName === "bash" && typeof args.command === "string") {
    strings.push({ value: args.command, origin: "bash" });
  }
  if (toolName === "edit" || toolName === "write") {
    const filePath = args.filePath ?? args.file_path;
    if (typeof filePath === "string") {
      strings.push({ value: filePath, origin: "file" });
      if (typeof args.content === "string") strings.push({ value: args.content, origin: "file" });
      const newString = args.newString ?? args.new_string;
      if (typeof newString === "string") strings.push({ value: newString, origin: "file" });
    }
  }
  if (toolName === "apply_patch") {
    // apply_patch's payload carries the whole diff (Add/Update/Delete File
    // markers) in patchText -- without this, patch-based edits bypass every
    // policy check entirely, unlike edit/write.
    const patchText = args.patchText;
    if (typeof patchText === "string") strings.push({ value: patchText, origin: "file" });
  }
  return strings;
}

interface EvaluationResult {
  decision: "allow" | "block";
  reason: string;
}

/**
 * Compiling each rule's RegExp is cached per rules array (keyed by object
 * identity via WeakMap) rather than redone on every evaluate() call. This
 * is a real win here specifically: FounderOsPolicy() below loads rules
 * once at plugin init, and the returned tool.execute.before handler then
 * calls evaluate() on every single tool call for the life of the session --
 * unlike the Claude Code adapter, which is a fresh process per hook
 * invocation. tests/run-opencode-policy-tests.ts also benefits, since it
 * calls evaluate() once per fixture case (~60 times) in one process.
 *
 * keywords (from policy.json, optional per rule) is a cheap pre-filter: if
 * present, the full regex only runs when at least one keyword is a
 * case-insensitive substring of the string being checked. Every keyword in
 * policy.json is required to be a literal substring guaranteed present in
 * any real match of that rule's pattern (documented in policy.json's
 * _comment) -- so this can only skip unnecessary regex work, never a real
 * match. A rule with no keywords always runs its full regex, unfiltered.
 */
const compiledRulesCache = new WeakMap<PolicyRule[], CompiledRule[]>();

function compileRules(rules: PolicyRule[]): CompiledRule[] {
  const cached = compiledRulesCache.get(rules);
  if (cached) return cached;

  const compiled: CompiledRule[] = [];
  for (const rule of rules) {
    let re: RegExp;
    try {
      re = new RegExp(rule.pattern, rule.flags ?? "");
    } catch {
      continue; // malformed pattern -- skip rather than crash the session
    }
    const lowerKeywords = rule.keywords ? rule.keywords.map((k) => k.toLowerCase()) : null;
    compiled.push({ ...rule, re, lowerKeywords });
  }
  compiledRulesCache.set(rules, compiled);
  return compiled;
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

  const compiledRules = compileRules(rules);

  for (const rule of compiledRules) {
    const scope = rule.scope ?? "any";
    for (const { value, origin } of strings) {
      if (scope !== "any" && scope !== origin) continue;
      if (rule.lowerKeywords) {
        const lowerValue = value.toLowerCase();
        if (!rule.lowerKeywords.some((k) => lowerValue.includes(k))) continue;
      }
      if (rule.re.test(value)) {
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
