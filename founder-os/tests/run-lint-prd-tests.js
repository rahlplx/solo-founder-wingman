#!/usr/bin/env node
'use strict';

/**
 * Coverage for bin/lint-prd.js. Unlike bin/scan-secrets.js/check-js-syntax.js
 * (which always operate on this repo's own tree), lint-prd.js takes an
 * explicit path argument -- it's meant to run against a document generated
 * into the *founder's* project -- so these tests write throwaway PRD.md
 * fixtures to a temp directory rather than injecting into this repo.
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const LINT_PRD = path.join(__dirname, '..', 'bin', 'lint-prd.js');
const TEMPLATE_PATH = path.join(__dirname, '..', 'templates', 'PRD.md.tpl');

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

function runLintPrd(prdPath) {
  const args = prdPath ? [LINT_PRD, prdPath] : [LINT_PRD];
  return spawnSync(process.execPath, args, { encoding: 'utf8' });
}

function withFixture(content, fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'founder-os-prd-lint-'));
  const prdPath = path.join(dir, 'PRD.md');
  fs.writeFileSync(prdPath, content);
  try {
    fn(prdPath);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// A complete, filled-in PRD matching templates/PRD.md.tpl's real shape --
// the positive control every other case is a targeted mutation of.
const VALID_PRD = `# ShiftEase — Product Requirements

> Small business owners can't efficiently manage employee schedules.

## Who this is for

**Target users:** Business owners and their employees at companies with 5-50 hourly workers.

**The job they're hiring this product to do:** Build a weekly schedule without a spreadsheet.

## Core features (max 5 for v1 — resist adding more)

1. Create a weekly schedule
2. Employees can view their shifts

## Behavior rules

- WHEN an owner publishes a schedule THEN all employees get a notification

## Data model

- Users: name, email, role

## Compliance & Regulatory Scope

No regulated data handled — no compliance scope for v1.

## Integrations

Supabase (db/auth)

## Success metrics

An owner can create next week's schedule in under 5 minutes.

## Explicitly NOT building in this version

- Payroll processing

This list exists so the agent (and you) can say no to scope creep without
re-litigating it every time.

## Status

- [ ] Create a weekly schedule
- [ ] Employees can view their shifts
`;

function main() {
  check('lint-prd: usage error (no path argument) exits non-zero with a usage message', (() => {
    const result = runLintPrd();
    return result.status === 2 && result.stderr.includes('Usage:');
  })());

  check('lint-prd: a nonexistent path exits non-zero', (() => {
    const result = runLintPrd('/tmp/founder-os-prd-lint-does-not-exist/PRD.md');
    return result.status === 2 && result.stderr.includes('does not exist');
  })());

  check('lint-prd: the raw, unfilled templates/PRD.md.tpl fails (still has {{PLACEHOLDER}} tokens)', (() => {
    const result = runLintPrd(TEMPLATE_PATH);
    return result.status === 1 && result.stderr.includes('unfilled placeholder');
  })());

  withFixture(VALID_PRD, (prdPath) => {
    const result = runLintPrd(prdPath);
    check('lint-prd: a fully filled-in PRD passes', result.status === 0 && result.stdout.includes('passes the PRD quality gate'), result.stdout + result.stderr);
  });

  withFixture(VALID_PRD.replace('Business owners and their employees at companies with 5-50 hourly workers.', '{{TARGET_USERS}}'), (prdPath) => {
    const result = runLintPrd(prdPath);
    check(
      'lint-prd: flags a leftover {{PLACEHOLDER}} token',
      result.status === 1 && result.stderr.includes('{{TARGET_USERS}}'),
      result.stderr
    );
  });

  withFixture(VALID_PRD.replace('## Integrations\n\nSupabase (db/auth)\n\n', ''), (prdPath) => {
    const result = runLintPrd(prdPath);
    check(
      'lint-prd: flags a missing required section',
      result.status === 1 && result.stderr.includes('missing required section: "## Integrations"'),
      result.stderr
    );
  });

  withFixture(VALID_PRD.replace('## Compliance & Regulatory Scope\n\nNo regulated data handled — no compliance scope for v1.\n\n', ''), (prdPath) => {
    const result = runLintPrd(prdPath);
    check(
      'lint-prd: flags a missing Compliance & Regulatory Scope section',
      result.status === 1 && result.stderr.includes('missing required section: "## Compliance & Regulatory Scope"'),
      result.stderr
    );
  });

  withFixture(VALID_PRD.replace('No regulated data handled — no compliance scope for v1.', ''), (prdPath) => {
    const result = runLintPrd(prdPath);
    check(
      'lint-prd: flags a present-but-empty Compliance & Regulatory Scope section',
      result.status === 1 && result.stderr.includes('"## Compliance & Regulatory Scope" is present but empty'),
      result.stderr
    );
  });

  withFixture(VALID_PRD.replace('Supabase (db/auth)', ''), (prdPath) => {
    const result = runLintPrd(prdPath);
    check(
      'lint-prd: flags a section that is present but empty',
      result.status === 1 && result.stderr.includes('"## Integrations" is present but empty'),
      result.stderr
    );
  });

  withFixture(
    VALID_PRD.replace('- WHEN an owner publishes a schedule THEN all employees get a notification', 'Publishing should notify employees somehow.'),
    (prdPath) => {
      const result = runLintPrd(prdPath);
      check(
        'lint-prd: flags Behavior rules with no WHEN/THEN-formatted line',
        result.status === 1 && result.stderr.includes('no WHEN/THEN-formatted rule'),
        result.stderr
      );
    }
  );

  console.log(`lint-prd.js tests: ${pass} passed, ${fail} failed, ${pass + fail} total`);
  if (failures.length > 0) {
    console.log('\n' + failures.join('\n\n'));
    process.exit(1);
  }
  process.exit(0);
}

main();
