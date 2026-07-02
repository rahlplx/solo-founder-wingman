---
name: security-audit
description: Audit the product against the LOCK checklist (Login secure, Only authorized access, Clean inputs, Keys hidden), cross-checked against policy.json's actually-enforced rules, not just the abstract framework. Run before any deploy (pair with /ship-checklist), monthly, and whenever /multi-model-review flags something security-critical.
---

# Security Audit (LOCK checklist)

The founder can't personally verify security. LOCK gives 4 checkable
things instead of an unanswerable "is this secure?" — but a self-reported
checklist is still vibes, so cross-check it against the policy engine
that's actually running, not just the abstract framework.

## What to do

1. **L — Login is secure.** Confirm passwords are hashed, sessions
   expire, and auth uses a real provider (e.g. Supabase Auth) rather than
   anything hand-rolled.

2. **O — Only authorized access.** Confirm row-level security actually
   exists — attempt to access another user's resource yourself and report
   the real result. Don't accept an agent's assertion that it's fine.

3. **C — Clean inputs.** Confirm validation and sanitization on every
   user-facing form and API. Reuse `/verify-path`'s Hostile case if that
   testing hasn't already happened for this feature.

4. **K — Keys are hidden.** Confirm no secrets appear in client-side code
   or in any ungitignored file.

5. **Cross-check against `policy.json`'s enforced categories** —
   `destructive_ops`, `secrets`, `prod_boundary`, `cost_sensitive`. For
   each, confirm nothing in that category slipped through before the hook
   existed or was bypassed: check whether a `secrets`-category pattern (a
   committed `.env`, a pasted live key) ever made it into the repo; check
   whether a `prod_boundary` rule like `prod-boundary-stripe-live-key`
   ever fired and was overridden without real justification.

6. **Report Red/Yellow/Green per LOCK item**, with the specific fix for
   anything not Green — matching `commands/review-code.md`'s format.

## Anti-patterns to avoid

- Accepting "the AI said it's secure" for Only-authorized-access instead
  of actually testing cross-user access yourself.
- Treating LOCK and `policy.json` as redundant — LOCK is product-level,
  `policy.json` is tool-call-level. A clean LOCK pass doesn't mean a
  `secrets` rule was never bypassed earlier in the project's history.
- Skipping this before a deploy because `/multi-model-review` Layer 3
  already ran once, earlier, on something else.
