#!/usr/bin/env node
'use strict';

/**
 * Runs tests/schema-validation-cases.json through the actual shipped
 * validator (bin/validate-policy-schema.js -- see DECISIONS.md for why
 * this one and not the ajv competitor), plus a final sanity check that the
 * real policy.json itself still validates cleanly.
 */

const path = require('path');
const fs = require('fs');
const { validatePolicyDocument } = require('../bin/validate-policy-schema.js');

const FIXTURE_PATH = path.join(__dirname, 'schema-validation-cases.json');
const POLICY_PATH = path.join(__dirname, '..', 'policy.json');

function main() {
  const { cases } = JSON.parse(fs.readFileSync(FIXTURE_PATH, 'utf8'));

  let pass = 0;
  let fail = 0;
  const failures = [];

  for (const testCase of cases) {
    const errors = validatePolicyDocument(testCase.doc);
    const isValid = errors.length === 0;
    if (isValid === testCase.expectValid) {
      pass++;
    } else {
      fail++;
      failures.push(
        `FAIL: ${testCase.description}\n` +
          `      expectValid=${testCase.expectValid} actualValid=${isValid}\n` +
          `      errors=${JSON.stringify(errors)}`
      );
    }
  }

  const realPolicy = JSON.parse(fs.readFileSync(POLICY_PATH, 'utf8'));
  const realPolicyErrors = validatePolicyDocument(realPolicy);
  if (realPolicyErrors.length === 0) {
    pass++;
  } else {
    fail++;
    failures.push(`FAIL: the real policy.json does not validate:\n  - ${realPolicyErrors.join('\n  - ')}`);
  }

  console.log(`Schema validation (validate-policy-schema.js): ${pass} passed, ${fail} failed, ${pass + fail} total`);
  if (failures.length > 0) {
    console.log('\n' + failures.join('\n\n'));
    process.exit(1);
  }
  process.exit(0);
}

main();
