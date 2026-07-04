# Component Inventory

Atomic-design tiering for the screens specified in `SRS.md`. Names follow
`NAMING-GLOSSARY.md`.

## Atoms

| Component | Purpose |
|---|---|
| `DecisionBadge` | Allow / Ask / Deny / Blocked indicator. Color-coded **plus** icon/label — never color alone (accessibility requirement in `SRS.md`). |
| `EvidenceThumbnail` | Small preview (image or log snippet) that opens the full `EvidenceViewer` on click. |
| `PersonaToggle` | Switches the active view between Founder / Collaborator / Client where a single account has multiple roles. |
| `TimestampHashRow` | Timestamp + session/agent hash, used on every card that claims "this happened" — the base unit of the trust model. |
| `SmallCTA` | Consistent primary-action button style. |

## Molecules

| Component | Composed of | Purpose |
|---|---|---|
| `TimelineCard` | `DecisionBadge` + headline + `EvidenceThumbnail` + actions | The base unit of the Session Timeline. |
| `RuleCard` | plain-English name + severity + match count | Safety Center's rule list row. |
| `EvidenceRow` | `EvidenceThumbnail` + plain-English caption + "show raw" link | Used in the Verify-Gate Viewer's evidence gallery. |
| `ShareOptions` | link generator + invite field + expiry selector | Freelancer Loop Workspace's share step. |
| `ApprovalDialog` | plain-English reason + Allow/Ask/Deny/Wait actions | The modal every policy intervention resolves through. Must expose "Show technical reason" and must write an audit entry on every resolution. |
| `InlineDiffExplain` | side-by-side diff + sticky plain-English summary of intent | Lets a Founder approve intent while a Collaborator verifies implementation, without either seeing a degraded view. |

## Organisms

| Component | Composed of | Purpose |
|---|---|---|
| `SessionTimeline` | list of `TimelineCard` + live-stream indicator + filters | Session Overview's main content. |
| `SafetyRuleDetail` | `RuleCard` + technical-detail collapsible + exception controls | Safety Center's detail panel. |
| `VerifyGatePanel` | evidence gallery (`EvidenceRow` list) + raw logs + "run tests again" | Verify-Gate / PATH Evidence Viewer. |
| `PRDMilestoneEditor` | milestone fields + risk matrix + linked tasks | Blueprint screen. |
| `FreelancerPackageBuilder` | artifact selector + summary editor + `ShareOptions` | Freelancer Loop Workspace, Founder side. |
| `AuditExplorer` | search/filter list + expanded log entry | Audit Log Explorer. |
| `CommandPalette` | NL input (Founder) + raw command input (Collaborator) + policy-preview | Global Cmd/Ctrl+K entry point. |
| `ClientReviewPortal` | single deliverable view + evidence + annotation tool | Freelancer Loop Workspace, Client side — deliberately excludes all sidebar/chrome from the rest of the app. |

## Design constraints that apply across all tiers

- Every organism that displays "what happened" must be built from atoms
  that carry a `TimestampHashRow` — provenance isn't a visual add-on, it's
  structural.
- `ApprovalDialog` must render the platform's actual decision vocabulary
  (Claude Code's ask/allow/deny vs. OpenCode's allow/block-only) — it is
  not permitted to show an "Ask" option on a platform that can't express
  one.
- `ClientReviewPortal` must be implemented as a genuinely separate layout,
  not the main app shell with panels hidden via CSS — the Client persona's
  access boundary should be structural, not cosmetic.
