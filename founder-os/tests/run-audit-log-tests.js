#!/usr/bin/env node
'use strict';

/**
 * Coverage for bin/audit-log.js itself (unit-level) and its wiring into
 * bin/policy-check.js (integration-level, via a real subprocess -- the
 * only way to actually prove main() calls appendEntry(), since evaluate()
 * itself stays pure and doesn't log).
 *
 * LOG_PATH in bin/audit-log.js is a fixed path (founder-os/.audit/audit.log,
 * matching how policy.json/settings.json are also always resolved relative
 * to the plugin's own location, not cwd) -- so these tests back up and
 * restore whatever's actually there, rather than being able to point the
 * module at a throwaway temp file.
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const AUDIT_LOG = require('../bin/audit-log.js');
const LOG_PATH = AUDIT_LOG.LOG_PATH;
const LOG_DIR = path.dirname(LOG_PATH);
const POLICY_CHECK = path.join(__dirname, '..', 'bin', 'policy-check.js');
const AUDIT_SUMMARY = path.join(__dirname, '..', 'bin', 'audit-summary.js');

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

function withCleanLog(fn) {
  const existed = fs.existsSync(LOG_PATH);
  const backup = existed ? fs.readFileSync(LOG_PATH, 'utf8') : null;
  if (existed) fs.unlinkSync(LOG_PATH);
  try {
    fn();
  } finally {
    if (fs.existsSync(LOG_PATH)) fs.unlinkSync(LOG_PATH);
    if (existed) {
      fs.mkdirSync(LOG_DIR, { recursive: true });
      fs.writeFileSync(LOG_PATH, backup);
    } else if (fs.existsSync(LOG_DIR) && fs.readdirSync(LOG_DIR).length === 0) {
      fs.rmdirSync(LOG_DIR);
    }
  }
}

function testUnitLevel() {
  withCleanLog(() => {
    check('readEntries: returns [] when the log file does not exist yet', AUDIT_LOG.readEntries().length === 0);

    AUDIT_LOG.appendEntry({ platform: 'claude-code', tool: 'Bash', decision: 'deny', ruleId: 'destructive-rm-rf', reason: '[destructive-rm-rf] danger' });
    const afterOne = AUDIT_LOG.readEntries();
    check('appendEntry: creates the log directory and file on first write', fs.existsSync(LOG_PATH));
    check('appendEntry: readEntries sees exactly 1 record after 1 append', afterOne.length === 1, JSON.stringify(afterOne));
    check(
      'appendEntry: the record has the expected shape',
      afterOne[0].platform === 'claude-code' &&
        afterOne[0].tool === 'Bash' &&
        afterOne[0].decision === 'deny' &&
        afterOne[0].ruleId === 'destructive-rm-rf' &&
        typeof afterOne[0].timestamp === 'string' &&
        !Number.isNaN(Date.parse(afterOne[0].timestamp)),
      JSON.stringify(afterOne[0])
    );

    AUDIT_LOG.appendEntry({ platform: 'opencode', tool: 'bash', decision: 'block', ruleId: 'obfuscation-eval', reason: '[obfuscation-eval]' });
    check('appendEntry: entries accumulate (append-only), 2 records after 2 appends', AUDIT_LOG.readEntries().length === 2);

    fs.appendFileSync(LOG_PATH, 'not valid json\n');
    const afterGarbage = AUDIT_LOG.readEntries();
    check(
      'readEntries: skips malformed lines instead of throwing',
      afterGarbage.length === 2,
      `expected 2 valid records, got ${afterGarbage.length}`
    );

    check('appendEntry: null ruleId defaults correctly when not provided', (() => {
      AUDIT_LOG.appendEntry({ platform: 'claude-code', tool: 'Bash', decision: 'ask' });
      const entries = AUDIT_LOG.readEntries();
      return entries[entries.length - 1].ruleId === null;
    })());
  });
}

function runPolicyCheck(payload) {
  const result = spawnSync(process.execPath, [POLICY_CHECK], {
    input: JSON.stringify(payload),
    encoding: 'utf8',
    cwd: path.join(__dirname, '..'),
  });
  return { stdout: result.stdout, status: result.status };
}

function testIntegrationLevel() {
  withCleanLog(() => {
    // A denied command should append a real audit entry.
    runPolicyCheck({ tool_name: 'Bash', tool_input: { command: 'rm -rf /' } });
    const afterDeny = AUDIT_LOG.readEntries();
    check(
      'integration: a real deny through policy-check.js appends a matching audit entry',
      afterDeny.length === 1 &&
        afterDeny[0].platform === 'claude-code' &&
        afterDeny[0].decision === 'deny' &&
        afterDeny[0].ruleId === 'destructive-rm-rf',
      JSON.stringify(afterDeny)
    );

    // A plain allow should NOT append anything -- only interventions are logged.
    runPolicyCheck({ tool_name: 'Bash', tool_input: { command: 'npm install' } });
    const afterAllow = AUDIT_LOG.readEntries();
    check('integration: a plain allow does not append a new audit entry', afterAllow.length === 1, JSON.stringify(afterAllow));
  });
}

function runAuditSummary(args = []) {
  return spawnSync(process.execPath, [AUDIT_SUMMARY, ...args], { encoding: 'utf8' });
}

function testAuditSummary() {
  withCleanLog(() => {
    const emptyResult = runAuditSummary();
    check(
      'audit-summary: reports no interventions gracefully on an empty/missing log',
      emptyResult.status === 0 && emptyResult.stdout.includes('No safety interventions'),
      emptyResult.stdout
    );

    runPolicyCheck({ tool_name: 'Bash', tool_input: { command: 'rm -rf /' } });
    runPolicyCheck({ tool_name: 'Bash', tool_input: { command: 'git reset --hard HEAD~3' } });

    const populated = runAuditSummary();
    check(
      'audit-summary: reports correct counts and rule ids with a populated log',
      populated.status === 0 &&
        populated.stdout.includes('2 intervention(s)') &&
        populated.stdout.includes('destructive-rm-rf') &&
        populated.stdout.includes('destructive-git-reset-hard'),
      populated.stdout
    );

    const jsonResult = runAuditSummary(['--json']);
    let parsed;
    try {
      parsed = JSON.parse(jsonResult.stdout);
    } catch {
      parsed = null;
    }
    check('audit-summary: --json outputs valid, matching JSON', Array.isArray(parsed) && parsed.length === 2, jsonResult.stdout);

    const daysResult = runAuditSummary(['--days', '0']);
    check(
      'audit-summary: --days 0 filters out all entries (nothing is 0 days old or newer than now)',
      daysResult.status === 0 && daysResult.stdout.includes('No safety interventions'),
      daysResult.stdout
    );
  });
}

async function testOpenCodeIntegrationLevel() {
  const { evaluate } = await import('../adapters/opencode/plugin.ts');
  const { loadPolicy } = require('../bin/policy-check.js');

  withCleanLog(() => {
    // plugin.ts's evaluate() itself is pure (doesn't log) -- the same
    // contract as bin/policy-check.js's evaluate(). This confirms it still
    // returns a ruleId for FounderOsPolicy()'s tool.execute.before handler
    // to log, without actually re-testing that handler's wiring here
    // (that would require standing up a real OpenCode plugin.execute.before
    // invocation, which is exercised structurally in
    // tests/run-opencode-policy-tests.ts already).
    const rules = loadPolicy();
    const result = evaluate(rules, 'bash', { command: 'rm -rf /' });
    check(
      "plugin.ts's evaluate() returns a ruleId alongside the decision, for FounderOsPolicy() to log",
      result.decision === 'block' && result.ruleId === 'destructive-rm-rf',
      JSON.stringify(result)
    );
    check('plugin.ts: evaluate() itself does not write to the audit log (stays pure)', AUDIT_LOG.readEntries().length === 0);
  });
}

async function main() {
  testUnitLevel();
  testIntegrationLevel();
  await testOpenCodeIntegrationLevel();
  testAuditSummary();

  console.log(`Audit log tests (bin/audit-log.js, wiring into both adapters, audit-summary.js): ${pass} passed, ${fail} failed, ${pass + fail} total`);
  if (failures.length > 0) {
    console.log('\n' + failures.join('\n\n'));
    process.exit(1);
  }
  process.exit(0);
}

main();
