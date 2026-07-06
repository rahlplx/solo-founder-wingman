#!/usr/bin/env node
'use strict';

/**
 * Coverage for the companion/ subsystem (event-bus.js, report-event.js,
 * server.js) and, most importantly, the load-bearing regression this
 * whole feature depends on: with settings.json's companionEnabled true
 * but no companion server actually listening, bin/policy-check.js's
 * decision/output must be byte-for-byte identical to companionEnabled
 * false, and must not hang -- see founder-os/DECISIONS.md and
 * companion/README.md for why this guarantee is the point of the feature.
 */

const { spawnSync } = require('child_process');
const http = require('http');
const net = require('net');
const fs = require('fs');
const path = require('path');

const { createEventBus, MAX_HISTORY } = require('../companion/event-bus.js');
const { reportEvent } = require('../companion/report-event.js');
const { createServer, MAX_SSE_CLIENTS, MAX_REPORT_BODY_BYTES } = require('../companion/server.js');
const AUDIT_LOG = require('../bin/audit-log.js');

const LOG_PATH = AUDIT_LOG.LOG_PATH;
const LOG_DIR = path.dirname(LOG_PATH);
const SETTINGS_PATH = path.join(__dirname, '..', 'settings.json');
const POLICY_CHECK = path.join(__dirname, '..', 'bin', 'policy-check.js');

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

// async so `await fn()` inside is safe whether fn is sync or async --
// a plain (non-async) `try { return fn(); } finally {...}` would run the
// restore logic before an async fn's body actually finishes.
async function withCleanLog(fn) {
  const existed = fs.existsSync(LOG_PATH);
  const backup = existed ? fs.readFileSync(LOG_PATH, 'utf8') : null;
  if (existed) fs.unlinkSync(LOG_PATH);
  try {
    return await fn();
  } finally {
    if (fs.existsSync(LOG_PATH)) fs.unlinkSync(LOG_PATH);
    if (existed) {
      fs.mkdirSync(LOG_DIR, { recursive: true });
      fs.writeFileSync(LOG_PATH, backup);
    } else if (fs.existsSync(LOG_DIR) && fs.readdirSync(LOG_DIR).length === 0) {
      fs.rmdirSync(LOG_DIR);
    }
  }
}

async function withSettingsOverride(overrides, fn) {
  const original = fs.readFileSync(SETTINGS_PATH, 'utf8');
  const merged = { ...JSON.parse(original), ...overrides };
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(merged, null, 2) + '\n');
  try {
    return await fn();
  } finally {
    fs.writeFileSync(SETTINGS_PATH, original);
  }
}

/** Grabs a free loopback port by binding to port 0 and releasing it
 * immediately -- good enough for a low-flakiness "nothing is listening
 * here" test port; the same trick is used to give the real server a
 * throwaway port instead of the real companionPort default (4317). */
function getFreePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.listen(0, '127.0.0.1', () => {
      const { port } = probe.address();
      probe.close((err) => (err ? reject(err) : resolve(port)));
    });
    probe.on('error', reject);
  });
}

function httpRequestJson(port, method, urlPath, body, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : undefined;
    const req = http.request(
      {
        host: '127.0.0.1',
        port,
        path: urlPath,
        method,
        headers: {
          ...(data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {}),
          ...extraHeaders,
        },
      },
      (res) => {
        let chunks = '';
        res.on('data', (c) => (chunks += c));
        res.on('end', () => resolve({ status: res.statusCode, body: chunks }));
      }
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

/** Sends a raw request body verbatim (no JSON.stringify), for testing
 * oversized-body rejection without needing a genuinely huge JS object. */
function httpRequestRaw(port, method, urlPath, rawBody, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: '127.0.0.1',
        port,
        path: urlPath,
        method,
        headers: { 'Content-Length': Buffer.byteLength(rawBody), ...extraHeaders },
      },
      (res) => {
        let chunks = '';
        res.on('data', (c) => (chunks += c));
        res.on('end', () => resolve({ status: res.statusCode, body: chunks }));
      }
    );
    req.on('error', reject);
    req.write(rawBody);
    req.end();
  });
}

/** Opens a GET /events connection and resolves once the response headers
 * arrive, without reading or closing it -- lets a test hold N connections
 * open simultaneously to exercise the concurrent-subscriber cap. */
