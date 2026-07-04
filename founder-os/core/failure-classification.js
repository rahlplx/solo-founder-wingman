'use strict';

/**
 * Turns a raw error/output string into a founder-readable
 * {kind, reason, nextStep, confidence} classification -- pattern-matching
 * over common OS/network/HTTP error signatures, so a founder who can't
 * read a stack trace still gets a plain-English "what happened, what to
 * do next" instead of a raw dump. Adapted from the `classifyFailure`
 * pattern in rahlplx/vibemate's src/shared/failure-classification.ts
 * (MIT), trimmed to founder-os's actual use case: classifying
 * bin/verify-gate.sh's captured test-command output, not a general
 * network/tool-call failure taxonomy.
 *
 * Pure, I/O-free, zero dependencies -- same shape as core/policy-engine.js
 * -- so it can be required from bin/verify-gate.sh's inline `node -e`
 * calls or from a test runner without any process/fs surface of its own.
 */

const NETWORK_PATTERNS = [
  { pattern: /ECONNREFUSED/i, kind: 'network-unreachable', nextStep: 'Check that the target host is reachable and the port is open.' },
  { pattern: /ECONNRESET/i, kind: 'network-unreachable', nextStep: 'Connection was reset mid-request -- check firewall/proxy rules and retry.' },
  { pattern: /ETIMEDOUT/i, kind: 'timeout', nextStep: 'The command timed out -- check network connectivity or increase the timeout.' },
  { pattern: /ENOTFOUND|EAI_AGAIN/i, kind: 'network-unreachable', nextStep: 'DNS lookup failed -- verify the hostname/URL and DNS configuration.' },
];

const OS_PATTERNS = [
  { pattern: /ENOENT/i, kind: 'not-found', nextStep: 'A file, directory, or command was not found -- check the path or that the command is installed.' },
  { pattern: /EACCES|EPERM/i, kind: 'permission-denied', nextStep: 'Permission denied -- check file permissions or that this command can run as the current user.' },
  { pattern: /ENOSPC/i, kind: 'resource-exhausted', nextStep: 'Disk is full -- free up space and try again.' },
  { pattern: /EMFILE/i, kind: 'resource-exhausted', nextStep: 'Too many open files -- close other handles/processes and try again.' },
];

const TEST_OUTPUT_PATTERNS = [
  { pattern: /missing script[:.]?\s*["']?test/i, kind: 'not-found', nextStep: 'No test script is configured -- check package.json\'s scripts.test or founder.config.json\'s testCommand.' },
  // Two shells, two phrasings for the same "the command itself doesn't
  // exist" error: bash says "<cmd>: command not found"; dash/sh (what
  // `npm test`'s child shell actually is on most Linux systems) says
  // "sh: 1: <cmd>: not found" instead -- no literal "command" in it.
  { pattern: /command not found|^sh:\s*\d+:.*:\s*not found$/i, kind: 'not-found', nextStep: 'The test command itself isn\'t installed -- check founder.config.json\'s testCommand and that its tooling is installed.' },
];

const ALL_PATTERN_GROUPS = [NETWORK_PATTERNS, OS_PATTERNS, TEST_OUTPUT_PATTERNS];

/**
 * Tests each pattern against the message line-by-line rather than the
 * whole blob, so `reason` ends up as the one line that actually reveals
 * the cause (e.g. "Error: ENOENT: no such file...") instead of an entire
 * multi-line test-output dump -- important since founder-os's real caller
 * (bin/verify-gate.sh) passes a captured test command's full stdout/stderr,
 * often dozens of lines, only one of which is diagnostic.
 */
function matchPatterns(lines, patterns) {
  for (const { pattern, kind, nextStep } of patterns) {
    const line = lines.find((l) => pattern.test(l));
    if (line) return { kind, reason: line.trim(), nextStep, confidence: 'high' };
  }
  return null;
}

/**
 * Classifies a raw error/output string (may be multi-line). Falls through
 * network -> OS -> test-output pattern groups in that order, then a
 * low-confidence "unknown" default -- this is honest, not a forced guess:
 * a failing assertion's message won't match any of these infra-shaped
 * patterns, and saying so plainly (confidence: "low") beats fabricating a
 * specific cause.
 */
function classifyFailure(message) {
  if (typeof message !== 'string') {
    return { kind: 'unknown', reason: String(message), nextStep: 'Read the output below for the specific failure.', confidence: 'low' };
  }
  const lines = message.split('\n');
  for (const group of ALL_PATTERN_GROUPS) {
    const result = matchPatterns(lines, group);
    if (result) return result;
  }
  const firstNonEmpty = lines.find((l) => l.trim().length > 0) || message;
  return { kind: 'unknown', reason: firstNonEmpty.trim(), nextStep: 'Read the output below for the specific failure.', confidence: 'low' };
}

/**
 * One-line, founder-facing rendering of a classification, e.g.:
 * "[not-found] ENOENT: no such file... | Next: A file... was not found..."
 */
function formatFailureMessage(classification) {
  const parts = [`[${classification.kind}] ${classification.reason}`];
  parts.push(`Next: ${classification.nextStep}`);
  parts.push(`(confidence: ${classification.confidence})`);
  return parts.join(' ');
}

module.exports = { classifyFailure, formatFailureMessage };
