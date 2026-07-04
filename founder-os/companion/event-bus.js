'use strict';

/**
 * Pure in-memory pub/sub for the companion server's live activity stream.
 * No I/O -- unit-testable the same way core/policy-engine.js is. Bounded
 * ring buffer so a long session can't grow this without limit; oldest
 * events are dropped once MAX_HISTORY is exceeded.
 */

const MAX_HISTORY = 500;

function createEventBus() {
  const history = [];
  const subscribers = new Set();

  function addEvent(event) {
    history.push(event);
    if (history.length > MAX_HISTORY) history.shift();
    for (const send of subscribers) {
      try {
        send(event);
      } catch {
        // A subscriber that throws (e.g. a response stream that's already
        // closed) must never break delivery to the others -- the caller
        // is responsible for unsubscribing on close, this is just a guard.
      }
    }
  }

  function getHistory() {
    return history.slice();
  }

  function subscribe(send) {
    subscribers.add(send);
    return () => subscribers.delete(send);
  }

  return { addEvent, getHistory, subscribe };
}

module.exports = { createEventBus, MAX_HISTORY };
