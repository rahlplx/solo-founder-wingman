#!/usr/bin/env node
'use strict';

/**
 * Syntax-checks every .js file in this repo via `node --check` (a real
 * bug catcher, not theater -- this is exactly how the bench-schema-
 * validators.js apostrophe bug and the bin/audit-summary.js --days-0
 * bug's siblings would get caught before landing). No new dependency;
 * tsc --noEmit already covers the .ts files separately.
 */

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.join(__dirname, '..', '..');
const EXCLUDED_DIRS = new Set(['node_modules', '.git', '.audit']);

function findJsFiles(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (EXCLUDED_DIRS.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findJsFiles(fullPath, out);
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      out.push(fullPath);
    }
  }
  return out;
}

function main() {
  const files = findJsFiles(REPO_ROOT, []);
  let failed = 0;

  for (const file of files) {
    try {
      execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
    } catch (err) {
      failed++;
      console.error(`SYNTAX ERROR: ${path.relative(REPO_ROOT, file)}`);
      console.error(err.stderr ? err.stderr.toString() : err.message);
    }
  }

  console.log(`check-js-syntax: ${files.length - failed}/${files.length} files OK`);
  if (failed > 0) process.exit(1);
}

main();
