#!/usr/bin/env node
'use strict';

/**
 * Asserts .github/workflows/ci.yml's policy-tests job runs exactly the
 * npm scripts listed in scripts/local-ci/jobs.json, in the same order --
 * the same list scripts/local-ci/entrypoint.sh reads directly. Before
 * this, the two were hand-duplicated with nothing catching drift (e.g. a
 * script added to one and not the other, like test:audit-log briefly
 * was).
 *
 * ci.yml intentionally keeps its own explicit per-script steps (clear,
 * individually-attributed GitHub Actions UI output) rather than looping
 * over jobs.json the way entrypoint.sh does -- this test is what keeps
 * that duplication honest instead of structurally eliminating it, since
 * GitHub Actions can't dynamically generate steps from an external file
 * without much heavier tooling than this warrants.
 *
 * No YAML-parsing dependency -- ci.yml's `run: npm run X` lines have a
 * consistent enough shape that a plain regex extraction is reliable and
 * avoids adding a parser just for this one check.
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.join(__dirname, '..', '..');
const JOBS_JSON_PATH = path.join(REPO_ROOT, 'scripts', 'local-ci', 'jobs.json');
const CI_YML_PATH = path.join(REPO_ROOT, '.github', 'workflows', 'ci.yml');

function extractPolicyTestsScripts(ciYmlContent) {
  const lines = ciYmlContent.split('\n');
  const startIdx = lines.findIndex((l) => /^\s{2}policy-tests:\s*$/.test(l));
  if (startIdx === -1) {
    throw new Error('could not find a top-level "policy-tests:" job in .github/workflows/ci.yml');
  }
  // The job's section ends at the next 2-space-indented top-level key (the next job).
  let endIdx = lines.length;
  for (let i = startIdx + 1; i < lines.length; i++) {
    if (/^\s{2}\S.*:\s*$/.test(lines[i])) {
      endIdx = i;
      break;
    }
  }
  const section = lines.slice(startIdx, endIdx).join('\n');
  const scripts = [];
  const re = /run:\s*npm run ([\w:.-]+)/g;
  let match;
  while ((match = re.exec(section)) !== null) {
    scripts.push(match[1]);
  }
  return scripts;
}

function main() {
  const jobs = JSON.parse(fs.readFileSync(JOBS_JSON_PATH, 'utf8'));
  const expected = jobs.policyTestsScripts;
  const ciYmlContent = fs.readFileSync(CI_YML_PATH, 'utf8');
  const actual = extractPolicyTestsScripts(ciYmlContent);

  let pass = 0;
  let fail = 0;
  const failures = [];

  if (JSON.stringify(expected) === JSON.stringify(actual)) {
    pass++;
  } else {
    fail++;
    failures.push(
      "FAIL: .github/workflows/ci.yml's policy-tests job steps don't match " +
        'scripts/local-ci/jobs.json\'s policyTestsScripts (the shared source of truth ' +
        'scripts/local-ci/entrypoint.sh also reads).\n' +
        `  expected (jobs.json): ${JSON.stringify(expected)}\n` +
        `  actual   (ci.yml):    ${JSON.stringify(actual)}`
    );
  }

  console.log(`CI/local-ci drift check: ${pass} passed, ${fail} failed, ${pass + fail} total`);
  if (failures.length > 0) {
    console.log('\n' + failures.join('\n\n'));
    process.exit(1);
  }
  process.exit(0);
}

main();
