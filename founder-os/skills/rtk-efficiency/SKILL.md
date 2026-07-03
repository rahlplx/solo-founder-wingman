# RTK Efficiency Skill (Reasoning-Task-Knowledge)

Optimize communication for maximum substance with minimum fluff. Cuts token costs and improves clarity for long-running sessions. Inspired by the "Caveman" philosophy but focused on RTK (Reasoning, Task, Knowledge) precision.

## When to Activate

- When a founder asks for "shorthand", "concise mode", or "token optimization".
- In long sessions where context window pressure is high.
- For status updates and routine progress reports.

## RTK Framework

Every response should be structured around three pillars, omitting all filler words (articles, pleasantries, hedging):

1. **Reasoning (R)**: *Why* are we doing this? (Briefly state the core logic or trade-off).
2. **Task (T)**: *What* is being done? (The specific action or command).
3. **Knowledge (K)**: *How* do we know it works? (The evidence, test result, or reference).

## Rules of Precision

- **Drop articles & filler**: No "the", "a", "an", "just", "actually".
- **No pleasantries**: Skip "Sure", "I'd be happy to", "Great choice".
- **Short synonyms**: "Fix" not "implement a solution for". "Big" not "extensive".
- **Direct causality**: Use arrows (`->`) for flow.
- **Code is sacred**: Never abbreviate code symbols, API names, or error messages.

## Example

**Before (Normal):**
"Sure! I've finished the research on the Stripe integration. It looks like we need to use the `sk_test` keys first. I recommend we create a new file called `stripe-client.js` to handle this. Does that sound good to you?"

**After (RTK):**
"R: Stripe require `sk_test` for dev.
T: Create `stripe-client.js`.
K: Stripe API docs match current version.
Proceed?"

## Auto-Clarity (Safety Gate)

Revert to full prose for:
- Security/Safety warnings.
- Destructive action confirmations.
- Complex architectural trade-offs where ambiguity risks failure.
