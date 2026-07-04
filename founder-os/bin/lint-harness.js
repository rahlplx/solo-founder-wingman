#!/usr/bin/env node
'use strict';

/**
 * Structural health check for the harness itself: every skill/agent/command
 * markdown file has the frontmatter and sections every other one of its
 * kind has, and every policy.json rule's category is one from the known
 * set -- not enforced anywhere before this, so a copy-paste mistake (wrong
 * `name:` in frontmatter, a missing `## Report format` section, a typo'd
 * rule category) would only ever be caught by a human noticing, if at all.
 *
 * Adapted from ll-vibekit's structural-linter idea, but to this project's
 * actual frontmatter-YAML + `## Heading` conventions -- not ll-vibekit's
 * own heading-based ones, which don't apply here.
 *
 * No YAML dependency: frontmatter here is always flat `key: value` lines
 * between two `---` markers, so a plain line-based parser is reliable and
 * avoids adding a parser for this one check (same reasoning as
 * tests/run-ci-drift-tests.js's regex-based ci.yml extraction).
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.join(__dirname, '..');
const SKILLS_DIR = path.join(REPO_ROOT, 'skills');
const AGENTS_DIR = path.join(REPO_ROOT, 'agents');
const COMMANDS_DIR = path.join(REPO_ROOT, 'commands');
const POLICY_PATH = path.join(REPO_ROOT, 'policy.json');

// Curated, not auto-derived from policy.json's current contents -- the
// point is to catch a typo'd or accidental new category, so adding a
// legitimate new one is a deliberate one-line edit here, not silent.
const KNOWN_POLICY_CATEGORIES = new Set(['destructive_ops', 'secrets', 'prod_boundary', 'cost_sensitive', 'obfuscation']);

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

function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;
  const fields = {};
  for (const line of match[1].split('\n')) {
    // Hyphenated keys (argument-hint, allowed-tools) must match here --
    // [A-Za-z0-9_]+ alone would silently never capture them.
    const fieldMatch = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (fieldMatch) fields[fieldMatch[1]] = fieldMatch[2].trim();
  }
  return fields;
}

function hasSection(content, heading) {
  const re = new RegExp(`^##\\s+${heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'm');
  return re.test(content);
}

function lintSkills() {
  const dirs = fs.readdirSync(SKILLS_DIR, { withFileTypes: true }).filter((d) => d.isDirectory());
  for (const dir of dirs) {
    const skillPath = path.join(SKILLS_DIR, dir.name, 'SKILL.md');
    check(`skills/${dir.name}: has a SKILL.md`, fs.existsSync(skillPath));
    if (!fs.existsSync(skillPath)) continue;

    const entries = fs.readdirSync(path.join(SKILLS_DIR, dir.name));
    check(
      `skills/${dir.name}: contains only SKILL.md`,
      entries.length === 1 && entries[0] === 'SKILL.md',
      `found: ${entries.join(', ')}`
    );

    const content = fs.readFileSync(skillPath, 'utf8');
    const fm = parseFrontmatter(content);
    check(`skills/${dir.name}/SKILL.md: has frontmatter`, fm !== null);
    if (!fm) continue;

    check(`skills/${dir.name}/SKILL.md: frontmatter has a non-empty name`, !!fm.name);
    check(`skills/${dir.name}/SKILL.md: frontmatter has a non-empty description`, !!fm.description);
    check(
      `skills/${dir.name}/SKILL.md: frontmatter name matches its directory name`,
      fm.name === dir.name,
      `frontmatter name="${fm.name}", directory="${dir.name}"`
    );
    check(`skills/${dir.name}/SKILL.md: has an H1 title`, /^#\s+\S/m.test(content));
    check(`skills/${dir.name}/SKILL.md: has a "## What to do" section`, hasSection(content, 'What to do'));
  }
}

function lintAgents() {
  const files = fs.readdirSync(AGENTS_DIR).filter((f) => f.endsWith('.md'));
  check('agents/: has at least one agent file', files.length > 0);
  for (const file of files) {
    const agentName = file.replace(/\.md$/, '');
    const content = fs.readFileSync(path.join(AGENTS_DIR, file), 'utf8');
    const fm = parseFrontmatter(content);
    check(`agents/${file}: has frontmatter`, fm !== null);
    if (!fm) continue;

    check(`agents/${file}: frontmatter has a non-empty name`, !!fm.name);
    check(`agents/${file}: frontmatter has a non-empty description`, !!fm.description);
    check(`agents/${file}: frontmatter has a non-empty tools list`, !!fm.tools);
    check(
      `agents/${file}: frontmatter name matches its filename`,
      fm.name === agentName,
      `frontmatter name="${fm.name}", filename="${agentName}"`
    );
    check(`agents/${file}: has a "## Report format" section`, hasSection(content, 'Report format'));
    check(`agents/${file}: has a "## What NOT to do" section`, hasSection(content, 'What NOT to do'));
    for (const field of ['VERDICT:', 'FINDINGS:', 'RECOMMENDATION:', 'CONFIDENCE:']) {
      check(`agents/${file}: standardized output contract includes ${field}`, content.includes(field));
    }
  }
}

function lintCommands() {
  const files = fs.readdirSync(COMMANDS_DIR).filter((f) => f.endsWith('.md'));
  check('commands/: has at least one command file', files.length > 0);
  for (const file of files) {
    const content = fs.readFileSync(path.join(COMMANDS_DIR, file), 'utf8');
    const fm = parseFrontmatter(content);
    check(`commands/${file}: has frontmatter`, fm !== null);
    if (!fm) continue;

    check(`commands/${file}: frontmatter has a non-empty description`, !!fm.description);
    check(`commands/${file}: frontmatter has a non-empty argument-hint`, !!fm['argument-hint']);
    check(`commands/${file}: frontmatter has a non-empty allowed-tools`, !!fm['allowed-tools']);
  }
}

function lintPolicyCategories() {
  const { rules } = JSON.parse(fs.readFileSync(POLICY_PATH, 'utf8'));
  for (const rule of rules) {
    check(
      `policy.json rule "${rule.id}": category "${rule.category}" is a known category`,
      KNOWN_POLICY_CATEGORIES.has(rule.category),
      `known categories: ${[...KNOWN_POLICY_CATEGORIES].join(', ')}`
    );
  }
}

function main() {
  lintSkills();
  lintAgents();
  lintCommands();
  lintPolicyCategories();

  console.log(`Harness structural health lint: ${pass} passed, ${fail} failed, ${pass + fail} total`);
  if (failures.length > 0) {
    console.log('\n' + failures.join('\n\n'));
    process.exit(1);
  }
  process.exit(0);
}

main();
