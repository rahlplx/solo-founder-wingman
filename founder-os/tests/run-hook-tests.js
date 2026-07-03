#!/usr/bin/env node
'use strict';

/**
 * Test coverage for bin/verify-gate.sh and bin/doc-sync.sh -- previously
 * zero, unlike the JS/TS policy engines' 61-case fixture. Each test spins
 * up a real temp git repo (both scripts call `git rev-parse
 * --show-toplevel` and interact with real git state, so a fixture of
 * fake payloads alone wouldn't exercise the actual code paths) and runs
 * the actual script against it via child_process, asserting on stdout,
 * stderr, and exit code.
 */

const { execFileSync, spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const BIN_DIR = path.join(__dirname, '..', 'bin');
const VERIFY_GATE = path.join(BIN_DIR, 'verify-gate.sh');
const DOC_SYNC = path.join(BIN_DIR, 'doc-sync.sh');
const SETTINGS_PATH = path.join(__dirname, '..', 'settings.json');

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

function mkTempRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'founder-os-hook-test-'));
  execFileSync('git', ['init', '--quiet'], { cwd: dir });
  execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: dir });
  execFileSync('git', ['config', 'user.name', 'Test'], { cwd: dir });
  return dir;
}

function commitAll(dir, message) {
  execFileSync('git', ['add', '-A'], { cwd: dir });
  execFileSync('git', ['commit', '--quiet', '-m', message], { cwd: dir });
}

// Both scripts resolve settings.json relative to their own location
// (always founder-os/settings.json), not via cwd -- so testing the
// verifyGateOnDone/docSyncOnCommit toggles means temporarily overwriting
// the real file, always restored afterward via try/finally even on
// assertion failure.
function withSettingsOverride(overrides, fn) {
  const original = fs.readFileSync(SETTINGS_PATH, 'utf8');
  const merged = { ...JSON.parse(original), ...overrides };
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(merged, null, 2) + '\n');
  try {
    fn();
  } finally {
    fs.writeFileSync(SETTINGS_PATH, original);
  }
}

function runScript(scriptPath, payload, opts = {}) {
  const result = spawnSync('bash', [scriptPath], {
    cwd: opts.cwd || process.cwd(),
    input: JSON.stringify(payload),
    encoding: 'utf8',
    env: opts.env || process.env,
  });
  return { stdout: result.stdout, stderr: result.stderr, status: result.status };
}

// Builds a PATH with everything except `node`, to force the scripts'
// internal `node -e` calls to fail -- exercising the fail-safe ERR trap.
function pathWithoutNode() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'founder-os-no-node-'));
  const needed = ['bash', 'sh', 'cat', 'git', 'mktemp', 'tail', 'rm', 'mv', 'awk', 'date', 'sed', 'grep'];
  for (const bin of needed) {
    const real = spawnSync('command', ['-v', bin], { shell: '/bin/bash', encoding: 'utf8' }).stdout.trim();
    if (real) {
      try {
        fs.symlinkSync(real, path.join(dir, bin));
      } catch {
        // ignore duplicate symlink errors
      }
    }
  }
  return dir;
}

