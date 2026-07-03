#!/usr/bin/env node
'use strict';

/**
 * Benchmarks bin/validate-policy-schema.js (hand-rolled, zero deps) against
 * bin/validate-policy-schema.ajv.js (ajv-based) on: correctness against the
 * adversarial fixture, cold-start cost (fresh process, matching how
 * bin/policy-check.js is actually invoked -- once per Claude Code hook
 * call), warm per-call cost (matching adapters/opencode/plugin.ts's
 * long-lived process), and node_modules footprint.
 *
 * Results feed founder-os/DECISIONS.md -- see that file for which
 * validator actually ended up wired into the loaders.
 */

const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '..');
const FOUNDER_OS = path.join(ROOT, 'founder-os');
const FIXTURE_PATH = path.join(FOUNDER_OS, 'tests', 'schema-validation-cases.json');
const POLICY_PATH = path.join(FOUNDER_OS, 'policy.json');
const HAND_ROLLED_PATH = path.join(FOUNDER_OS, 'bin', 'validate-policy-schema.js');
const AJV_PATH = path.join(FOUNDER_OS, 'bin', 'validate-policy-schema.ajv.js');

const { cases } = JSON.parse(fs.readFileSync(FIXTURE_PATH, 'utf8'));

function checkCorrectness(validatorPath) {
  const script = `
    const { validatePolicyDocument } = require(${JSON.stringify(validatorPath)});
    const cases = ${JSON.stringify(cases)};
    let pass = 0, fail = 0;
    const failures = [];
    for (const c of cases) {
      const errors = validatePolicyDocument(c.doc);
      const isValid = errors.length === 0;
      if (isValid === c.expectValid) { pass++; }
      else { fail++; failures.push(c.description); }
    }
    process.stdout.write(JSON.stringify({ pass, fail, failures }));
  `;
  const out = execFileSync(process.execPath, ['-e', script], { encoding: 'utf8', cwd: FOUNDER_OS });
  return JSON.parse(out.trim());
}

function measureColdStart(validatorPath, iterations) {
  const script = `
    const t0 = process.hrtime.bigint();
    const { validatePolicyDocument } = require(${JSON.stringify(validatorPath)});
    const doc = JSON.parse(require('fs').readFileSync(${JSON.stringify(POLICY_PATH)}, 'utf8'));
    validatePolicyDocument(doc);
    const t1 = process.hrtime.bigint();
    process.stdout.write(String(Number(t1 - t0) / 1e6));
  `;
  const times = [];
  for (let i = 0; i < iterations; i++) {
    const out = execFileSync(process.execPath, ['-e', script], { encoding: 'utf8', cwd: FOUNDER_OS });
    times.push(parseFloat(out.trim()));
  }
  times.sort((a, b) => a - b);
  return { median: times[Math.floor(times.length / 2)], min: times[0], max: times[times.length - 1] };
}

function measureWarm(validatorPath, iterations) {
  const { validatePolicyDocument } = require(validatorPath);
  const doc = JSON.parse(fs.readFileSync(POLICY_PATH, 'utf8'));
  for (let i = 0; i < 50; i++) validatePolicyDocument(doc);
  const t0 = process.hrtime.bigint();
  for (let i = 0; i < iterations; i++) validatePolicyDocument(doc);
  const t1 = process.hrtime.bigint();
  return Number(t1 - t0) / 1e6 / iterations;
}

function dirSizeKb(dir) {
  try {
    const out = execFileSync('du', ['-sk', dir], { encoding: 'utf8' });
    return parseInt(out.split('\t')[0], 10);
  } catch {
    return 0;
  }
}

function main() {
  console.log('=== Correctness (adversarial fixture: %d cases) ===', cases.length);
  const handRolledCorrectness = checkCorrectness(HAND_ROLLED_PATH);
  const ajvCorrectness = checkCorrectness(AJV_PATH);
  console.log(
    `hand-rolled: ${handRolledCorrectness.pass}/${cases.length} correct` +
      (handRolledCorrectness.failures.length ? `  FAILURES: ${handRolledCorrectness.failures.join('; ')}` : '')
  );
  console.log(
    `ajv:         ${ajvCorrectness.pass}/${cases.length} correct` +
      (ajvCorrectness.failures.length ? `  FAILURES: ${ajvCorrectness.failures.join('; ')}` : '')
  );

  console.log('\n=== Cold-start (fresh process, matches bin/policy-check.js invocation pattern), 20 runs ===');
  const coldHandRolled = measureColdStart(HAND_ROLLED_PATH, 20);
  const coldAjv = measureColdStart(AJV_PATH, 20);
  console.log(`hand-rolled: median ${coldHandRolled.median.toFixed(2)}ms (min ${coldHandRolled.min.toFixed(2)}, max ${coldHandRolled.max.toFixed(2)})`);
  console.log(`ajv:         median ${coldAjv.median.toFixed(2)}ms (min ${coldAjv.min.toFixed(2)}, max ${coldAjv.max.toFixed(2)})`);

  console.log('\n=== Warm per-call (in-process, matches adapters/opencode/plugin.ts long-lived process), 2000 calls after warmup ===');
  const warmHandRolled = measureWarm(HAND_ROLLED_PATH, 2000);
  const warmAjv = measureWarm(AJV_PATH, 2000);
  console.log(`hand-rolled: ${(warmHandRolled * 1000).toFixed(3)}us/call`);
  console.log(`ajv:         ${(warmAjv * 1000).toFixed(3)}us/call`);

  console.log('\n=== node_modules footprint ===');
  const ajvSize = dirSizeKb(path.join(FOUNDER_OS, 'node_modules', 'ajv'));
  console.log(`ajv package: ~${ajvSize} KB (plus its own transitive deps, not counted here)`);
  console.log('hand-rolled: 0 KB (no new dependency)');
}

main();