function openSseConnection(port) {
  return new Promise((resolve, reject) => {
    const req = http.get({ host: '127.0.0.1', port, path: '/events' }, (res) => {
      res.resume(); // drain so the socket doesn't back up; we don't need the data
      resolve({ req, res });
    });
    req.on('error', reject);
  });
}

/** Reads raw `data: {...}\n\n` lines off an SSE response for a bounded
 * window, then closes the connection -- no EventSource dependency needed
 * in a test runner, consistent with how tests/run-audit-log-tests.js
 * already drives real subprocesses instead of importing test-only shims. */
function readSseEvents(port, { waitMs = 300 } = {}) {
  return new Promise((resolve, reject) => {
    const events = [];
    let buffer = '';
    const req = http.get({ host: '127.0.0.1', port, path: '/events' }, (res) => {
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        buffer += chunk;
        let idx;
        while ((idx = buffer.indexOf('\n\n')) !== -1) {
          const rawEvent = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);
          const line = rawEvent.split('\n').find((l) => l.startsWith('data: '));
          if (line) {
            try {
              events.push(JSON.parse(line.slice('data: '.length)));
            } catch {
              // ignore malformed test noise
            }
          }
        }
      });
      setTimeout(() => {
        req.destroy();
        resolve(events);
      }, waitMs);
    });
    req.on('error', (err) => {
      // Destroying the request above triggers a benign 'socket hang up' --
      // only reject if we haven't already resolved via the timeout.
      if (!req.destroyed) reject(err);
    });
  });
}

function testEventBus() {
  const bus = createEventBus();
  check('event-bus: starts with empty history', bus.getHistory().length === 0);

  bus.addEvent({ id: 1 });
  check('event-bus: addEvent grows history', bus.getHistory().length === 1);
  const firstCopy = bus.getHistory();
  const secondCopy = bus.getHistory();
  check('event-bus: getHistory returns a fresh copy each call, not the live array', firstCopy !== secondCopy);

  const received = [];
  const unsubscribe = bus.subscribe((event) => received.push(event));
  bus.addEvent({ id: 2 });
  check('event-bus: a subscriber receives newly added events', received.length === 1 && received[0].id === 2, JSON.stringify(received));

  unsubscribe();
  bus.addEvent({ id: 3 });
  check('event-bus: unsubscribe stops further delivery', received.length === 1);
  check('event-bus: history still grows after unsubscribe (bus itself is unaffected)', bus.getHistory().length === 3);

  const throwing = () => {
    throw new Error('subscriber boom');
  };
  const stillWorks = [];
  bus.subscribe(throwing);
  bus.subscribe((event) => stillWorks.push(event));
  bus.addEvent({ id: 4 });
  check('event-bus: a throwing subscriber does not break delivery to others', stillWorks.length === 1 && stillWorks[0].id === 4, JSON.stringify(stillWorks));

  const ringBuffer = createEventBus();
  for (let i = 0; i < MAX_HISTORY + 10; i++) ringBuffer.addEvent({ i });
  const history = ringBuffer.getHistory();
  check('event-bus: ring buffer caps at MAX_HISTORY', history.length === MAX_HISTORY, `got ${history.length}`);
  check('event-bus: ring buffer drops oldest events first', history[0].i === 10, `oldest kept event: ${JSON.stringify(history[0])}`);
}

async function testReportEventDisabledMakesNoRequest() {
  const port = await getFreePort();
  const { server, bus } = createServer();
  await new Promise((resolve) => server.listen(port, '127.0.0.1', resolve));
  try {
    await reportEvent({ platform: 'claude-code', tool: 'Bash', decision: 'deny' }, { companionEnabled: false, companionPort: port });
    check('report-event: companionEnabled=false never reaches a real listening server', bus.getHistory().length === 0, JSON.stringify(bus.getHistory()));

    await reportEvent({ platform: 'claude-code', tool: 'Bash', decision: 'deny' }, {});
    check('report-event: omitting companionEnabled entirely defaults to disabled (no request attempted)', bus.getHistory().length === 0);
  } finally {
    server.close();
  }
}

async function testReportEventEnabledButUnreachableResolvesQuickly() {
  const deadPort = await getFreePort(); // grabbed then released -- nothing listens here
  const start = Date.now();
  await reportEvent({ platform: 'claude-code', tool: 'Bash', decision: 'ask' }, { companionEnabled: true, companionPort: deadPort });
  const elapsed = Date.now() - start;
  check('report-event: companionEnabled=true against an unreachable port resolves (never rejects/hangs)', true);
  check('report-event: resolves quickly on ECONNREFUSED, well under the 200ms timeout ceiling', elapsed < 200, `took ${elapsed}ms`);
}

