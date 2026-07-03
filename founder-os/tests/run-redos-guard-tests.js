#!/usr/bin/env node
'use strict';

/**
 * ReDoS guard-rail: every rule with scope:"any" runs against arbitrary
 * file content (Edit/Write's content/new_string), which can be large --
 * unlike scope:"bash" rules, which only ever see a single command line.
 * Nothing before this stopped a future scope:"any" rule with a
 * catastrophic-backtracking-shaped pattern (nested quantifiers etc.) from
 * being added; this test compiles every current scope:"any" rule and runs
 * it against several large synthetic non-matching strings with a time
 * budget, so a pathological pattern fails CI instead of hanging a real
 * hook call on a large pasted file.
 */

const fs = require('fs');
const path = require('path');

const POLICY_PATH = path.join(__dirname, '..', 'policy.json');
const TIME_BUDGET_MS = 250;
const SIZE = 200_000;

function syntheticStrings() {
  return [
    { label: 'repeated single char', value: 'a'.repeat(SIZE) },
    { label: 'repeated near-trigger phrase', value: 'stripe live mode almost but not quite '.repeat(Math.ceil(SIZE / 39)) },
    {
      label: 'pseudo-random alphanumeric',
      value: Array.from({ length: SIZE }, () => 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[Math.floor(Math.random() * 62)]).join(
        ''
      ),
    },
  ];
}

function main() {
  const { rules } = JSON.parse(fs.readFileSync(POLICY_PATH, 'utf8'));
  const anyScopeRules = rules.filter((r) => r.scope === 'any');

  if (anyScopeRules.length === 0) {
    console.log('ReDoS guard: no scope:"any" rules in policy.json -- nothing to check.');
    process.exit(0);
  }

  const strings = syntheticStrings();
  let pass = 0;
  let fail = 0;
  const failures = [];

  for (const rule of anyScopeRules) {
    let re;
    try {
      re = new RegExp(rule.pattern, rule.flags || '');
    } catch (err) {
      fail++;
      failures.push(`FAIL: ${rule.id}: pattern does not compile: ${err.message}`);
      continue;
    }
    for (const { label, value } of strings) {
      const t0 = process.hrtime.bigint();
      re.test(value);
      const elapsedMs = Number(process.hrtime.bigint() - t0) / 1e6;
      if (elapsedMs > TIME_BUDGET_MS) {
        fail++;
        failures.push(
          `FAIL: ${rule.id} against "${label}" (${SIZE} chars) took ${elapsedMs.toFixed(1)}ms, ` +
            `over the ${TIME_BUDGET_MS}ms budget -- likely catastrophic backtracking. ` +
            'This rule is scope:"any" and runs against arbitrary file content; a slow pattern here ' +
            'can hang a real hook call on a large pasted file.'
        );
      } else {
        pass++;
      }
    }
  }

  console.log(
    `ReDoS guard (${anyScopeRules.length} scope:"any" rule(s) x ${strings.length} synthetic strings, ` +
      `${TIME_BUDGET_MS}ms budget each): ${pass} passed, ${fail} failed, ${pass + fail} total`
  );
  if (failures.length > 0) {
    console.log('\n' + failures.join('\n'));
    process.exit(1);
  }
  process.exit(0);
}

main();
