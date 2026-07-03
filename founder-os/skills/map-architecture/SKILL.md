---
name: map-architecture
description: Map a product into Pages/Database/Auth/API/Integrations blocks using the LEGO framework, then write the results into PRD.md's Data model and Integrations sections. Use after /founding-prompt and before first prototyping, and again whenever a major feature changes the data model.
---

# Map Architecture (LEGO framework)

The founder can't read an ERD or a system diagram. LEGO reframes
architecture as blocks that snap together — Pages, Database, Auth, API,
Integrations — producing one plain artifact any downstream agent
invocation can read, instead of tribal knowledge in your head.

## What to do

1. **Walk the five LEGO blocks in conversation.** Pages (what users see),
   Database (a spreadsheet in the cloud), Auth (the lock on the door), API
   (the messenger between rooms), Integrations (plug-ins) — ask what's
   needed for each, in plain terms, one block at a time.

2. **Read PRD.md first, and re-run its quality gate**
   (`node <founder-os-plugin-dir>/bin/lint-prd.js <project>/PRD.md`) before
   mapping anything — `/founding-prompt` runs this once at generation time,
   but `PRD.md` may have been hand-edited since. Don't map architecture on
   top of a PRD with unfilled placeholders or vague, non-WHEN/THEN behavior
   rules; send the founder back to fix the specific gaps it names first.
   The map must match already-committed core features and the non-goals
   list — it doesn't get to invent new scope mid-mapping.

3. **Draft the product map and read it back for confirmation** before
   writing anything, using the LEGO shape: Pages / Data / Connections /
   User flow.

4. **Write into PRD.md's `## Data model` and `## Integrations` sections**
   (the exact headers in `templates/PRD.md.tpl`) — don't fork a separate
   architecture doc that can silently drift out of sync.

5. **Cross-check integrations against reality.** For each named
   integration, confirm a real MCP server exists in `.mcp.json` or a plan
   is stated in `references/mcp-servers.md`. Hand the actual connection
   work to `/integrate-service` — this skill maps, it doesn't wire.

6. **Flag Auth explicitly.** It's the block founders skip most. Nail down
   "who can access what" concretely — e.g. row-level security — before any
   building starts, not after.

## Anti-patterns to avoid

- Letting the Database block devolve into raw SQL/schema jargon instead of
  spreadsheet-columns language the founder actually understands.
- Skipping Auth because there's no login page yet.
- Duplicating the map somewhere outside PRD.md, creating two sources of
  truth.
