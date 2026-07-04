# companion/ — optional, off-by-default Session Overview server

A local, read-only web dashboard over a founder-os session: a live feed of
policy decisions (allow/ask/deny/block) as they happen, plus backfilled
history from `.audit/audit.log`.

**Never a required link in founder-os's safety chain.** If this server
isn't running, or `settings.json`'s `companionEnabled` is `false` (the
shipped default), `bin/policy-check.js` and `adapters/opencode/plugin.ts`
behave exactly as they do without this directory existing at all — see
`founder-os/DECISIONS.md` and `audit/companion-ux/ARCHITECTURE.md` for the
reasoning.

**Read-only, permanently, by design** — this does not let you approve or
deny a paused action from the browser, and won't grow that feature later.
A browser-driven approval loop was considered and deliberately rejected;
see `audit/companion-ux/USER-FLOWS.md` for why.

## Usage

1. In `founder-os/settings.json`, set `"companionEnabled": true`.
2. `npm run companion:start` (from `founder-os/`).
3. Open `http://127.0.0.1:4317` (or whatever `companionPort` is set to).

Stopping the server (Ctrl+C) has no effect on founder-os's actual safety
behavior — the next tool call just goes back to reporting to nowhere,
silently, exactly as when the feature is disabled.

## How it works

- `server.js` — a plain `http.createServer`, bound to `127.0.0.1` only.
  `GET /events` is a Server-Sent Events stream (`EventSource` on the
  frontend, `companion/public/app.js`); `POST /report` is the ingestion
  endpoint both adapters call via `report-event.js`.
- `event-bus.js` — pure in-memory ring buffer (last 500 events) +
  pub/sub, no I/O.
- `report-event.js` — shared by `bin/policy-check.js` and
  `adapters/opencode/plugin.ts`; bounded timeout (~200ms), never throws or
  rejects, matching `bin/audit-log.js`'s `appendEntry()`'s "cannot affect
  the decision" contract.
- On startup, the event bus is backfilled once from `bin/audit-log.js`'s
  `readEntries()` — but that log only ever contains interventions (not
  plain allows), so backfilled history is narrower than live events going
  forward. Backfilled entries are tagged `source: "audit-log-backfill"` so
  the UI can say so honestly rather than implying equal fidelity.

No new runtime dependency: Server-Sent Events over Node's built-in `http`
module, not WebSocket/`ws` — see `DECISIONS.md`.
