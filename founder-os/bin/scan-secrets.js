#!/usr/bin/env node
'use strict';

/**
 * Lightweight secret scan reusing policy.json's own scope:"any" rule
 * patterns (the ones meant to catch a secret pasted into a file, not just
 * typed as a bash command) against every git-tracked file's content --
 * no new dependency, dogfoods rule data that already exists instead of
 * adding a scanning library.
 *
 * Only scope:"any" rules apply here: scope:"bash" rules (e.g.
 * "secrets-git-add-env") are about command *shape*, not something that
 * can meaningfully match arbitrary file content.
 *
 * A handful of paths are deliberately excluded: this project's own
 * adversarial test fixtures and rule/schema definitions intentionally
 * contain fake secret-shaped strings (e.g. "sk_live_51ABCDEFGHIJ" in
 * tests/policy-cases.json) and docs that reference the pattern by name
 * for explanation (README.md, DECISIONS.md, CHANGELOG.md) -- none of
 * these are real leaked secrets, and excluding them by design keeps this
 * scan meaningful for everything else instead of permanently red.
 */

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.join(__dirname, '..', '..');
const POLICY_PATH = path.join(__dirname, '..', 'policy.json');

const EXCLUDED_PATTERNS = [
  /^founder-os\/tests\//,
  /^founder-os\/policy\.json$/,
  /^founder-os\/schema\/policy\.schema\.json$/,
  /\.md$/,
];

function isExcluded(relPath) {
  return EXCLUDED_PATTERNS.some((re) => re.test(relPath));
}

function getTrackedFiles() {
  const out = execFileSync('git', ['ls-files'], { cwd: REPO_ROOT, encoding: 'utf8' });
  return out.split('\n').filter((line) => line.length > 0);
}

function main() {
  const { rules } = JSON.parse(fs.readFileSync(POLICY_PATH, 'utf8'));
  const secretRules = rules
    .filter((r) => r.scope === 'any' && (r.category === 'secrets' || r.category === 'prod_boundary'))
    .map((r) => ({ ...r, re: new RegExp(r.pattern, r.flags || '') }));

  if (secretRules.length === 0) {
    console.log('scan-secrets: no scope:"any" secret/prod-boundary rules in policy.json -- nothing to scan for.');
    process.exit(0);
  }

  const files = getTrackedFiles().filter((f) => !isExcluded(f));
  const findings = [];

  for (const relPath of files) {
    const fullPath = path.join(REPO_ROOT, relPath);
    let content;
    try {
      content = fs.readFileSync(fullPath, 'utf8');
    } catch {
      continue; // binary or unreadable -- skip rather than crash the scan
    }
    for (const rule of secretRules) {
      if (rule.re.test(content)) {
        findings.push({ file: relPath, ruleId: rule.id, message: rule.message });
      }
    }
  }

  if (findings.length > 0) {
    console.error(`scan-secrets: ${findings.length} potential secret(s) found:`);
    for (const f of findings) {
      console.error(`  - ${f.file}: [${f.ruleId}] ${f.message}`);
    }
    process.exit(1);
  }

  console.log(`scan-secrets: clean (${files.length} tracked files checked against ${secretRules.length} rule(s)).`);
}

main();