function testVerifyGate() {
  // stop_hook_active bypass -- always allow, no test run.
  {
    const dir = mkTempRepo();
    const { stdout, status } = runScript(VERIFY_GATE, { stop_hook_active: true }, { cwd: dir });
    check('verify-gate: stop_hook_active=true always allows', stdout.trim() === '{"decision":"allow"}' && status === 0, stdout);
  }

  // No package.json at all -- nothing to gate on, allow.
  {
    const dir = mkTempRepo();
    fs.writeFileSync(path.join(dir, 'README.md'), 'hello');
    commitAll(dir, 'init');
    const { stdout, status } = runScript(VERIFY_GATE, { stop_hook_active: false }, { cwd: dir });
    check('verify-gate: no package.json allows', stdout.trim() === '{"decision":"allow"}' && status === 0, stdout);
  }

  // package.json with no "test" script -- nothing to gate on, allow. Also
  // regression: a "keywords" field containing the literal string "test"
  // must not false-positive HAS_TEST_SCRIPT.
  {
    const dir = mkTempRepo();
    fs.writeFileSync(
      path.join(dir, 'package.json'),
      JSON.stringify({ name: 'x', keywords: ['test'], scripts: { build: 'echo ok' } })
    );
    commitAll(dir, 'init');
    const { stdout, status } = runScript(VERIFY_GATE, { stop_hook_active: false }, { cwd: dir });
    check(
      'verify-gate: package.json with "test" only in keywords (not scripts.test) allows',
      stdout.trim() === '{"decision":"allow"}' && status === 0,
      stdout
    );
  }

  // package.json with a passing test script -- allow.
  {
    const dir = mkTempRepo();
    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'x', scripts: { test: 'exit 0' } }));
    commitAll(dir, 'init');
    const { stdout, status } = runScript(VERIFY_GATE, { stop_hook_active: false }, { cwd: dir });
    check('verify-gate: passing test script allows', stdout.trim() === '{"decision":"allow"}' && status === 0, stdout);
  }

  // package.json with a failing test script -- block, reason includes output.
  {
    const dir = mkTempRepo();
    fs.writeFileSync(
      path.join(dir, 'package.json'),
      JSON.stringify({ name: 'x', scripts: { test: 'echo SPECIFIC_FAILURE_MARKER && exit 1' } })
    );
    commitAll(dir, 'init');
    const { stdout, status } = runScript(VERIFY_GATE, { stop_hook_active: false }, { cwd: dir });
    let parsed;
    try {
      parsed = JSON.parse(stdout);
    } catch {
      parsed = null;
    }
    check(
      'verify-gate: failing test script blocks with the real failure output in the reason',
      status === 0 &&
        parsed &&
        parsed.decision === 'block' &&
        typeof parsed.reason === 'string' &&
        parsed.reason.includes('SPECIFIC_FAILURE_MARKER') &&
        !parsed.reason.includes('\\n'),
      stdout
    );
  }

  // Fail-safe: node missing mid-script -- still emits valid allow JSON,
  // exit 0, loud stderr warning, not a crash.
  {
    const dir = mkTempRepo();
    const noNodePath = pathWithoutNode();
    const { stdout, stderr, status } = runScript(
      VERIFY_GATE,
      { stop_hook_active: false },
      { cwd: dir, env: { ...process.env, PATH: noNodePath } }
    );
    check(
      'verify-gate: fails open with valid JSON when node is unavailable',
      stdout.trim() === '{"decision":"allow"}' && status === 0 && stderr.includes('unexpected error'),
      `stdout=${JSON.stringify(stdout)} stderr=${JSON.stringify(stderr)} status=${status}`
    );
  }

  // founder.config.json's testCommand is used in place of `npm test` when
  // present -- lets non-npm projects (Python, Go, Rust, ...) get a working
  // verify gate instead of a silent allow-everything no-op. No package.json
  // at all here, proving the config-driven path doesn't depend on npm.
  {
    const dir = mkTempRepo();
    fs.writeFileSync(path.join(dir, 'founder.config.json'), JSON.stringify({ testCommand: 'exit 0' }));
    commitAll(dir, 'init');
    const { stdout, status } = runScript(VERIFY_GATE, { stop_hook_active: false }, { cwd: dir });
    check(
      'verify-gate: founder.config.json testCommand (passing, no package.json) allows',
      stdout.trim() === '{"decision":"allow"}' && status === 0,
      stdout
    );
  }

  // founder.config.json's testCommand failing -- blocks with its real output,
  // same contract as the package.json scripts.test path.
  {
    const dir = mkTempRepo();
    fs.writeFileSync(
      path.join(dir, 'founder.config.json'),
      JSON.stringify({ testCommand: 'echo CONFIG_DRIVEN_FAILURE_MARKER && exit 1' })
    );
    commitAll(dir, 'init');
    const { stdout, status } = runScript(VERIFY_GATE, { stop_hook_active: false }, { cwd: dir });
    let parsed;
    try {
      parsed = JSON.parse(stdout);
    } catch {
      parsed = null;
    }
    check(
      'verify-gate: founder.config.json testCommand (failing) blocks with its real output in the reason',
      status === 0 && parsed && parsed.decision === 'block' && parsed.reason.includes('CONFIG_DRIVEN_FAILURE_MARKER'),
      stdout
    );
  }

  // founder.config.json present but with no testCommand field -- falls back
  // to the package.json scripts.test detection, not a crash or a silent skip.
  {
    const dir = mkTempRepo();
    fs.writeFileSync(path.join(dir, 'founder.config.json'), JSON.stringify({ buildCommand: 'echo build' }));
    fs.writeFileSync(
      path.join(dir, 'package.json'),
      JSON.stringify({ name: 'x', scripts: { test: 'echo FALLBACK_MARKER && exit 1' } })
    );
    commitAll(dir, 'init');
    const { stdout, status } = runScript(VERIFY_GATE, { stop_hook_active: false }, { cwd: dir });
    let parsed;
    try {
      parsed = JSON.parse(stdout);
    } catch {
      parsed = null;
    }
    check(
      'verify-gate: founder.config.json without testCommand falls back to package.json scripts.test',
      status === 0 && parsed && parsed.decision === 'block' && parsed.reason.includes('FALLBACK_MARKER'),
      stdout
    );
  }

  // settings.json's verifyGateOnDone=false allows even with a failing test
  // script -- previously dead config, now actually wired up.
  withSettingsOverride({ verifyGateOnDone: false }, () => {
    const dir = mkTempRepo();
    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'x', scripts: { test: 'exit 1' } }));
    commitAll(dir, 'init');
    const { stdout, status } = runScript(VERIFY_GATE, { stop_hook_active: false }, { cwd: dir });
    check(
      'verify-gate: settings.json verifyGateOnDone=false allows even with a failing test script',
      stdout.trim() === '{"decision":"allow"}' && status === 0,
      stdout
    );
  });
}

