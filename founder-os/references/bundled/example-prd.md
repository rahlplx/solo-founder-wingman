# ShiftEasy — Product Requirements

> Small business owners can't efficiently manage employee schedules across
> disparate tools, losing hours every week to manual scheduling.

<!--
  This is a bundled calibration example for /founding-prompt and
  /show-reference -- a filled-out instance of templates/PRD.md.tpl, not a
  real product. It exists so the agent (and the founder) can see what
  "behavior rules, not feature prose" and "explicit non-goals" actually
  look like filled in, before writing their own.
-->

## Who this is for

**Target users:** Business owners and their employees at companies with
5-50 hourly workers — retail, food service, and similar shift-based
businesses.

**The job they're hiring this product to do:** Replace a spreadsheet + group
chat scheduling process with one place to build the schedule, publish it,
and handle shift swaps — without a phone call.

## Core features (max 5 for v1 — resist adding more)

1. Owner builds next week's schedule by dragging employees onto shift slots
2. Employees view their own upcoming shifts from their phone
3. Employees request a shift swap with another employee
4. Owner approves or denies swap requests with one tap
5. Owner publishes the schedule, notifying all employees at once

## Behavior rules

- WHEN an owner drags an employee onto a shift slot THEN that shift is
  marked "unpublished" until the owner explicitly publishes the week
- WHEN an owner publishes a week THEN every employee on that schedule
  receives a notification with their shifts for the week
- WHEN an employee requests a swap THEN the target employee and the owner
  both see a pending request; the shift does not change hands until the
  owner approves it
- WHEN an owner denies a swap THEN both employees are notified with the
  reason field the owner entered, not a generic rejection

## Data model

- Users: name, phone, role (owner/employee), business_id
- Shifts: employee_id, business_id, start_time, end_time, status
  (unpublished/published/swap-pending)
- SwapRequests: shift_id, requesting_employee_id, target_employee_id,
  status (pending/approved/denied), reason

## Compliance & Regulatory Scope

- Data handled: employee names and phone numbers (PII), no payment or
  health data
- Applicable regulations: none beyond general data-privacy practice for
  v1 — single-location, US-only launch, no EU users, no payment
  processing
- Required disclosures: a basic privacy notice covering what's stored
  (name, phone) and that it's used only for scheduling/notifications
- No PCI/GDPR/HIPAA scope for v1 — revisit if the product later adds
  payroll, expands to EU businesses, or starts processing payments

## Integrations

- Supabase (database, auth)
- Twilio or similar (SMS notifications) — not yet selected, see
  `/integrate-service` when this becomes a real dependency
- Vercel (hosting)

## Success metrics

- An owner can build and publish next week's schedule in under 5 minutes
- An employee can view their shifts and request a swap in under 30 seconds
- Zero shifts change hands without explicit owner approval

## Explicitly NOT building in this version

- Payroll or hours-worked calculation — scheduling only, not payroll
- Multi-location support — single business location for v1
- Shift templates / recurring schedules — every week is built fresh in v1
- A native mobile app — mobile web only

## Status

- [ ] Owner builds schedule via drag-and-drop
- [ ] Employee views own shifts
- [ ] Employee requests swap
- [ ] Owner approves/denies swap
- [ ] Owner publishes schedule with notifications
