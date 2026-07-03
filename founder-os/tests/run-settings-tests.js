#!/usr/bin/env node
'use strict';

/**
 * Regression coverage for settings.json's policyStrictness and
 * explainBeforeAct being actually wired into evaluate() on both adapters
 * (previously dead config -- see founder-os/settings.json's fields, which
 * were never read by any script before this).
 */

const { evaluate: claudeEvaluate } = require('../bin/policy-check.js');

let pass = 0;
let fail = 0;
const failures = [];

function check(description, condition, detail) {
  if (condition) {
    pass++;
  } else {
    fail++;
    failures.push(`FAIL: ${description}${detail ? `\n      ${detail}` : ''}`);
  }
}

const CONFIRM_RULE_SET = [
  { id: 'confirm-example', category: 'test', scope: 'bash', pattern: '\\bdanger\\b', action: 'confirm', message: 'be careful' },
];
const PAYLOAD = { tool_name: 'Bash', tool_input: { command: 'do something danger here' } };

function testClaudeCodePolicyStrictness() {
  const normal = claudeEvaluate(CONFIRM_RULE_SET, PAYLOAD, { policyStrictness: 'normal', explainBeforeAct: true });
  check('policy-check: policyStrictness=normal keeps a confirm-action rule as "ask"', normal.decision === 'ask', JSON.stringify(normal));

  const strict = claudeEvaluate(CONFIRM_RULE_SET, PAYLOAD, { policyStrictness: 'strict', explainBeforeAct: true });
  check('policy-check: policyStrictness=strict upgrades a confirm-action rule to "deny"', strict.decision === 'deny', JSON.stringify(strict));

  const defaulted = claudeEvaluate(CONFIRM_RULE_SET, PAYLOAD);
  check(
    'policy-check: omitting settings entirely defaults to normal (ask), matching pre-existing behavior',
    defaulted.decision === 'ask',
    JSON.stringify(defaulted)
  );

  // block-action rules are unaffected by strictness -- there's nothing to escalate.
  const blockRuleSet = [{ id: 'block-example', category: 'test', scope: 'bash', pattern: '\\bdanger\\b', action: 'block', message: 'x' }];
  const strictBlock = claudeEvaluate(blockRuleSet, PAYLOAD, { policyStrictness: 'strict', explainBeforeAct: true });
  check('policy-check: policyStrictness=strict leaves a block-action rule as "deny" (already the strictest)', strictBlock.decision === 'deny', JSON.stringify(strictBlock));
}

function testClaudeCodeExplainBeforeAct() {
  const explained = claudeEvaluate(CONFIRM_RULE_SET, PAYLOAD, { policyStrictness: 'normal', explainBeforeAct: true });
  check(
    'policy-check: explainBeforeAct=true includes the full rule message',
    explained.reason === '[confirm-example] be careful',
    JSON.stringify(explained)
  );

  const terse = claudeEvaluate(CONFIRM_RULE_SET, PAYLOAD, { policyStrictness: 'normal', explainBeforeAct: false });
  check(
    'policy-check: explainBeforeAct=false trims the reason to just the rule id',
    terse.reason === '[confirm-example]',
    JSON.stringify(terse)
  );
}

async function testOpenCodeExplainBeforeAct() {
  const { evaluate: opencodeEvaluate } = await import('../adapters/opencode/plugin.ts');
  const args = { command: 'do something danger here' };

  const explained = opencodeEvaluate(CONFIRM_RULE_SET, 'bash', args, { policyStrictness: 'normal', explainBeforeAct: true });
  check(
    'plugin.ts: explainBeforeAct=true includes the full rule message',
    explained.reason === '[confirm-example] be careful',
    JSON.stringify(explained)
  );

  const terse = opencodeEvaluate(CONFIRM_RULE_SET, 'bash', args, { policyStrictness: 'normal', explainBeforeAct: false });
  check(
    'plugin.ts: explainBeforeAct=false trims the reason to just the rule id',
    terse.reason === '[confirm-example]',
    JSON.stringify(terse)
  );

  // policyStrictness has no observable effect on this adapter -- confirm
  // already collapses to "block" regardless (no "ask" mode exists here).
  const strict = opencodeEvaluate(CONFIRM_RULE_SET, 'bash', args, { policyStrictness: 'strict', explainBeforeAct: true });
  const normal = opencodeEvaluate(CONFIRM_RULE_SET, 'bash', args, { policyStrictness: 'normal', explainBeforeAct: true });
  check(
    'plugin.ts: policyStrictness does not change the decision (already block either way)',
    strict.decision === 'block' && normal.decision === 'block' && strict.decision === normal.decision
  );
}

async function main() {
  testClaudeCodePolicyStrictness();
  testClaudeCodeExplainBeforeAct();
  await testOpenCodeExplainBeforeAct();

  console.log(`Settings-driven behavior tests (policy-check.js, plugin.ts): ${pass} passed, ${fail} failed, ${pass + fail} total`);
  if (failures.length > 0) {
    console.log('\n' + failures.join('\n\n'));
    process.exit(1);
  }
  process.exit(0);
}

main();
