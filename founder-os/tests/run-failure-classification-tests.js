#!/usr/bin/env node
'use strict';

/**
 * Direct unit coverage for core/failure-classification.js -- the
 * classifyFailure()/formatFailureMessage() utility that turns
 * bin/verify-gate.sh's captured test-command output into a founder-facing
 * "what happened, what to do next" line before the raw dump.
 */

const { classifyFailure, formatFailureMessage } = require('../core/failure-classification.js');

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

// Network patterns.
{
  const result = classifyFailure('Error: connect ECONNREFUSED 127.0.0.1:5432');
  check('classifyFailure: ECONNREFUSED -> network-unreachable, high confidence', result.kind === 'network-unreachable' && result.confidence === 'high', JSON.stringify(result));
}
{
  const result = classifyFailure('FetchError: request to https://api.example.com failed, reason: getaddrinfo ENOTFOUND api.example.com');
  check('classifyFailure: ENOTFOUND -> network-unreachable', result.kind === 'network-unreachable', JSON.stringify(result));
}
{
  const result = classifyFailure('Error: connect ETIMEDOUT');
  check('classifyFailure: ETIMEDOUT -> timeout', result.kind === 'timeout', JSON.stringify(result));
}

// OS patterns.
{
  const result = classifyFailure("Error: ENOENT: no such file or directory, open 'config.json'");
  check('classifyFailure: ENOENT -> not-found', result.kind === 'not-found', JSON.stringify(result));
}
{
  const result = classifyFailure('Error: EACCES: permission denied, open \'/etc/shadow\'');
  check('classifyFailure: EACCES -> permission-denied', result.kind === 'permission-denied', JSON.stringify(result));
}
{
  const result = classifyFailure('Error: ENOSPC: no space left on device');
  check('classifyFailure: ENOSPC -> resource-exhausted', result.kind === 'resource-exhausted', JSON.stringify(result));
}

// Test-output-shaped patterns (verify-gate.sh's actual real-world input shape).
{
  const result = classifyFailure('npm error Missing script: "test"');
  check('classifyFailure: "Missing script: test" -> not-found', result.kind === 'not-found', JSON.stringify(result));
}
{
  const result = classifyFailure('bash: pytest: command not found');
  check('classifyFailure: bash-style "command not found" -> not-found', result.kind === 'not-found', JSON.stringify(result));
}
{
  const result = classifyFailure('sh: 1: pytest: not found');
  check('classifyFailure: dash/sh-style "sh: 1: cmd: not found" -> not-found (npm test\'s actual child-shell phrasing on Linux)', result.kind === 'not-found', JSON.stringify(result));
}

// Multi-line input: reason is the specific matching line, not the whole blob.
{
  const multiline = [
    'Running test suite...',
    '  1 passing',
    '  1 failing',
    '',
    '  1) should connect to db:',
    '     Error: connect ECONNREFUSED 127.0.0.1:5432',
    '        at TCPConnectWrap.afterConnect',
    '',
  ].join('\n');
  const result = classifyFailure(multiline);
  check(
    'classifyFailure: multi-line input -- reason is the single matching line, not the whole blob',
    result.kind === 'network-unreachable' && result.reason === 'Error: connect ECONNREFUSED 127.0.0.1:5432',
    JSON.stringify(result)
  );
}

// Unknown/unclassifiable: honest low-confidence fallback, not a fabricated guess.
{
  const result = classifyFailure('AssertionError: expected 2 to equal 3');
  check('classifyFailure: an ordinary failing assertion -> unknown, low confidence (no infra pattern matches)', result.kind === 'unknown' && result.confidence === 'low', JSON.stringify(result));
  check('classifyFailure: unknown case still returns the first non-empty line as reason', result.reason === 'AssertionError: expected 2 to equal 3', JSON.stringify(result));
}
{
  const result = classifyFailure('\n\n   \nsomething went wrong\nmore detail here\n');
  check('classifyFailure: skips leading blank lines to find the first non-empty one', result.reason === 'something went wrong', JSON.stringify(result));
}

// formatFailureMessage: one-line, founder-facing rendering.
{
  const classification = { kind: 'not-found', reason: 'ENOENT: no such file', nextStep: 'Check the path.', confidence: 'high' };
  const formatted = formatFailureMessage(classification);
  check('formatFailureMessage: includes kind, reason, next step, and confidence', formatted.includes('[not-found]') && formatted.includes('ENOENT') && formatted.includes('Next: Check the path.') && formatted.includes('confidence: high'), formatted);
}

console.log(`failure-classification.js tests: ${pass} passed, ${fail} failed, ${pass + fail} total`);
if (failures.length > 0) {
  console.log('\n' + failures.join('\n\n'));
  process.exit(1);
}
process.exit(0);
