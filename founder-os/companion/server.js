#!/usr/bin/env node
'use strict';

/**
 * Optional, manually-started local companion server for founder-os's
 * Session Overview screen. Off by default (settings.json's
 * companionEnabled), and never spawned by a hook -- a founder runs
 * `npm run companion:start` deliberately. Bound to 127.0.0.1 only: this is
 * a local trust boundary for one machine's own founder-os session, not a
 * network service.
 *
 * Read-only by design (see founder-os/DECISIONS.md and
 * audit/companion-ux/ARCHITECTURE.md's non-goals): this server only ever
 * relays activity that already happened -- bin/policy-check.js and
 * adapters/opencode/plugin.ts's decisions are finalized before
 * report-event.js's reportEvent() call ever reaches here. There is no
 * endpoint here that accepts a decision back, on purpose.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const { createEventBus } = require('./event-bus.js');
const { readEntries } = require('../bin/audit-log.js');
const { DEFAULT_PORT } = require('./report-event.js');

const PUBLIC_DIR = path.join(__dirname, 'public');
const SETTINGS_PATH = path.join(__dirname, '..', 'settings.json');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
};

function loadPort() {
  try {
    const settings = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8'));
    return settings.companionPort || DEFAULT_PORT;
  } catch {
    return DEFAULT_PORT;
  }
}

/**
 * One-time seed of the ring buffer from the existing (interventions-only)
 * audit log, so a browser tab opened after a server restart isn't looking
 * at an empty timeline. Tagged with source so the frontend can honestly
 * show that pre-server-start history is narrower (interventions only)
 * than live events (which include plain allows too, per report-event.js).
 */
function backfill(bus) {
  for (const entry of readEntries()) {
    bus.addEvent({ ...entry, source: 'audit-log-backfill' });
  }
}

function serveStatic(req, res) {
  const reqPath = req.url === '/' ? '/index.html' : req.url;
  const safePath = path.normalize(reqPath).replace(/^(\.\.[/\\])+/, '');
  const filePath = path.join(PUBLIC_DIR, safePath);
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

function handleEvents(req, res, bus) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  const send = (event) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };
  for (const event of bus.getHistory()) send(event);

  const unsubscribe = bus.subscribe(send);
  req.on('close', unsubscribe);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

async function handleReport(req, res, bus) {
  try {
    const raw = await readBody(req);
    const entry = JSON.parse(raw);
    bus.addEvent(entry);
    res.writeHead(204);
    res.end();
  } catch (err) {
    res.writeHead(400);
    res.end(JSON.stringify({ error: err.message }));
  }
}

/**
 * Exported (rather than only usable via `require.main`) so
 * tests/run-companion-tests.js can stand up a real server on an ephemeral
 * port without spawning a subprocess.
 */
function createServer() {
  const bus = createEventBus();
  backfill(bus);

  const server = http.createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/events') return handleEvents(req, res, bus);
    if (req.method === 'POST' && req.url === '/report') return handleReport(req, res, bus);
    if (req.method === 'GET') return serveStatic(req, res);
    res.writeHead(405);
    res.end('Method not allowed');
  });

  return { server, bus };
}

if (require.main === module) {
  const port = loadPort();
  const { server } = createServer();
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      process.stderr.write(
        `companion server: port ${port} is already in use -- is it already running? ` +
          `(set settings.json's companionPort to use a different one)\n`
      );
    } else {
      process.stderr.write(`companion server: ${err.message}\n`);
    }
    process.exit(1);
  });
  server.listen(port, '127.0.0.1', () => {
    console.log(
      `founder-os companion server: http://127.0.0.1:${port} (read-only, off by default -- see companion/README.md)`
    );
  });
}

module.exports = { createServer };
