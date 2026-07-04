#!/usr/bin/env node
'use strict';

/**
 * Quality gate for a founder's generated PRD.md, run by /founding-prompt
 * right after generating it and again by /map-architecture before
 * building on top of it. Same concept as ll-vibekit's eval-prp.py gate,
 * adapted to founder-os's actual templates/PRD.md.tpl shape rather than
 * ll-vibekit's PRP shape.
 *
 * Catches the two most common ways a PRD.md ends up too thin to build
 * from: leftover {{PLACEHOLDER}} tokens (the founder rushed through
 * /founding-prompt and some fields never got filled in) and a required
 * section that's present but empty, especially "Behavior rules" left as
 * vague feature prose instead of an actual WHEN/THEN statement -- the
 * exact distinction /founding-prompt's own instructions push for.
 *
 * Takes the PRD path as its one CLI argument, unlike bin/scan-secrets.js
 * etc. which always operate on this repo's own tree -- this operates on a
 * document generated into the *founder's* project, so there's no fixed
 * default location to fall back to.
 */

const fs = require('fs');
const path = require('path');

// The exact section headers in templates/PRD.md.tpl, in order. Matched by
// startsWith so "Core features (max 5 for v1 -- resist adding more)"
// still matches on "Core features".
const REQUIRED_SECTIONS = [
  'Who this is for',
  'Core features',
  'Behavior rules',
  'Data model',
  'Compliance & Regulatory Scope',
  'Integrations',
  'Success metrics',
  'Explicitly NOT building in this version',
  'Status',
];

function findSection(lines, heading) {
  const startIdx = lines.findIndex((l) => /^##\s+/.test(l) && l.replace(/^##\s+/, '').trim().startsWith(heading));
  if (startIdx === -1) return null;
  let endIdx = lines.length;
  for (let i = startIdx + 1; i < lines.length; i++) {
    if (/^##\s+/.test(lines[i])) {
      endIdx = i;
      break;
    }
  }
  return { startIdx, endIdx, body: lines.slice(startIdx + 1, endIdx).join('\n') };
}

function lintPrd(content) {
  const findings = [];
  const lines = content.split('\n');

  const placeholderMatches = content.match(/\{\{[A-Z0-9_]+\}\}/g);
  if (placeholderMatches) {
    findings.push(
      `${placeholderMatches.length} unfilled placeholder(s) remain: ${[...new Set(placeholderMatches)].join(', ')}`
    );
  }

  for (const heading of REQUIRED_SECTIONS) {
    const section = findSection(lines, heading);
    if (!section) {
      findings.push(`missing required section: "## ${heading}"`);
      continue;
    }
    const meaningfulBody = section.body
      .split('\n')
      .filter((l) => l.trim() && !l.trim().startsWith('<!--') && !l.trim().startsWith('-->'))
      .join('\n')
      .trim();
    if (!meaningfulBody) {
      findings.push(`section "## ${heading}" is present but empty`);
    }
  }

  // Behavior rules should have at least one real WHEN/THEN line, not just
  // the template's own instructional prose or vague feature descriptions.
  const behaviorSection = findSection(lines, 'Behavior rules');
  if (behaviorSection) {
    const whenThenLines = behaviorSection.body.split('\n').filter((l) => /^\s*-\s*WHEN\b.*\bTHEN\b/i.test(l));
    if (whenThenLines.length === 0) {
      findings.push(
        '"## Behavior rules" has no WHEN/THEN-formatted rule -- vague feature prose instead of exact behavior'
      );
    }
  }

  return findings;
}

function main() {
  const prdPath = process.argv[2];
  if (!prdPath) {
    console.error('Usage: lint-prd.js <path-to-PRD.md>');
    process.exit(2);
  }
  if (!fs.existsSync(prdPath)) {
    console.error(`lint-prd: ${prdPath} does not exist`);
    process.exit(2);
  }

  const content = fs.readFileSync(prdPath, 'utf8');
  const findings = lintPrd(content);

  if (findings.length === 0) {
    console.log(`lint-prd: ${path.relative(process.cwd(), prdPath)} passes the PRD quality gate.`);
    process.exit(0);
  }

  console.error(`lint-prd: ${path.relative(process.cwd(), prdPath)} failed the PRD quality gate (${findings.length} issue(s)):`);
  for (const finding of findings) {
    console.error(`  - ${finding}`);
  }
  process.exit(1);
}

main();
