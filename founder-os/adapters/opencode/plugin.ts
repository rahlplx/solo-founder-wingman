/**
 * founder-os OpenCode adapter.
 * Optimized with keyword fast-path and pre-compiled regexes.
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
  lowerKeywords: string[];
}

function loadRules(): PolicyRule[] {
  const raw = readFileSync(POLICY_PATH, "utf8");
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed.rules)) {
    throw new Error("policy.json is missing a valid 'rules' array");
  }
  return parsed.rules as PolicyRule[];
}

function compileRules(rules: PolicyRule[]): CompiledRule[] {
  return rules.map(rule => {
    try {
      return {
        ...rule,
        re: new RegExp(rule.pattern, rule.flags ?? ""),
        lowerKeywords: (rule.keywords ?? []).map(k => k.toLowerCase())
      };
    } catch {
      return null;
    }
  }).filter((r): r is CompiledRule => r !== null);
}

interface CheckableString {
  value: string;
  origin: "bash" | "file";
}

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
    const patchText = args.patchText;
    if (typeof patchText === "string") strings.push({ value: patchText, origin: "file" });
  }
  return strings;
}

interface EvaluationResult {
  decision: "allow" | "block";
  reason: string;
}

export function evaluate(
  rules: (PolicyRule | CompiledRule)[],
  toolName: string,
  args: Record<string, unknown>
): EvaluationResult {
  const strings = extractCheckableStrings(toolName, args);
  if (strings.length === 0) return { decision: "allow", reason: "" };

  // Ensure rules are compiled for evaluation
  const compiledRules: CompiledRule[] = (rules[0] && "re" in rules[0])
    ? rules as CompiledRule[]
    : compileRules(rules as PolicyRule[]);

  for (const rule of compiledRules) {
    const scope = rule.scope ?? "any";

    for (const { value, origin } of strings) {
      if (scope !== "any" && scope !== origin) continue;

      // HYBRID FAST-PATH: Keyword check
      if (rule.lowerKeywords.length > 0) {
        const lowerValue = value.toLowerCase();
        if (!rule.lowerKeywords.some(k => lowerValue.includes(k))) continue;
      }

      if (rule.re.test(value)) {
        return { decision: "block", reason: `[${rule.id}] ${rule.message}` };
      }
    }
  }

  return { decision: "allow", reason: "" };
}

export { loadRules, extractCheckableStrings };

export const FounderOsPolicy = async () => {
  let compiledRules: CompiledRule[] = [];
  try {
    compiledRules = compileRules(loadRules());
  } catch (err) {
    console.error("[founder-os] Failed to load/compile policy rules:", err);
  }

  return {
    "tool.execute.before": async (
      input: { tool: string; sessionID: string; callID: string },
      output: { args: Record<string, unknown> }
    ) => {
      const { decision, reason } = evaluate(compiledRules, input.tool, output.args);
      if (decision === "block") {
        throw new Error(reason);
      }
    },
  };
};

export default FounderOsPolicy;
