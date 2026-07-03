'use strict';

/**
 * Dependency-free, best-effort, append-only JSON-lines audit log of policy
 * decisions that actually intervened (ask/deny on Claude Code, block on
 * OpenCode) -- not plain allows, which would drown the meaningful entries
 * in noise for a log whose whole point is answering "what did the safety
 * layer actually do." Wired into both adapters' evaluate() call sites.
 *
 * Closes a real gap: this plugin's whole pitch is "the founder can't read
 * the code, so the safety layer has to be trustworthy," but before this
 * there was no durable record of what got blocked/asked over a session or
 * over time -- only ad hoc stderr lines scoped to a single hook
 * invocation, which Claude Code/OpenCode may or may not even surface.
 *
 * appendEntry() must never throw and never affect the actual policy
 * decision -- a logging failure is caught internally and only reported to
 * stderr, never propagated to the caller.
 */

const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '..', '.audit');
const LOG_PATH = path.join(LOG_DIR, 'audit.log');

/**
 * `entry`: { platform: 'claude-code'|'opencode', tool: string, decision:
 * string, ruleId?: string, reason?: string }
 */
function appendEntry(entry) {
  try {
    fs.mkdirSync(LOG_DIR, { recursive: true });
    const record = {
      timestamp: new Date().toISOString(),
      platform: entry.platform,
      tool: entry.tool,
      decision: entry.decision,
      ruleId: entry.ruleId || null,
      reason: entry.reason || '',
    };
    fs.appendFileSync(LOG_PATH, JSON.stringify(record) + '\n');
  } catch (err) {
    console.error('[founder-os] audit log write failed (non-fatal, decision unaffected):', err.message);
  }
}

/** Reads and parses every valid record in the log, oldest first. Returns
 * [] if the log doesn't exist yet or can't be read -- this is a reporting
 * convenience, not safety-critical, so it fails soft like appendEntry(). */
function readEntries() {
  try {
    const raw = fs.readFileSync(LOG_PATH, 'utf8');
    return raw
      .split('\n')
      .filter((line) => line.length > 0)
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter((record) => record !== null);
  } catch {
    return [];
  }
}

module.exports = { appendEntry, readEntries, LOG_PATH };
