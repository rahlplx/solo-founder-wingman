#!/usr/bin/env node
'use strict';

/**
 * Hand-rolled, zero-dependency validator for policy.json's shape.
 *
 * This exists to catch a real bug class: a malformed rule (e.g. a typo'd
 * "patttern" field, leaving "pattern" undefined) used to pass straight
 * through to `new RegExp(rule.pattern, ...)` uncaught. `new
 * RegExp(undefined)` does NOT throw -- it silently compiles to `/(?:)/`,
 * which matches every string, including the empty string. Combined with
 * `"action": "block"`, a single typo like that would deny every Bash/Edit/
 * Write call with no warning from anywhere (CI only checked `JSON.parse`,
 * not the rule shape). validateRule()'s universal-match-sentinel check
 * below is the actual fix for that bug class, not just a presence check.
 *
 * Benchmarked against an ajv-based equivalent (validate-policy-schema.ajv.js)
 * via scripts/bench-schema-validators.js -- see founder-os/DECISIONS.md for
 * which one actually ended up wired into the loaders in bin/policy-check.js
 * and adapters/opencode/plugin.ts.
 */

const REQUIRED_RULE_FIELDS = ['id', 'category', 'pattern', 'action', 'message'];
const VALID_ACTIONS = ['block', 'confirm'];
const VALID_SCOPES = ['bash', 'any'];
const VALID_FLAG_CHARS = /^[gimsuy]*$/;
const ID_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// Strings no legitimate destructive/secrets/prod-boundary rule should ever
// match. A rule matching any of these is almost certainly a bug (an
// accidentally-universal or near-universal pattern), not an intentionally
// broad one -- real rules require specific literal content to be present.
const UNIVERSAL_MATCH_SENTINELS = [
  '',
  ' ',
  'qzxjkvbwplhgfd',
  'the quick brown fox jumps over the lazy dog',
];

function validatePolicyDocument(doc) {
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) {
    return ['policy.json root must be an object'];
  }

  const errors = [];

  if (typeof doc.version !== 'string' || !/^\d+\.\d+\.\d+$/.test(doc.version)) {
    errors.push(`"version" must be a semver string (got: ${JSON.stringify(doc.version)})`);
  }

  if (!Array.isArray(doc.rules) || doc.rules.length === 0) {
    errors.push('"rules" must be a non-empty array');
    return errors;
  }

  const seenIds = new Set();
  doc.rules.forEach((rule, i) => {
    errors.push(...validateRule(rule, i, seenIds));
  });

  return errors;
}

function validateRule(rule, index, seenIds) {
  const errors = [];
  const where = `rules[${index}]${rule && typeof rule.id === 'string' ? ` (${rule.id})` : ''}`;

  if (!rule || typeof rule !== 'object' || Array.isArray(rule)) {
    return [`${where}: must be an object`];
  }

  for (const field of REQUIRED_RULE_FIELDS) {
    if (typeof rule[field] !== 'string' || rule[field].length === 0) {
      errors.push(`${where}: missing or empty required field "${field}"`);
    }
  }

  if (typeof rule.id === 'string') {
    if (!ID_PATTERN.test(rule.id)) {
      errors.push(`${where}: "id" must be lowercase-kebab-case (got: ${JSON.stringify(rule.id)})`);
    }
    if (seenIds) {
      if (seenIds.has(rule.id)) {
        errors.push(`${where}: duplicate rule id "${rule.id}"`);
      }
      seenIds.add(rule.id);
    }
  }

  if (rule.scope !== undefined && !VALID_SCOPES.includes(rule.scope)) {
    errors.push(`${where}: "scope" must be one of ${VALID_SCOPES.join('/')} (got: ${JSON.stringify(rule.scope)})`);
  }

  if (rule.action !== undefined && !VALID_ACTIONS.includes(rule.action)) {
    errors.push(`${where}: "action" must be one of ${VALID_ACTIONS.join('/')} (got: ${JSON.stringify(rule.action)})`);
  }

  if (rule.flags !== undefined && (typeof rule.flags !== 'string' || !VALID_FLAG_CHARS.test(rule.flags))) {
    errors.push(`${where}: "flags" must only contain valid RegExp flag characters (got: ${JSON.stringify(rule.flags)})`);
  }

  if (rule.keywords !== undefined) {
    const bad = !Array.isArray(rule.keywords) || rule.keywords.some((k) => typeof k !== 'string' || k.length === 0);
    if (bad) {
      errors.push(`${where}: "keywords" must be an array of non-empty strings`);
    }
  }

  if (typeof rule.pattern === 'string' && rule.pattern.length > 0) {
    let re;
    try {
      re = new RegExp(rule.pattern, typeof rule.flags === 'string' ? rule.flags : '');
    } catch (err) {
      errors.push(`${where}: "pattern" does not compile as a valid RegExp: ${err.message}`);
      return errors;
    }
    for (const sentinel of UNIVERSAL_MATCH_SENTINELS) {
      if (re.test(sentinel)) {
        errors.push(
          `${where}: "pattern" matches the sentinel string ${JSON.stringify(sentinel)} -- ` +
            'this is almost certainly a bug (e.g. a typo\'d field compiling to an empty or ' +
            'near-universal regex) rather than an intentionally broad rule. A real destructive-action ' +
            'rule should never match arbitrary/empty input.'
        );
        break;
      }
    }
  }

  return errors;
}

module.exports = { validatePolicyDocument, validateRule, UNIVERSAL_MATCH_SENTINELS };

if (require.main === module) {
  const fs = require('fs');
  const path = require('path');
  const target = process.argv[2] || path.join(__dirname, '..', 'policy.json');
  const raw = fs.readFileSync(target, 'utf8');
  const doc = JSON.parse(raw);
  const errors = validatePolicyDocument(doc);
  if (errors.length > 0) {
    process.stderr.write(`validate-policy-schema: ${errors.length} error(s) in ${target}:\n`);
    for (const e of errors) process.stderr.write(`  - ${e}\n`);
    process.exit(1);
  }
  process.stdout.write(`validate-policy-schema: ${target} is valid (${doc.rules.length} rules)\n`);
}
