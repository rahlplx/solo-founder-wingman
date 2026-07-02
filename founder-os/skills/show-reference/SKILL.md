---
name: show-reference
description: Calibrate the agent's output using founder-provided visual references (screenshots, competitor flows, brand examples) via the SHOW method (Sample, Highlight, Omit, Want), rather than describing desired output in words alone. Use whenever a founder has or can get a reference, before /add-page or other UI work.
---

# Show (SHOW method)

Founders can't describe visual design precisely in words, but a picture
without structure is just as useless — "make it like this" leaves you
guessing which part they mean. Showing beats telling only when the image
comes with Sample/Highlight/Omit/Want attached.

## What to do

1. **Locate the founder's own references first.** Check `/references/` at
   the project root for `ui-inspiration/`, `competitor-flows/`,
   `brand-examples/`, `data-samples/`, `error-screenshots/`. If the folder
   or subfolders don't exist yet, create them now and tell the founder
   what belongs in each one for next time.

2. **Fall back to bundled calibration examples.** Check the plugin's
   `references/bundled/` for generic before/after pairs. This directory
   may be empty — if so, say so plainly and proceed with SHOW using words
   only. Never block on missing assets.

3. **Sample** — pin down one concrete "what good looks like" example, not
   a vague adjective like "modern" or "clean."

4. **Highlight** — ask, or infer and then confirm, exactly what's good
   about the sample: one layout choice, one component, a tone — not "make
   it like this" wholesale.

5. **Omit** — explicitly ask what NOT to copy. Competitor references
   almost always carry unwanted baggage (their pricing, their nav, their
   copy) that shouldn't come along for the ride.

6. **Want** — state the concrete deltas using the founder's own content
   (tiers, copy, features from PRD.md), build to that spec, and note in
   the response which parts came from the reference versus the founder's
   own material.

## Anti-patterns to avoid

- Replicating a raw reference image indiscriminately, with no
  Highlight/Omit/Want applied on top of it.
- Fabricating a reference that doesn't exist instead of asking the founder
  or proceeding word-only.
- Assuming `references/bundled/` is populated without actually checking.
