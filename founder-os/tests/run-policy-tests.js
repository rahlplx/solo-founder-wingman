#!/usr/bin/env node
'use strict';

/**
 * Runs tests/policy-cases.json through the actual Claude Code adapter logic
 * (bin/policy-check.js's evaluate()), not a reimplementation of it. This is
 * the "does the policy engine still do what it claims" regression check
 * that was previously only verified ad hoc, by hand, per commit.
 *
 * See tests/run-opencode-policy-tests.ts for the parallel check against the
 * OpenCode adapter using the same fixture -- that's what catches drift
 * between the two independent implementations.
 */

const path = require('path');
const fs = require('fs');
const { evaluate, loadPolicy } = require('../bin/policy-check.js');

const FIXTURE_PATH = path.join(__dirname, 'policy-cases.json');

function buildPayload(testCase) {
  if (testCase.toolName === 'Bash') {
    return { tool_name: 'Bash', tool_input: { command: testCase.command } };
  }
  if (testCase.toolName === 'Edit' || testCase.toolName === 'Write') {
    const tool_input = { file_path: testCase.filePath };
    if (testCase.content !== undefined) tool_input.content = testCase.content;
    if (testCase.newString !== undefined) tool_input.new_string = testCase.newString;
    return { tool_name: testCase.toolName, tool_input };
  }
  if (testCase.toolName === 'MultiEdit') {
    return {
      tool_name: 'MultiEdit',
      tool_input: { file_path: testCase.filePath, edits: testCase.edits || [] },
    };
  }
  throw new Error(`Unknown toolName in fixture: ${testCase.toolName}`);
}

function main() {
  const { cases: allCases } = JSON.parse(fs.readFileSync(FIXTURE_PATH, 'utf8'));
  const cases = allCases.filter((c) => !c.platforms || c.platforms.includes('claude-code'));
  const rules = loadPolicy();

  let pass = 0;
  let fail = 0;
  const failures = [];

  for (const testCase of cases) {
    const payload = buildPayload(testCase);
    const { decision } = evaluate(rules, payload);
    if (decision === testCase.expectDecision) {
      pass++;
    } else {
      fail++;
      failures.push(
        `FAIL: ${testCase.description}\n` +
          `      expected=${testCase.expectDecision} actual=${decision}\n` +
          `      case=${JSON.stringify(testCase)}`
      );
    }
  }

  console.log(`Claude Code adapter (policy-check.js): ${pass} passed, ${fail} failed, ${cases.length} total`);
  if (failures.length > 0) {
    console.log('\n' + failures.join('\n\n'));
    process.exit(1);
  }
  process.exit(0);
}

main();
