#!/usr/bin/env node
'use strict';

/**
 * PreToolUse policy engine for founder-os.
 *
 * Reads the Claude Code hook payload from stdin, checks the relevant string
 * (bash command, or file path/content for Edit|Write|MultiEdit) against
 * policy.json, and responds using Claude Code's PreToolUse hook JSON output
 * contract (permissionDecision: allow|ask|deny) -- confirmed current against
 * code.claude.com/docs/en/hooks: JSON output with exit code 0 is the
 * documented mechanism, not a fallback.
 *
 * Rule patterns adapted from roboticforce/agent-guardrails,
 * CodyLunders/claude-code-hooks-library, kornysietsma/claude-code-permissions-hook,
 * and AperionAI/shield — see policy.json for attribution.
 *
 * evaluate() and extractCheckableStrings() are exported so
 * tests/run-policy-tests.js can test the actual matching logic without
 * spawning a process per case, and so this logic has exactly one
 * implementation rather than a copy inside a test file.
 */

const fs = require('fs');
const path = require('path');
const { validatePolicyDocument } = require('./validate-policy-schema.js');
const { compileRules, lowercaseStrings, matchRule, buildReason } = require('../core/policy-engine.js');
const { appendEntry } = require('./audit-log.js');

const POLICY_PATH = path.join(__dirname, '..', 'policy.json');
const SETTINGS_PATH = path.join(__dirname, '..', 'settings.json');
const SETTINGS_DEFAULTS = { policyStrictness: 'normal', explainBeforeAct: true };

/**
 * Loads settings.json tolerantly: a missing or malformed file falls back
 * to defaults rather than failing the whole hook -- these are tuning
 * knobs, not safety-critical config the way policy.json is. Previously
 * this file existed but nothing read it; wiring it up here.
 */
function loadSettings() {
  try {
    const raw = fs.readFileSync(SETTINGS_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return { ...SETTINGS_DEFAULTS, ...parsed };
  } catch {
    return SETTINGS_DEFAULTS;
  }
}

/**
 * Full schema validation (bin/validate-policy-schema.js -- see
 * founder-os/DECISIONS.md for why hand-rolled over ajv), not just "is
 * rules an array". A malformed rule (e.g. a typo'd "pattern" field) used
 * to compile to new RegExp(undefined) -> /(?:)/, silently matching every
 * string -- with action:"block" that means denying every single tool
 * call, and nothing before this caught it. Throwing here, loudly, at load
 * time is deliberate: better to fail fast and visibly than to load a rule
 * set that's quietly wrong.
 */
function loadPolicy() {
  const raw = fs.readFileSync(POLICY_PATH, 'utf8');
  const parsed = JSON.parse(raw);
  const errors = validatePolicyDocument(parsed);
  if (errors.length > 0) {
    throw new Error(`policy.json failed schema validation:\n  - ${errors.join('\n  - ')}`);
  }
  return parsed.rules;
}

function readStdin() {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => (data += chunk));
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', reject);
  });
}

/**
 * Each extracted string is tagged with its origin so evaluate() can filter
 * rules by scope. Without this, editing this project's own
 * tests/policy-cases.json (which contains literal strings like
 * "rm -rf node_modules" as JSON fixture data) would trip the bash-only
 * destructive_ops rules and block the edit -- a real bug found in review.
 */
function extractCheckableStrings(payload) {
  const toolName = payload.tool_name || '';
  const input = payload.tool_input || {};
  const strings = [];

  if (toolName === 'Bash' && typeof input.command === 'string') {
    strings.push({ value: input.command, origin: 'bash' });
  }
  if ((toolName === 'Edit' || toolName === 'Write') && typeof input.file_path === 'string') {
    strings.push({ value: input.file_path, origin: 'file' });
    if (typeof input.content === 'string') strings.push({ value: input.content, origin: 'file' });
    if (typeof input.new_string === 'string') strings.push({ value: input.new_string, origin: 'file' });
  }
  if (toolName === 'MultiEdit' && typeof input.file_path === 'string') {
    strings.push({ value: input.file_path, origin: 'file' });
    if (Array.isArray(input.edits)) {
      for (const edit of input.edits) {
        if (edit && typeof edit.new_string === 'string') {
          strings.push({ value: edit.new_string, origin: 'file' });
        }
      }
    }
  }
  return strings;
}

/**
 * Pure evaluation: given a rule list and a hook payload, return the
 * decision without touching stdin/stdout/process.exit. This is what both
 * the CLI entrypoint below and the test runner call.
 *
 * Rule compiling/matching itself is shared with adapters/opencode/plugin.ts
 * via core/policy-engine.js -- what's left here is Claude Code-specific:
 * extracting checkable strings from this platform's hook payload shape,
 * and mapping a matched rule's `action` to this platform's own decision
 * vocabulary (allow/ask/deny), including settings.json's two tuning knobs:
 * - policyStrictness: "strict" upgrades a would-be "ask" (confirm-action
 *   rule) to "deny" -- for a founder who wants zero interactive
 *   confirmations, only hard stops. "normal" (default) leaves ask/deny
 *   exactly as each rule's own `action` field says, matching this
 *   project's behavior before this setting was wired up.
 * - explainBeforeAct: false trims the reason to just the rule id, omitting
 *   the full message -- for a founder who's seen the same rule's
 *   explanation enough times and wants less text. true (default) keeps
 *   the full message, matching prior behavior.
 */
function evaluate(rules, payload, settings = SETTINGS_DEFAULTS) {
  const strings = extractCheckableStrings(payload);
  if (strings.length === 0) return { decision: 'allow', reason: '', ruleId: null };

  const compiledRules = compileRules(rules);
  const checkableStrings = lowercaseStrings(strings);
  const matched = matchRule(compiledRules, checkableStrings);
  if (!matched) return { decision: 'allow', reason: '', ruleId: null };

  const strict = settings.policyStrictness === 'strict';
  let decision = matched.action === 'block' ? 'deny' : 'ask';
  if (strict && decision === 'ask') decision = 'deny';
  const reason = buildReason(matched, settings.explainBeforeAct);
  return { decision, reason, ruleId: matched.id };
}

function respond(decision, reason) {
  // decision: "allow" | "ask" | "deny"
  const output = {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: decision,
      permissionDecisionReason: reason || '',
    },
  };
  process.stdout.write(JSON.stringify(output));
  process.exit(0);
}

async function main() {
  const raw = await readStdin();

  let payload;
  try {
    payload = JSON.parse(raw);
    if (!payload || typeof payload !== 'object') {
      throw new Error('payload is not a non-null object');
    }
  } catch (err) {
    // Fail open on a malformed payload rather than blocking legitimate work
    // because of a hook bug -- but say so loudly, in stderr, for debugging.
    process.stderr.write(`policy-check: could not parse hook payload: ${err.message}\n`);
    return respond('allow');
  }

  const rules = loadPolicy();
  const settings = loadSettings();
  const { decision, reason, ruleId } = evaluate(rules, payload, settings);
  // Only log actual interventions (ask/deny), not the vast majority of
  // calls that are plain allows -- see bin/audit-log.js for why. This is
  // purely observational and must never affect the response either way;
  // appendEntry() is internally best-effort and never throws.
  if (decision !== 'allow') {
    appendEntry({ platform: 'claude-code', tool: payload.tool_name || '', decision, ruleId, reason });
  }
  return respond(decision, reason);
}

if (require.main === module) {
  main().catch((err) => {
    process.stderr.write(`policy-check: unexpected error: ${err.stack}\n`);
    respond('allow');
  });
}

module.exports = { evaluate, extractCheckableStrings, loadPolicy, loadSettings };
