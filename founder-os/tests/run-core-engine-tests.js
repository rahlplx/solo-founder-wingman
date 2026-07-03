#!/usr/bin/env node
'use strict';

/**
 * Direct unit coverage for core/policy-engine.js itself -- the shared
 * matching logic both bin/policy-check.js and adapters/opencode/plugin.ts
 * now import, extracted from what used to be two independently-maintained
 * copies. The two adapters' 61-case fixtures already exercise this
 * indirectly through real policy.json data; this file tests the module's
 * own contract directly (caching, scope/keyword filtering, bad-pattern
 * handling, reason building) since a regression here would affect both
 * adapters at once.
 */

const { compileRules, lowercaseStrings, matchRule, buildReason } = require('../core/policy-engine.js');

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

function rule(overrides) {
  return { id: 'r1', category: 'test', action: 'block', message: 'msg', pattern: '\\bdanger\\b', ...overrides };
}

// compileRules: caches per rules-array identity.
{
  const rules = [rule()];
  const first = compileRules(rules);
  const second = compileRules(rules);
  check('compileRules: returns the same compiled array for the same rules array (identity-cached)', first === second);
}

// compileRules: a different array (even with identical content) is not cached together.
{
  const a = compileRules([rule()]);
  const b = compileRules([rule()]);
  check('compileRules: different rules-array instances compile independently', a !== b && a[0] !== b[0]);
}

// compileRules: a bad pattern is skipped, not thrown, and does not affect other rules.
{
  const rules = [rule({ id: 'bad', pattern: '(unbalanced' }), rule({ id: 'good' })];
  let compiled;
  let threw = false;
  try {
    compiled = compileRules(rules);
  } catch {
    threw = true;
  }
  check('compileRules: a bad pattern is skipped, not thrown', !threw && compiled && compiled.length === 1 && compiled[0].id === 'good');
}

// lowercaseStrings: adds lowerValue without mutating the original entries' value/origin.
{
  const strings = [{ value: 'DANGER', origin: 'bash' }];
  const result = lowercaseStrings(strings);
  check(
    'lowercaseStrings: adds a lowerValue field, preserves value/origin',
    result[0].value === 'DANGER' && result[0].origin === 'bash' && result[0].lowerValue === 'danger'
  );
}

// matchRule: respects scope filtering (bash rule should not match file-origin strings).
{
  const compiled = compileRules([rule({ scope: 'bash' })]);
  const strings = lowercaseStrings([{ value: 'danger', origin: 'file' }]);
  const matched = matchRule(compiled, strings);
  check('matchRule: a scope:"bash" rule does not match a file-origin string', matched === null);
}

{
  const compiled = compileRules([rule({ scope: 'bash' })]);
  const strings = lowercaseStrings([{ value: 'danger', origin: 'bash' }]);
  const matched = matchRule(compiled, strings);
  check('matchRule: a scope:"bash" rule matches a bash-origin string', matched !== null && matched.id === 'r1');
}

// matchRule: keyword pre-filter -- a keyword that's absent skips the rule even if the regex would otherwise match.
{
  const compiled = compileRules([rule({ pattern: '.*', keywords: ['unrelated-keyword-not-present'] })]);
  const strings = lowercaseStrings([{ value: 'danger', origin: 'bash' }]);
  const matched = matchRule(compiled, strings);
  check('matchRule: an absent keyword skips the rule even though the regex would match', matched === null);
}

// matchRule: first-match-wins ordering.
{
  const compiled = compileRules([rule({ id: 'first', pattern: '\\bdanger\\b' }), rule({ id: 'second', pattern: '\\bdanger\\b' })]);
  const strings = lowercaseStrings([{ value: 'danger', origin: 'bash' }]);
  const matched = matchRule(compiled, strings);
  check('matchRule: returns the first matching rule when multiple would match', matched.id === 'first');
}

// buildReason: explainBeforeAct toggle.
{
  const r = rule({ id: 'x', message: 'full message here' });
  check('buildReason: explainBeforeAct=true (default) includes the full message', buildReason(r, true) === '[x] full message here');
  check('buildReason: explainBeforeAct=false trims to just the id', buildReason(r, false) === '[x]');
  check('buildReason: explainBeforeAct=undefined defaults to the full message', buildReason(r, undefined) === '[x] full message here');
}

console.log(`Core policy-engine unit tests: ${pass} passed, ${fail} failed, ${pass + fail} total`);
if (failures.length > 0) {
  console.log('\n' + failures.join('\n\n'));
  process.exit(1);
}
process.exit(0);
