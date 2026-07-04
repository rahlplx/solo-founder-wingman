#!/usr/bin/env node
'use strict';

/**
 * Coverage for bin/lint-harness.js -- fault-injects a defect of each kind
 * it's meant to catch (mismatched skill frontmatter name, a missing
 * required agent section, a command with no frontmatter, an unknown
 * policy.json rule category), confirms the linter actually flags it and
 * names it, then cleans up and confirms a clean run again. lint-harness.js
 * hardcodes its target (this repo's own skills/agents/commands/policy.json)
 * rather than accepting an injectable root -- matching bin/scan-secrets.js
 * and bin/check-js-syntax.js -- so these tests inject real temporary
 * fixtures into the actual tree, always removed in `finally`.
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.join(__dirname, '..');
const LINT_HARNESS = path.join(REPO_ROOT, 'bin', 'lint-harness.js');
const POLICY_PATH = path.join(REPO_ROOT, 'policy.json');

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

function runLintHarness() {
  return spawnSync(process.execPath, [LINT_HARNESS], { encoding: 'utf8', cwd: REPO_ROOT });
}

function withTempFile(relPath, content, fn) {
  const fullPath = path.join(REPO_ROOT, relPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content);
  try {
    fn();
  } finally {
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    const dir = path.dirname(fullPath);
    if (fs.existsSync(dir) && dir !== REPO_ROOT && fs.readdirSync(dir).length === 0) fs.rmdirSync(dir);
  }
}

function withPolicyOverride(mutate, fn) {
  const original = fs.readFileSync(POLICY_PATH, 'utf8');
  const policy = JSON.parse(original);
  mutate(policy);
  fs.writeFileSync(POLICY_PATH, JSON.stringify(policy, null, 2) + '\n');
  try {
    fn();
  } finally {
    fs.writeFileSync(POLICY_PATH, original);
  }
}

function main() {
  const baseline = runLintHarness();
  check('lint-harness: passes (exit 0) on the real, unmodified repo', baseline.status === 0, baseline.stdout);
  check('lint-harness: reports a "N passed, 0 failed" summary on a clean run', /\d+ passed, 0 failed/.test(baseline.stdout), baseline.stdout);

  withTempFile(
    'skills/__tmp-bad-skill/SKILL.md',
    '---\nname: wrong-name\ndescription: a fixture\n---\n\n# Bad Skill\n\n## What to do\n',
    () => {
      const result = runLintHarness();
      check(
        'lint-harness: flags a skill whose frontmatter name does not match its directory',
        result.status === 1 && result.stdout.includes('frontmatter name matches its directory name'),
        result.stdout
      );
    }
  );

  withTempFile(
    'agents/__tmp-bad-agent.md',
    '---\nname: __tmp-bad-agent\ndescription: a fixture\ntools: Read\n---\n\nNo required sections here.\n',
    () => {
      const result = runLintHarness();
      check(
        'lint-harness: flags an agent missing the "## Report format" section',
        result.status === 1 && result.stdout.includes('"## Report format" section'),
        result.stdout
      );
      check(
        'lint-harness: flags an agent missing the "## What NOT to do" section',
        result.stdout.includes('"## What NOT to do" section'),
        result.stdout
      );
      check(
        'lint-harness: flags an agent missing the standardized output contract fields',
        ['VERDICT:', 'FINDINGS:', 'RECOMMENDATION:', 'CONFIDENCE:'].every((f) => result.stdout.includes(f)),
        result.stdout
      );
    }
  );

  withTempFile(
    'agents/__tmp-partial-contract-agent.md',
    '---\nname: __tmp-partial-contract-agent\ndescription: a fixture\ntools: Read\n---\n\n## Report format\nVERDICT: PASS\nFINDINGS: none\n\n## What NOT to do\nn/a\n',
    () => {
      const result = runLintHarness();
      check(
        'lint-harness: flags an agent with only some output-contract fields present (missing RECOMMENDATION/CONFIDENCE, but not VERDICT/FINDINGS which are present)',
        result.status === 1 &&
          result.stdout.includes('standardized output contract includes RECOMMENDATION:') &&
          result.stdout.includes('standardized output contract includes CONFIDENCE:') &&
          !result.stdout.includes('standardized output contract includes VERDICT:') &&
          !result.stdout.includes('standardized output contract includes FINDINGS:'),
        result.stdout
      );
    }
  );

  withTempFile('commands/__tmp-bad-command.md', 'No frontmatter at all, just prose.\n', () => {
    const result = runLintHarness();
    check(
      'lint-harness: flags a command file with no frontmatter',
      result.status === 1 && result.stdout.includes('commands/__tmp-bad-command.md: has frontmatter'),
      result.stdout
    );
  });

  withTempFile(
    'commands/__tmp-sparse-command.md',
    '---\ndescription: a fixture command with no argument-hint or allowed-tools\n---\n\nPROBLEM: $ARGUMENTS\n',
    () => {
      const result = runLintHarness();
      check(
        'lint-harness: flags a command missing argument-hint',
        result.status === 1 && result.stdout.includes('commands/__tmp-sparse-command.md: frontmatter has a non-empty argument-hint'),
        result.stdout
      );
      check(
        'lint-harness: flags a command missing allowed-tools',
        result.stdout.includes('commands/__tmp-sparse-command.md: frontmatter has a non-empty allowed-tools'),
        result.stdout
      );
    }
  );

  withTempFile(
    'commands/__tmp-hyphenated-command.md',
    '---\ndescription: a fixture command with hyphenated fields filled in\nargument-hint: <some arg>\nallowed-tools: Read, Grep\n---\n\nPROBLEM: $ARGUMENTS\n',
    () => {
      const result = runLintHarness();
      check(
        'lint-harness: a command with argument-hint/allowed-tools filled in passes those two checks (regression guard for the hyphenated-key frontmatter parser fix)',
        !result.stdout.includes('commands/__tmp-hyphenated-command.md: frontmatter has a non-empty argument-hint') &&
          !result.stdout.includes('commands/__tmp-hyphenated-command.md: frontmatter has a non-empty allowed-tools'),
        result.stdout
      );
    }
  );

  withTempFile('skills/audit-summary/__tmp-extra-file.txt', 'an unexpected extra file\n', () => {
    const result = runLintHarness();
    check(
      'lint-harness: flags a skill directory containing more than just SKILL.md',
      result.status === 1 && result.stdout.includes('skills/audit-summary: contains only SKILL.md'),
      result.stdout
    );
  });

  withPolicyOverride(
    (policy) => {
      policy.rules.push({
        id: 'tmp-bad-category-fixture',
        category: 'not_a_real_category',
        scope: 'bash',
        pattern: 'this-never-matches-anything-xyz',
        action: 'confirm',
        message: 'fixture rule for lint-harness test coverage',
      });
    },
    () => {
      const result = runLintHarness();
      check(
        'lint-harness: flags a policy.json rule with an unknown category',
        result.status === 1 && result.stdout.includes('tmp-bad-category-fixture') && result.stdout.includes('known category'),
        result.stdout
      );
    }
  );

  const afterCleanup = runLintHarness();
  check('lint-harness: passes again once all fixtures are removed', afterCleanup.status === 0, afterCleanup.stdout);

  console.log(`lint-harness.js tests: ${pass} passed, ${fail} failed, ${pass + fail} total`);
  if (failures.length > 0) {
    console.log('\n' + failures.join('\n\n'));
    process.exit(1);
  }
  process.exit(0);
}

main();
