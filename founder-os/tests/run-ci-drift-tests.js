#!/usr/bin/env node
'use strict';

/**
 * Asserts .github/workflows/ci.yml's three jobs (validate-json,
 * policy-tests, shellcheck) stay in sync with scripts/local-ci --
 * documented as *the* real merge gate while GitHub Actions can't allocate
 * runners (see founder-os/AGENTS.md), so drift between what ci.yml claims
 * to check and what local-ci actually runs would be a silent gap.
 *
 * Two different strategies depending on what YAML actually allows:
 * - validate-json's file list and shellcheck's target directory both live
 *   in scripts/local-ci/jobs.json as a single source of truth, read at
 *   *runtime* by both ci.yml's `run:` block and entrypoint.sh -- for these,
 *   this test just confirms both sides are actually reading from jobs.json
 *   (not a hand-duplicated list that could silently diverge from it).
 * - policy-tests keeps its own explicit per-script steps in ci.yml (clear,
 *   individually-attributed GitHub Actions UI output) rather than looping
 *   over jobs.json the way entrypoint.sh does, since GitHub Actions can't
 *   dynamically generate steps from an external file without much heavier
 *   tooling than this warrants -- so that one is drift-*checked* instead
 *   of unified, comparing ci.yml's steps against jobs.json's
 *   policyTestsScripts exactly, in order.
 *
 * No YAML-parsing dependency -- ci.yml's structure is consistent enough
 * that plain regex extraction is reliable and avoids adding a parser just
 * for this one check.
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.join(__dirname, '..', '..');
const JOBS_JSON_PATH = path.join(REPO_ROOT, 'scripts', 'local-ci', 'jobs.json');
const CI_YML_PATH = path.join(REPO_ROOT, '.github', 'workflows', 'ci.yml');
const ENTRYPOINT_PATH = path.join(REPO_ROOT, 'scripts', 'local-ci', 'entrypoint.sh');

function extractJobSection(ciYmlContent, jobName) {
  const lines = ciYmlContent.split('\n');
  const startIdx = lines.findIndex((l) => new RegExp(`^\\s{2}${jobName}:\\s*$`).test(l));
  if (startIdx === -1) {
    throw new Error(`could not find a top-level "${jobName}:" job in .github/workflows/ci.yml`);
  }
  // The job's section ends at the next 2-space-indented top-level key (the next job).
  let endIdx = lines.length;
  for (let i = startIdx + 1; i < lines.length; i++) {
    if (/^\s{2}\S.*:\s*$/.test(lines[i])) {
      endIdx = i;
      break;
    }
  }
  return lines.slice(startIdx, endIdx).join('\n');
}

function extractPolicyTestsScripts(section) {
  const scripts = [];
  const re = /run:\s*npm run ([\w:.-]+)/g;
  let match;
  while ((match = re.exec(section)) !== null) {
    scripts.push(match[1]);
  }
  return scripts;
}

function extractShellcheckScandir(section) {
  const match = /scandir:\s*"([^"]+)"/.exec(section);
  return match ? match[1].replace(/^\.\//, '') : null;
}

function main() {
  const jobs = JSON.parse(fs.readFileSync(JOBS_JSON_PATH, 'utf8'));
  const ciYmlContent = fs.readFileSync(CI_YML_PATH, 'utf8');
  const entrypointContent = fs.readFileSync(ENTRYPOINT_PATH, 'utf8');

  let pass = 0;
  let fail = 0;
  const failures = [];

  function check(description, condition, detail) {
    if (condition) {
      pass++;
    } else {
      fail++;
      failures.push(`FAIL: ${description}${detail ? `\n  ${detail}` : ''}`);
    }
  }

  // --- policy-tests: drift-checked against jobs.json (can't be unified --
  // see module comment) ---
  const policyTestsSection = extractJobSection(ciYmlContent, 'policy-tests');
  const expectedScripts = jobs.policyTestsScripts;
  const actualScripts = extractPolicyTestsScripts(policyTestsSection);
  check(
    "ci.yml's policy-tests job steps match jobs.json's policyTestsScripts, in order",
    JSON.stringify(expectedScripts) === JSON.stringify(actualScripts),
    `expected (jobs.json): ${JSON.stringify(expectedScripts)}\n  actual   (ci.yml):    ${JSON.stringify(actualScripts)}`
  );

  // --- validate-json: unified via jobs.json (both sides read it at
  // runtime) -- confirm neither side reverted to a hand-duplicated list ---
  const validateJsonSection = extractJobSection(ciYmlContent, 'validate-json');
  check(
    "ci.yml's validate-json step reads its file list from scripts/local-ci/jobs.json's validateJsonFiles, not a hardcoded list",
    validateJsonSection.includes('scripts/local-ci/jobs.json') && validateJsonSection.includes('validateJsonFiles'),
    validateJsonSection
  );
  check(
    "entrypoint.sh's job_validate_json reads its file list from jobs.json's validateJsonFiles, not a hardcoded list",
    entrypointContent.includes('scripts/local-ci/jobs.json') &&
      /job_validate_json[\s\S]*?validateJsonFiles/.test(entrypointContent),
    'job_validate_json() in scripts/local-ci/entrypoint.sh'
  );
  check(
    'jobs.json defines validateJsonFiles as a non-empty array',
    Array.isArray(jobs.validateJsonFiles) && jobs.validateJsonFiles.length > 0
  );

  // --- shellcheck: ci.yml's `scandir:` is a static GitHub Action input
  // (can't read jobs.json at runtime the way a `run:` shell block can), so
  // this one really is drift-*checked* against jobs.json's shellcheckDir,
  // while entrypoint.sh's job_shellcheck is confirmed to read that same
  // field dynamically. ---
  const shellcheckSection = extractJobSection(ciYmlContent, 'shellcheck');
  const actualScandir = extractShellcheckScandir(shellcheckSection);
  check(
    "ci.yml's shellcheck job's scandir matches jobs.json's shellcheckDir",
    actualScandir === jobs.shellcheckDir,
    `expected (jobs.json): ${JSON.stringify(jobs.shellcheckDir)}\n  actual   (ci.yml):    ${JSON.stringify(actualScandir)}`
  );
  check(
    "entrypoint.sh's job_shellcheck reads its target directory from jobs.json's shellcheckDir, not a hardcoded path",
    /job_shellcheck[\s\S]*?shellcheckDir/.test(entrypointContent),
    'job_shellcheck() in scripts/local-ci/entrypoint.sh'
  );

  console.log(`CI/local-ci drift check: ${pass} passed, ${fail} failed, ${pass + fail} total`);
  if (failures.length > 0) {
    console.log('\n' + failures.join('\n\n'));
    process.exit(1);
  }
  process.exit(0);
}

main();