function testDocSync() {
  // Non-git-commit command -- no-op, exit 0.
  {
    const dir = mkTempRepo();
    fs.writeFileSync(path.join(dir, 'CHANGELOG.md'), '## [Unreleased]\n\n### Added\n');
    commitAll(dir, 'init');
    const before = fs.readFileSync(path.join(dir, 'CHANGELOG.md'), 'utf8');
    const { status } = runScript(DOC_SYNC, { tool_input: { command: 'npm install' } }, { cwd: dir });
    const after = fs.readFileSync(path.join(dir, 'CHANGELOG.md'), 'utf8');
    check('doc-sync: non-git-commit command leaves CHANGELOG.md untouched', status === 0 && before === after);
  }

  // git commit + recent HEAD + CHANGELOG.md with ### Added -- appends.
  {
    const dir = mkTempRepo();
    fs.writeFileSync(path.join(dir, 'CHANGELOG.md'), '## [Unreleased]\n\n### Added\n');
    commitAll(dir, 'a specific feature commit');
    const { status } = runScript(DOC_SYNC, { tool_input: { command: 'git commit -m "a specific feature commit"' } }, { cwd: dir });
    const after = fs.readFileSync(path.join(dir, 'CHANGELOG.md'), 'utf8');
    check(
      'doc-sync: recent git commit with a valid CHANGELOG.md appends an entry',
      status === 0 && after.includes('a specific feature commit'),
      after
    );
  }

  // CHANGELOG.md missing the ### Added section -- warns loudly, doesn't crash, leaves file untouched.
  {
    const dir = mkTempRepo();
    fs.writeFileSync(path.join(dir, 'CHANGELOG.md'), '## [Unreleased]\n\nno Added section here\n');
    commitAll(dir, 'a commit');
    const before = fs.readFileSync(path.join(dir, 'CHANGELOG.md'), 'utf8');
    const { stderr, status } = runScript(DOC_SYNC, { tool_input: { command: 'git commit -m "a commit"' } }, { cwd: dir });
    const after = fs.readFileSync(path.join(dir, 'CHANGELOG.md'), 'utf8');
    check(
      'doc-sync: missing ### Added section warns to stderr and leaves CHANGELOG.md untouched',
      status === 0 && before === after && stderr.includes("### Added"),
      `stderr=${JSON.stringify(stderr)}`
    );
  }

  // Fail-safe: node missing mid-script -- exits 0, loud stderr warning, not a crash.
  {
    const dir = mkTempRepo();
    fs.writeFileSync(path.join(dir, 'CHANGELOG.md'), '## [Unreleased]\n\n### Added\n');
    commitAll(dir, 'init');
    const noNodePath = pathWithoutNode();
    const { stderr, status } = runScript(
      DOC_SYNC,
      { tool_input: { command: 'git commit -m "x"' } },
      { cwd: dir, env: { ...process.env, PATH: noNodePath } }
    );
    check(
      'doc-sync: fails open (exit 0) with a loud warning when node is unavailable',
      status === 0 && stderr.includes('unexpected error'),
      `stderr=${JSON.stringify(stderr)} status=${status}`
    );
  }

  // settings.json's docSyncOnCommit=false skips the append even on a
  // real, recent git commit -- previously dead config, now actually
  // wired up.
  withSettingsOverride({ docSyncOnCommit: false }, () => {
    const dir = mkTempRepo();
    fs.writeFileSync(path.join(dir, 'CHANGELOG.md'), '## [Unreleased]\n\n### Added\n');
    commitAll(dir, 'a commit that should not be appended');
    const before = fs.readFileSync(path.join(dir, 'CHANGELOG.md'), 'utf8');
    const { status } = runScript(
      DOC_SYNC,
      { tool_input: { command: 'git commit -m "a commit that should not be appended"' } },
      { cwd: dir }
    );
    const after = fs.readFileSync(path.join(dir, 'CHANGELOG.md'), 'utf8');
    check('doc-sync: settings.json docSyncOnCommit=false leaves CHANGELOG.md untouched', status === 0 && before === after);
  });
}

testVerifyGate();
testDocSync();

console.log(`Bash hook tests (verify-gate.sh, doc-sync.sh): ${pass} passed, ${fail} failed, ${pass + fail} total`);
if (failures.length > 0) {
  console.log('\n' + failures.join('\n\n'));
  process.exit(1);
}
process.exit(0);
