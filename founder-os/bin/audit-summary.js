#!/usr/bin/env node
'use strict';

/**
 * Reads bin/audit-log.js's log and prints a plain-English summary --
 * the companion to the audit log itself: closes the "founder can't read
 * code, so has no way to see what the safety layer actually did" gap by
 * giving a non-technical founder (or the agent, on their behalf, via the
 * /audit-summary skill) a readable answer to "what got blocked or asked
 * about recently?" without needing to open a JSON-lines file directly.
 *
 * Usage: node bin/audit-summary.js [--days N] [--json]
 */

const { readEntries, LOG_PATH } = require('./audit-log.js');

function parseArgs(argv) {
  let days = null;
  let json = false;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--days') {
      days = parseInt(argv[i + 1], 10);
      i++;
    } else if (argv[i] === '--json') {
      json = true;
    }
  }
  return { days, json };
}

function filterByDays(entries, days) {
  // days can legitimately be 0 (e.g. "--days 0"), which is falsy in JS --
  // must check for null/NaN explicitly rather than `!days`, or 0 would be
  // silently treated the same as "no filter given" instead of "filter to
  // the last 0 days" (i.e. nothing).
  if (days === null || Number.isNaN(days)) return entries;
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return entries.filter((e) => Date.parse(e.timestamp) >= cutoff);
}

function formatEntry(entry) {
  const when = entry.timestamp ? entry.timestamp.replace('T', ' ').replace(/\.\d+Z$/, ' UTC') : 'unknown time';
  const rule = entry.ruleId ? entry.ruleId : '(no specific rule)';
  return `  ${when}  [${entry.decision.padEnd(5)}]  ${entry.platform.padEnd(11)} ${entry.tool.padEnd(12)} ${rule}`;
}

function main() {
  const { days, json } = parseArgs(process.argv.slice(2));
  const allEntries = readEntries();
  const entries = filterByDays(allEntries, days);

  if (json) {
    process.stdout.write(JSON.stringify(entries, null, 2) + '\n');
    return;
  }

  const scopeLabel = days !== null && !Number.isNaN(days) ? `in the last ${days} day${days === 1 ? '' : 's'}` : 'on record';

  if (entries.length === 0) {
    console.log(`No safety interventions ${scopeLabel} (log: ${LOG_PATH}).`);
    console.log('This means nothing the agent tried needed to be blocked or confirmed -- not that the check isn\'t running.');
    return;
  }

  const byDecision = {};
  const byRule = {};
  for (const e of entries) {
    byDecision[e.decision] = (byDecision[e.decision] || 0) + 1;
    if (e.ruleId) byRule[e.ruleId] = (byRule[e.ruleId] || 0) + 1;
  }

  console.log(`Founder OS safety log summary -- ${entries.length} intervention(s) ${scopeLabel}`);
  console.log('='.repeat(60));
  for (const [decision, count] of Object.entries(byDecision)) {
    console.log(`  ${count.toString().padStart(3)}  ${decision}`);
  }

  const topRules = Object.entries(byRule).sort((a, b) => b[1] - a[1]);
  if (topRules.length > 0) {
    console.log('\nMost common rules triggered:');
    for (const [ruleId, count] of topRules.slice(0, 5)) {
      console.log(`  ${count.toString().padStart(3)}  ${ruleId}`);
    }
  }

  console.log('\nMost recent:');
  for (const e of entries.slice(-10)) {
    console.log(formatEntry(e));
  }

  console.log(`\nFull log: ${LOG_PATH}`);
}

main();
