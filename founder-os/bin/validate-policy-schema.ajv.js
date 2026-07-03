#!/usr/bin/env node
'use strict';

/**
 * ajv-based benchmark competitor to validate-policy-schema.js -- see
 * scripts/bench-schema-validators.js and founder-os/DECISIONS.md.
 *
 * Uses schema/policy.schema.json for shape/enum validation (the part ajv
 * is actually built for), then reuses the same universal-match-sentinel
 * check from validate-policy-schema.js for the semantic "does this pattern
 * accidentally match everything" check -- ajv's JSON Schema validation
 * alone can't express that, so without this the two validators wouldn't
 * actually be catching the same bug class, and the benchmark wouldn't be a
 * fair comparison of the two *shape-validation* approaches.
 *
 * Not wired into bin/policy-check.js or adapters/opencode/plugin.ts unless
 * the benchmark shows it should be -- see founder-os/DECISIONS.md.
 */

const Ajv = require('ajv');
const { UNIVERSAL_MATCH_SENTINELS } = require('./validate-policy-schema.js');

const ajv = new Ajv({ allErrors: true, strict: true });

function loadSchema() {
  const fs = require('fs');
  const path = require('path');
  const schemaPath = path.join(__dirname, '..', 'schema', 'policy.schema.json');
  return JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
}

const validateSchema = ajv.compile(loadSchema());

function validatePolicyDocument(doc) {
  const errors = [];

  const valid = validateSchema(doc);
  if (!valid) {
    for (const err of validateSchema.errors) {
      errors.push(`${err.instancePath || '(root)'}: ${err.message} (${JSON.stringify(err.params)})`);
    }
  }

  if (doc && Array.isArray(doc.rules)) {
    const seenIds = new Set();
    doc.rules.forEach((rule, i) => {
      if (!rule || typeof rule !== 'object') return;
      const where = `rules[${i}]${typeof rule.id === 'string' ? ` (${rule.id})` : ''}`;

      if (typeof rule.id === 'string') {
        if (seenIds.has(rule.id)) {
          errors.push(`${where}: duplicate rule id "${rule.id}"`);
        }
        seenIds.add(rule.id);
      }

      if (typeof rule.pattern === 'string' && rule.pattern.length > 0) {
        let re;
        try {
          re = new RegExp(rule.pattern, typeof rule.flags === 'string' ? rule.flags : '');
        } catch (err) {
          errors.push(`${where}: "pattern" does not compile as a valid RegExp: ${err.message}`);
          return;
        }
        for (const sentinel of UNIVERSAL_MATCH_SENTINELS) {
          if (re.test(sentinel)) {
            errors.push(`${where}: "pattern" matches the sentinel string ${JSON.stringify(sentinel)}`);
            break;
          }
        }
      }
    });
  }

  return errors;
}

module.exports = { validatePolicyDocument };

if (require.main === module) {
  const fs = require('fs');
  const path = require('path');
  const target = process.argv[2] || path.join(__dirname, '..', 'policy.json');
  const raw = fs.readFileSync(target, 'utf8');
  const doc = JSON.parse(raw);
  const errors = validatePolicyDocument(doc);
  if (errors.length > 0) {
    process.stderr.write(`validate-policy-schema.ajv: ${errors.length} error(s) in ${target}:\n`);
    for (const e of errors) process.stderr.write(`  - ${e}\n`);
    process.exit(1);
  }
  process.stdout.write(`validate-policy-schema.ajv: ${target} is valid (${doc.rules.length} rules)\n`);
}
