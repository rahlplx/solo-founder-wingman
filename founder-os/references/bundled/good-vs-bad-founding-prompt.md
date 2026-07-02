# Good vs. Bad Founding Prompt

A bundled calibration example for `/founding-prompt` — showing why the
BRIEF framework's structure matters, using the same scheduling-app example
as `example-prd.md` for continuity. Not a real product.

## Bad: feature list, no problem, no behavior

> Build me an app with a dashboard, a calendar, a user table, and
> notifications.

What's wrong with this: no problem statement (dashboard for what?), no
target user, no behavior rules (what happens when X?), no non-goals (so
scope grows unchecked), no success metric (so "done" is undefined). An
agent given this will confidently build *something* — just not
necessarily the thing that solves anyone's actual problem, and there's no
non-goals list to point to when it starts adding features nobody asked
for.

## Good: BRIEF, filled in

> **Background** — Small business owners can't efficiently manage
> employee schedules across disparate tools, losing hours every week. This
> is for owners and employees at 5-50 person hourly businesses.
>
> **Role** — Act as a senior full-stack developer working with Supabase
> and Vercel.
>
> **Instructions** — Build the core loop: owner drags employees onto shift
> slots, publishes the week, employees view shifts and request swaps,
> owner approves/denies. Nothing else for v1.
>
> **Examples** — Reference: an existing scheduling tool's swap-request flow
> (screenshot attached) — I like that the swap request shows both
> employees' names side by side; I don't want its cluttered notification
> settings page.
>
> **Format** — Data model: Users, Shifts, SwapRequests (see
> `example-prd.md` for the full shape). Success metric: an owner can build
> and publish a week's schedule in under 5 minutes.

What changed: every one of the vague words in the bad version got replaced
with something checkable. "A calendar" became a specific behavior rule
(drag employee onto slot → unpublished until explicitly published). "For
whom" got answered specifically enough to guide design decisions. The
Examples section applied the SHOW method (Sample, Highlight, Omit, Want)
instead of just attaching a screenshot and hoping the agent infers the
right parts to copy.

## The test

If you can't turn a sentence from the founder's prompt into a WHEN/THEN
behavior rule or a concrete non-goal, it's not ready for `/founding-prompt`
to generate PRD.md yet — go back and ask one more clarifying question
first.