async function testReportEventEnabledWithRealServer() {
  const port = await getFreePort();
  const { server, bus } = createServer();
  await new Promise((resolve) => server.listen(port, '127.0.0.1', resolve));
  try {
    await reportEvent(
      { platform: 'opencode', tool: 'bash', decision: 'allow', ruleId: null, reason: '' },
      { companionEnabled: true, companionPort: port }
    );
    const history = bus.getHistory();
    check(
      'report-event: companionEnabled=true against a real server delivers the event',
      history.length === 1 && history[0].platform === 'opencode' && history[0].decision === 'allow',
      JSON.stringify(history)
    );
  } finally {
    server.close();
  }
}

async function testServerBackfillFromAuditLog() {
  await withCleanLog(async () => {
    AUDIT_LOG.appendEntry({ platform: 'claude-code', tool: 'Bash', decision: 'deny', ruleId: 'destructive-rm-rf', reason: '[destructive-rm-rf] danger' });
    const { server, bus } = createServer();
    try {
      const history = bus.getHistory();
      check('server: backfills from the audit log on creation', history.length === 1, JSON.stringify(history));
      check(
        'server: backfilled entries are tagged so the UI can show reduced fidelity honestly',
        history[0].source === 'audit-log-backfill' && history[0].ruleId === 'destructive-rm-rf',
        JSON.stringify(history[0])
      );
    } finally {
      server.close();
    }
  });
}

// Regression: GET /events on a server with genuinely empty history (fresh
// server, nothing reported or backfilled yet) must respond immediately --
// found while adding the concurrent-subscriber cap above. res.writeHead()
// alone doesn't flush headers to the client; Node normally batches them
// with the first res.write(), which never happens if there's no history
// to replay and no event has landed yet. Guarded with a bounded race
// rather than a bare await so a regression fails this test instead of
// hanging the whole suite.
async function testEventsRespondsWithEmptyHistory() {
  await withCleanLog(async () => {
    const port = await getFreePort();
    const { server } = createServer();
    await new Promise((resolve) => server.listen(port, '127.0.0.1', resolve));
    let conn;
    try {
      const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timed out')), 2000));
      conn = await Promise.race([openSseConnection(port), timeout]);
      check('server: GET /events responds immediately even with empty history', conn.res.statusCode === 200, conn.res.statusCode);
    } catch (err) {
      check('server: GET /events responds immediately even with empty history', false, err.message);
    } finally {
      if (conn) conn.req.destroy();
      server.close();
    }
  });
}

async function testServerHttpEndpoints() {
  const port = await getFreePort();
  const { server, token } = createServer();
  await new Promise((resolve) => server.listen(port, '127.0.0.1', resolve));
  try {
    const noTokenRes = await httpRequestJson(port, 'POST', '/report', { platform: 'claude-code', tool: 'Bash', decision: 'ask' });
    check('server: POST /report with no token responds 401', noTokenRes.status === 401, JSON.stringify(noTokenRes));

    const wrongTokenRes = await httpRequestJson(
      port,
      'POST',
      '/report',
      { platform: 'claude-code', tool: 'Bash', decision: 'ask' },
      { 'X-Founder-Os-Token': 'not-the-real-token' }
    );
    check('server: POST /report with a wrong token responds 401', wrongTokenRes.status === 401, JSON.stringify(wrongTokenRes));

    const reportRes = await httpRequestJson(
      port,
      'POST',
      '/report',
      { platform: 'claude-code', tool: 'Bash', decision: 'ask', reason: 'test' },
      { 'X-Founder-Os-Token': token }
    );
    check('server: POST /report with the correct token accepts a well-formed event', reportRes.status === 204, JSON.stringify(reportRes));

    const badReportRes = await httpRequestJson(port, 'POST', '/report', undefined, { 'X-Founder-Os-Token': token });
    check('server: POST /report with no body responds 400 rather than crashing', badReportRes.status === 400, JSON.stringify(badReportRes));

    const spoofedSourceRes = await httpRequestJson(
      port,
      'POST',
      '/report',
      { platform: 'claude-code', tool: 'Bash', decision: 'allow', source: 'audit-log-backfill' },
      { 'X-Founder-Os-Token': token }
    );
    check(
      'server: POST /report cannot spoof the "source" field the UI uses to signal backfilled provenance',
      spoofedSourceRes.status === 400,
      JSON.stringify(spoofedSourceRes)
    );

    const missingFieldsRes = await httpRequestJson(port, 'POST', '/report', { decision: 'allow' }, { 'X-Founder-Os-Token': token });
    check(
      'server: POST /report rejects an event missing required string fields',
      missingFieldsRes.status === 400,
      JSON.stringify(missingFieldsRes)
    );

    const oversizedBody = JSON.stringify({
      platform: 'claude-code',
      tool: 'Bash',
      decision: 'allow',
      reason: 'x'.repeat(MAX_REPORT_BODY_BYTES + 1),
    });
    const oversizedRes = await httpRequestRaw(port, 'POST', '/report', oversizedBody, {
      'X-Founder-Os-Token': token,
      'Content-Type': 'application/json',
    });
    check(
      'server: POST /report rejects a body over the size cap with 413',
      oversizedRes.status === 413,
      JSON.stringify(oversizedRes)
    );

    const events = await readSseEvents(port, { waitMs: 200 });
    check(
      'server: GET /events replays history (including the just-reported event) over SSE',
      events.some((e) => e.tool === 'Bash' && e.decision === 'ask'),
      JSON.stringify(events)
    );

    const indexRes = await httpRequestJson(port, 'GET', '/', undefined);
    check('server: GET / serves the static frontend', indexRes.status === 200 && indexRes.body.includes('Session Overview'), indexRes.body.slice(0, 80));
  } finally {
    server.close();
  }
}

