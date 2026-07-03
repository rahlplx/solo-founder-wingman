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
// Both of these are CommonJS modules (module.exports = {...}); Node's
// native ESM loader supports named imports from that shape directly.
import { validatePolicyDocument } from "../../bin/validate-policy-schema.js";
import { compileRules, lowercaseStrings, matchRule, buildReason } from "../../core/policy-engine.js";
import { appendEntry } from "../../bin/audit-log.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const POLICY_PATH = join(__dirname, "..", "..", "policy.json");
const SETTINGS_PATH = join(__dirname, "..", "..", "settings.json");

interface Settings {
  policyStrictness?: "normal" | "strict";
  explainBeforeAct?: boolean;
}

const SETTINGS_DEFAULTS: Settings = { policyStrictness: "normal", explainBeforeAct: true };

/**
 * Loads settings.json tolerantly: a missing or malformed file falls back
 * to defaults rather than crashing plugin init -- these are tuning knobs,
 * not safety-critical config the way policy.json is. Note: policyStrictness
 * has no observable effect on this adapter and isn't applied below -- see
 * evaluate()'s comment for why.
 */
function loadSettings(): Settings {
  try {
    const raw = readFileSync(SETTINGS_PATH, "utf8");
    return { ...SETTINGS_DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return SETTINGS_DEFAULTS;
  }
}

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

/**
 * Full schema validation (bin/validate-policy-schema.js -- see
 * founder-os/DECISIONS.md for why hand-rolled over ajv), not just "is
 * rules an array". Throws on a malformed policy.json instead of silently
 * returning undefined. Without this, a malformed policy.json used to
 * invert the intended fail-open behavior into fail-everything-closed:
 * loadRules() returned undefined without throwing, the try/catch in
 * FounderOsPolicy() below never fired, and the next evaluate() call threw
 * on a non-iterable from inside the uncaught tool.execute.before hook --
 * which this module's own design treats as a block, so every subsequent
 * tool call got denied instead of the documented "fail open, log loudly."
 * The schema check additionally catches a malformed *rule* (e.g. a typo'd
 * "pattern" field compiling to an accidentally-universal regex) that would
 * otherwise pass this shape check but silently misbehave at match time.
 */
function loadRules(): PolicyRule[] {
  const raw = readFileSync(POLICY_PATH, "utf8");
  const parsed = JSON.parse(raw);
  const errors = validatePolicyDocument(parsed);
  if (errors.length > 0) {
    throw new Error(`policy.json failed schema validation:\n  - ${errors.join("\n  - ")}`);
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
  ruleId: string | null;
}

/**
 * Pure evaluation: given a rule list, a tool name, and its args, return the
 * decision without throwing. This is what both the exported hook below and
 * the test runner call.
 *
 * Rule compiling/matching itself is shared with bin/policy-check.js via
 * core/policy-engine.js (including the WeakMap compiled-rule cache, keyed
 * by rules-array identity -- a real win here specifically, since
 * FounderOsPolicy() below loads rules once at plugin init and the
 * returned tool.execute.before handler calls evaluate() on every tool
 * call for the life of the session, unlike the Claude Code adapter, which
 * is a fresh process per hook invocation). What's left here is OpenCode-
 * specific: extracting checkable strings from this platform's tool-call
 * shape, and mapping a matched rule to this platform's own decision
 * vocabulary (allow/block -- no "ask" state exists here to begin with).
 */
export function evaluate(
  rules: PolicyRule[],
  toolName: string,
  args: Record<string, unknown>,
  settings: Settings = SETTINGS_DEFAULTS
): EvaluationResult {
  const strings = extractCheckableStrings(toolName, args);
  if (strings.length === 0) return { decision: "allow", reason: "", ruleId: null };

  const compiledRules = compileRules(rules);
  const checkableStrings = lowercaseStrings(strings);
  const matched = matchRule(compiledRules, checkableStrings);
  if (!matched) return { decision: "allow", reason: "", ruleId: null };

  // policyStrictness isn't applied here (unlike bin/policy-check.js): "ask"
  // doesn't exist on this platform to begin with (see module comment) --
  // confirm-action rules already resolve to a hard block regardless of
  // strictness, so the setting has nothing left to escalate.
  const reason = buildReason(matched, settings.explainBeforeAct);
  // OpenCode has no "ask" mode (see module comment) -- both "block" and
  // "confirm" rule actions resolve to a hard block here.
  return { decision: "block", reason, ruleId: matched.id };
}

export { loadRules, extractCheckableStrings, loadSettings };

export const FounderOsPolicy = async () => {
  let rules: PolicyRule[] = [];
  try {
    rules = loadRules();
  } catch (err) {
    // Fail open rather than crashing plugin init / disabling all plugins on
    // a missing or malformed policy.json -- but say so loudly.
    console.error("[founder-os] Failed to load policy rules:", err);
  }
  const settings = loadSettings();

  return {
    "tool.execute.before": async (
      input: { tool: string; sessionID: string; callID: string },
      output: { args: Record<string, unknown> }
    ) => {
      const { decision, reason, ruleId } = evaluate(rules, input.tool, output.args, settings);
      // Only log actual interventions (block), not the vast majority of
      // calls that are plain allows -- see bin/audit-log.js for why. Purely
      // observational; appendEntry() is internally best-effort and never
      // throws, so this can't affect the decision either way.
      if (decision === "block") {
        appendEntry({ platform: "opencode", tool: input.tool, decision, ruleId, reason });
        throw new Error(reason);
      }
    },
  };
};

export default FounderOsPolicy;
