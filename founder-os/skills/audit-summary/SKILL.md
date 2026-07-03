---
name: audit-summary
description: Answer "what has the safety layer actually blocked or asked about?" by reading and summarizing the audit log in plain English. Use whenever the founder asks what's been happening, after a stretch of active work, or periodically as a trust check — since the founder can't read policy.json or the hook code themselves.
---

# Audit Summary

The founder can't read `policy.json` or the hook scripts, so the only way
they can trust the safety layer is by seeing evidence of what it actually
did — not just being told "don't worry, it's handled." `bin/audit-log.js`
records every real intervention (a blocked or confirm-gated command);
this skill turns that log into something a non-technical founder can
actually read and act on.

## What to do

1. **Run the summary script**: `node founder-os/bin/audit-summary.js`
   (add `--days 7` to scope to the last week, or whatever timeframe the
   founder asked about). This prints counts by decision, the most common
   rules triggered, and the most recent entries.
2. **Translate rule ids into plain English.** The script prints raw rule
   ids like `destructive-rm-rf` or `destructive-git-force-push` — don't
   just paste those. Look up the matching rule in `founder-os/policy.json`
   (its `message` field) if the id alone isn't self-explanatory, and
   describe what actually happened in a sentence a founder would
   understand: "the agent tried to force-push over main, which was
   blocked," not "destructive-git-force-push: 1 event."
3. **If the log is empty, say so plainly** — "nothing has been blocked or
   flagged" is a real, positive answer, not a non-answer. Don't imply the
   check isn't running; the script's own empty-state message already
   makes that distinction, carry it through.
4. **Don't editorialize past the data.** If a rule triggered several
   times, report that fact — don't speculate about why without evidence
   (e.g. don't guess "the agent seems confused" from three blocks; just
   report what was blocked and let the founder ask a follow-up if they
   want more digging).

## Report format

Plain paragraphs or a short list, not a raw dump of the script's output.
Example:

```
In the last 7 days, the safety layer stepped in twice:
- Blocked an attempt to force-push over origin/main (git push --force)
- Asked for confirmation before a `git reset --hard` that would have
  discarded uncommitted work

Nothing else was flagged. Full log: founder-os/.audit/audit.log
```

## Anti-patterns to avoid

- Pasting the script's raw stdout verbatim without translating rule ids
  and reasons into plain language.
- Treating an empty log as suspicious or needing an apology — it means
  the safety layer had nothing to catch, which is the good outcome.
- Running this only when explicitly asked — proactively offering a
  summary after a long or destructive-adjacent session builds trust
  without waiting to be asked.