async function testSseSubscriberCap() {
  const port = await getFreePort();
  const { server } = createServer();
  await new Promise((resolve) => server.listen(port, '127.0.0.1', resolve));
  const opened = [];
  try {
    for (let i = 0; i < MAX_SSE_CLIENTS; i++) {
      opened.push(await openSseConnection(port));
    }
    const allAccepted = opened.every(({ res }) => res.statusCode === 200);
    check(
      'server: GET /events accepts connections up to the concurrent-subscriber cap',
      allAccepted,
      JSON.stringify(opened.map(({ res }) => res.statusCode))
    );

    const overCap = await openSseConnection(port);
    opened.push(overCap);
    check(
      'server: GET /events rejects a connection beyond the concurrent-subscriber cap with 503',
      overCap.res.statusCode === 503,
      overCap.res.statusCode
    );
  } finally {
    for (const { req } of opened) req.destroy();
    server.close();
  }
}

function runPolicyCheck(payload) {
  const start = Date.now();
  const result = spawnSync(process.execPath, [POLICY_CHECK], {
    input: JSON.stringify(payload),
    encoding: 'utf8',
    cwd: path.join(__dirname, '..'),
  });
  return { stdout: result.stdout, status: result.status, elapsed: Date.now() - start };
}

async function testPolicyCheckUnaffectedWhenCompanionUnreachable() {
  await withCleanLog(async () => {
    const baseline = runPolicyCheck({ tool_name: 'Bash', tool_input: { command: 'rm -rf /' } });

    const deadPort = await getFreePort();
    const withCompanion = await withSettingsOverride({ companionEnabled: true, companionPort: deadPort }, () =>
      runPolicyCheck({ tool_name: 'Bash', tool_input: { command: 'rm -rf /' } })
    );

    check(
      'policy-check: companionEnabled=true (server unreachable) produces byte-identical stdout to companionEnabled=false',
      baseline.stdout === withCompanion.stdout,
      `baseline: ${baseline.stdout}\n      withCompanion: ${withCompanion.stdout}`
    );
    check(
      'policy-check: companionEnabled=true (server unreachable) does not hang -- completes well within a bounded time',
      withCompanion.elapsed < 2000,
      `took ${withCompanion.elapsed}ms`
    );
  });
}

async function main() {
  testEventBus();
  await testReportEventDisabledMakesNoRequest();
  await testReportEventEnabledButUnreachableResolvesQuickly();
  await testReportEventEnabledWithRealServer();
  await testServerBackfillFromAuditLog();
  await testEventsRespondsWithEmptyHistory();
  await testServerHttpEndpoints();
  await testSseSubscriberCap();
  await testPolicyCheckUnaffectedWhenCompanionUnreachable();

  console.log(`Companion server tests (event-bus.js, report-event.js, server.js): ${pass} passed, ${fail} failed, ${pass + fail} total`);
  if (failures.length > 0) {
    console.log('\n' + failures.join('\n\n'));
    process.exit(1);
  }
  process.exit(0);
}

main();
