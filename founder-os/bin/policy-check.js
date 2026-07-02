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

const POLICY_PATH = path.join(__dirname, '..', 'policy.json');

function loadPolicy() {
  const raw = fs.readFileSync(POLICY_PATH, 'utf8');
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed.rules)) {
    throw new Error("policy.json is missing a valid 'rules' array");
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
 */
function evaluate(rules, payload) {
  const strings = extractCheckableStrings(payload);
  if (strings.length === 0) return { decision: 'allow', reason: '' };

  for (const rule of rules) {
    const scope = rule.scope || 'any';
    let re;
    try {
      re = new RegExp(rule.pattern, rule.flags || '');
    } catch (err) {
      process.stderr.write(`policy-check: bad pattern in rule ${rule.id}: ${err.message}\n`);
      continue;
    }
    for (const { value, origin } of strings) {
      if (scope !== 'any' && scope !== origin) continue;
      if (re.test(value)) {
        const decision = rule.action === 'block' ? 'deny' : 'ask';
        return { decision, reason: `[${rule.id}] ${rule.message}` };
      }
    }
  }

  return { decision: 'allow', reason: '' };
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
  const { decision, reason } = evaluate(rules, payload);
  return respond(decision, reason);
}

if (require.main === module) {
  main().catch((err) => {
    process.stderr.write(`policy-check: unexpected error: ${err.stack}\n`);
    respond('allow');
  });
}

module.exports = { evaluate, extractCheckableStrings, loadPolicy };
