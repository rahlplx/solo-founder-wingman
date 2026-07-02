---
description: Review recent code for bugs, security issues, and performance problems, reported in plain English with a Red/Yellow/Green rating.
---

ROLE: Senior code reviewer and security auditor.
CONTEXT: I'm a non-technical founder and can't read code myself, so you need
to be my eyes. Review: $ARGUMENTS (if empty, review the most recent changes)

REVIEW FOR:
1. BUGS — anything that will break or behave unexpectedly?
2. SECURITY — can users access data they shouldn't? Are inputs validated?
   Are any API keys exposed client-side?
3. PERFORMANCE — will this hold up with 1,000+ users?
4. QUALITY — is this maintainable, or will it become a mess?

FORMAT: Red/Yellow/Green rating per category, plain-language explanation of
any issue found, and the specific fix — not just "this could be improved."

NOTE: this is one model reviewing its own family's output. For anything
security-critical, also run `/security-audit`. If you share code with a
different model provider, redact secrets, tokens, and any customer data
first and confirm sharing is allowed — same-family review alone tends to
miss what that family is already blind to, but that's not a reason to skip
the redaction step.
