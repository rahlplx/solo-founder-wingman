'use strict';

/**
 * Platform-agnostic policy-matching core, shared by bin/policy-check.js
 * (Claude Code) and adapters/opencode/plugin.ts (OpenCode). Pure, I/O-free
 * (no fs/process): given already-loaded rules and already-extracted
 * checkable strings, finds the first matching rule.
 *
 * Before this module existed, both adapters hand-maintained their own
 * copy of this exact matching logic (compile rules, lowercase strings
 * once, keyword pre-filter, scope filter, regex test) -- kept honest only
 * by a shared test fixture (tests/policy-cases.json) rather than by
 * actually sharing code. That meant a 3rd/4th agent-platform adapter would
 * have needed a full third reimplementation. This module is that shared
 * implementation; each adapter now only owns its own platform glue:
 * extracting checkable strings from that platform's tool-call shape
 * (extractCheckableStrings, still adapter-specific -- payload shapes
 * genuinely differ), loading rules from disk, and mapping a matched
 * rule's `action` to that platform's own decision vocabulary (Claude
 * Code's allow/ask/deny vs OpenCode's allow/block, which don't have an
 * "ask" state to begin with).
 *
 * CommonJS so it can be `require()`'d directly from bin/policy-check.js
 * and imported via Node's native CJS-in-ESM interop from
 * adapters/opencode/plugin.ts (the same pattern already used for
 * bin/validate-policy-schema.js).
 */

/**
 * Compiling a rule's RegExp and lowercasing its keywords is pure work with
 * no side effects beyond the rule itself, so it's cached per rules array
 * (keyed by object identity via WeakMap) instead of redone on every call.
 * This matters most for a long-lived caller (adapters/opencode/plugin.ts's
 * `tool.execute.before` handler, alive for a whole session) and for test
 * runners that call this many times against the same loaded rule set in
 * one process.
 */
const _compiledRulesCache = new WeakMap();

function compileRules(rules) {
  const cached = _compiledRulesCache.get(rules);
  if (cached) return cached;

  const compiled = [];
  for (const rule of rules) {
    let re;
    try {
      re = new RegExp(rule.pattern, rule.flags || '');
    } catch (err) {
      // Should be unreachable in normal operation -- both adapters'
      // loadPolicy()/loadRules() already reject non-compiling patterns via
      // validatePolicyDocument() before compileRules() ever runs. Kept as
      // defense-in-depth for any caller that builds a rule list without
      // going through schema validation first.
      console.error(`[founder-os] bad pattern in rule ${rule.id}:`, err);
      continue;
    }
    const keywords = Array.isArray(rule.keywords) ? rule.keywords.map((k) => k.toLowerCase()) : null;
    compiled.push({ ...rule, re, keywords });
  }
  _compiledRulesCache.set(rules, compiled);
  return compiled;
}

/**
 * Lowercases each checkable string once, up front, rather than inside the
 * rule-matching loop -- content can be a multi-megabyte file and there are
 * ~20 rules, so re-lowercasing per rule was redundant, allocation-heavy
 * work (a real finding from a gemini-code-assist review of the fast-path
 * optimization this preserves).
 */
function lowercaseStrings(strings) {
  return strings.map((s) => ({ ...s, lowerValue: s.value.toLowerCase() }));
}

/**
 * Finds the first compiled rule that matches any of the given checkable
 * strings, respecting each rule's scope and keyword pre-filter. Returns
 * the matched rule (uncompiled fields only, `re`/`keywords` stripped) or
 * null. Does not compute a platform decision string or apply
 * settings.json's policyStrictness/explainBeforeAct -- those are
 * adapter-specific interpretations of a match, not part of matching
 * itself.
 */
function matchRule(compiledRules, checkableStrings) {
  for (const rule of compiledRules) {
    const scope = rule.scope || 'any';
    for (const { value, origin, lowerValue } of checkableStrings) {
      if (scope !== 'any' && scope !== origin) continue;
      if (rule.keywords) {
        if (!rule.keywords.some((k) => lowerValue.includes(k))) continue;
      }
      // Defense-in-depth: schema/policy.schema.json disallows g/y flags so
      // this should never matter in practice, but re is cached and reused
      // across calls (see compileRules above) -- resetting lastIndex here
      // keeps .test() a pure per-string check even if a rule ever slipped
      // past validation with a stateful flag.
      rule.re.lastIndex = 0;
      if (rule.re.test(value)) {
        return rule;
      }
    }
  }
  return null;
}

/**
 * Builds the hook-facing reason string for a matched rule, respecting
 * settings.json's explainBeforeAct (default true = full message; false =
 * just the rule id, for a founder who wants less repeated text).
 */
function buildReason(rule, explainBeforeAct) {
  return explainBeforeAct !== false ? `[${rule.id}] ${rule.message}` : `[${rule.id}]`;
}

module.exports = { compileRules, lowercaseStrings, matchRule, buildReason };
