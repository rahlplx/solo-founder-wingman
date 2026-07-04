'use strict';

/**
 * Reporter used by both adapters (bin/policy-check.js,
 * adapters/opencode/plugin.ts) to tell the optional companion server "this
 * tool call happened" -- purely observational, same contract as
 * bin/audit-log.js's appendEntry(): must never throw and must never
 * affect the actual policy decision. Unlike appendEntry() (a local disk
 * write, cheap and nearly always fast), this is a loopback network call to
 * a process that may not even be running, so every failure mode
 * (ECONNREFUSED, hang, timeout) is swallowed and resolves, never rejects.
 *
 * Must be awaited by callers, not fired-and-forgotten: bin/policy-check.js
 * calls process.exit(0) immediately inside respond(), which would kill an
 * unawaited request mid-flight before the socket write completes -- so
 * delivery would be unreliable by construction, not just occasionally
 * racy, without the await.
 */

const http = require('http');

const DEFAULT_PORT = 4317;
const TIMEOUT_MS = 200;

/**
 * entry: { platform, tool, decision, ruleId, reason, timestamp? }
 * settings: the same tolerant-defaults object each adapter already loads;
 * only companionEnabled/companionPort are read here. Reports both plain
 * allows and interventions -- a deliberately wider scope than
 * bin/audit-log.js's appendEntry(), which only logs interventions to keep
 * the durable log file meaningful. This is an ephemeral, in-memory,
 * "what is the agent doing right now" view, where allows are the point.
 */
function reportEvent(entry, settings = {}) {
  if (!settings.companionEnabled) return Promise.resolve();

  const port = settings.companionPort || DEFAULT_PORT;
  const body = JSON.stringify({ ...entry, timestamp: entry.timestamp || new Date().toISOString() });

  return new Promise((resolve) => {
    let settled = false;
    const done = () => {
      if (!settled) {
        settled = true;
        resolve();
      }
    };

    let req;
    try {
      req = http.request(
        {
          host: '127.0.0.1',
          port,
          path: '/report',
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
          timeout: TIMEOUT_MS,
        },
        (res) => {
          res.resume(); // drain, the response body carries nothing we act on
          res.on('end', done);
          res.on('error', done);
        }
      );
    } catch {
      return done();
    }

    req.on('timeout', () => {
      req.destroy();
      done();
    });
    req.on('error', done); // ECONNREFUSED (server not running), etc.

    req.write(body);
    req.end();
  });
}

module.exports = { reportEvent, DEFAULT_PORT };
