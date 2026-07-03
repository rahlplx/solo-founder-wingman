#!/usr/bin/env node
'use strict';

/**
 * Coverage for bin/check-js-syntax.js and bin/scan-secrets.js -- both were
 * only manually/ad-hoc verified when first written (inject a fault, run
 * the script, confirm it flags it, restore). This makes that same
 * verification permanent and repeatable via real subprocess runs against
 * temporary fixtures, cleaned up in `finally` blocks so a failing
 * assertion never leaves stray files or git state behind.
 *
 * Both scripts hardcode their target (the whole repo tree / all
 * `git ls-files`-tracked files) rather than accepting an injectable root,
 * matching how policy.json/settings.json are always resolved relative to
 * the plugin's own location -- so these tests inject real fixtures into
 * the actual repo tree (and, for scan-secrets.js, the real git index)
 * rather than pointing the scripts at a throwaway directory.
 */

const { spawnSync, execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.join(__dirname, '..', '..');
const CHECK_JS_SYNTAX = path.join(__dirname, '..', 'bin', 'check-js-syntax.js');
const SCAN_SECRETS = path.join(__dirname, '..', 'bin', 'scan-secrets.js');

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

function runCheckJsSyntax() {
  return spawnSync(process.execPath, [CHECK_JS_SYNTAX], { encoding: 'utf8', cwd: REPO_ROOT });
}

function runScanSecrets() {
  return spawnSync(process.execPath, [SCAN_SECRETS], { encoding: 'utf8', cwd: REPO_ROOT });
}

function testCheckJsSyntax() {
  const clean = runCheckJsSyntax();
  check('check-js-syntax: passes (exit 0) on the real, unmodified repo', clean.status === 0, clean.stdout + clean.stderr);
  check('check-js-syntax: reports an "N/N files OK" summary on a clean run', /\d+\/\d+ files OK/.test(clean.stdout), clean.stdout);

  const fixturePath = path.join(REPO_ROOT, 'founder-os', 'tests', '__tmp-syntax-fixture.js');
  try {
    fs.writeFileSync(fixturePath, "'use strict';\nfunction ok() { return 1; }\n");
    const withValidFixture = runCheckJsSyntax();
    check(
      'check-js-syntax: still passes with a new, syntactically valid file added',
      withValidFixture.status === 0,
      withValidFixture.stdout + withValidFixture.stderr
    );

    fs.writeFileSync(fixturePath, "'use strict';\nfunction broken( {\n");
    const withBrokenFixture = runCheckJsSyntax();
    check(
      'check-js-syntax: fails (exit 1) when a tracked-tree .js file has a syntax error',
      withBrokenFixture.status === 1,
      withBrokenFixture.stdout + withBrokenFixture.stderr
    );
    check(
      'check-js-syntax: names the broken file in its output',
      withBrokenFixture.stderr.includes('__tmp-syntax-fixture.js') || withBrokenFixture.stdout.includes('__tmp-syntax-fixture.js'),
      withBrokenFixture.stdout + withBrokenFixture.stderr
    );
  } finally {
    if (fs.existsSync(fixturePath)) fs.unlinkSync(fixturePath);
  }

  const afterCleanup = runCheckJsSyntax();
  check('check-js-syntax: passes again once the fixture is removed', afterCleanup.status === 0, afterCleanup.stdout + afterCleanup.stderr);
}

function withStagedFixture(relPath, content, fn) {
  const fullPath = path.join(REPO_ROOT, relPath);
  fs.writeFileSync(fullPath, content);
  execFileSync('git', ['add', '--', relPath], { cwd: REPO_ROOT });
  try {
    fn();
  } finally {
    execFileSync('git', ['reset', '--', relPath], { cwd: REPO_ROOT, stdio: 'ignore' });
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
  }
}

function testScanSecrets() {
  const clean = runScanSecrets();
  check('scan-secrets: passes (exit 0) on the real, unmodified repo', clean.status === 0, clean.stdout + clean.stderr);
  check('scan-secrets: reports a "clean" summary on a clean run', clean.stdout.includes('clean'), clean.stdout);

  withStagedFixture('founder-os/__tmp-secret-fixture.txt', 'token = sk_live_TESTDETECTION123\n', () => {
    const withSecret = runScanSecrets();
    check(
      'scan-secrets: fails (exit 1) when a tracked file contains a live-key-shaped string',
      withSecret.status === 1,
      withSecret.stdout + withSecret.stderr
    );
    check(
      'scan-secrets: names the offending file and rule id in its output',
      withSecret.stderr.includes('__tmp-secret-fixture.txt') && withSecret.stderr.includes('prod-boundary-stripe-live-key'),
      withSecret.stdout + withSecret.stderr
    );
  });

  const afterCleanup = runScanSecrets();
  check('scan-secrets: passes again once the fixture is unstaged and removed', afterCleanup.status === 0, afterCleanup.stdout + afterCleanup.stderr);

  withStagedFixture('founder-os/__tmp-secret-fixture.md', 'sk_live_TESTDETECTION123\n', () => {
    const excludedMd = runScanSecrets();
    check(
      'scan-secrets: excludes .md files even when they contain a secret-shaped string',
      excludedMd.status === 0,
      excludedMd.stdout + excludedMd.stderr
    );
  });
}

function main() {
  testCheckJsSyntax();
  testScanSecrets();

  console.log(`Repo scan tests (bin/check-js-syntax.js, bin/scan-secrets.js): ${pass} passed, ${fail} failed, ${pass + fail} total`);
  if (failures.length > 0) {
    console.log('\n' + failures.join('\n\n'));
    process.exit(1);
  }
  process.exit(0);
}

main();
