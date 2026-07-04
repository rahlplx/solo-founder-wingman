(function () {
  'use strict';

  var timeline = document.getElementById('timeline');
  var status = document.getElementById('status');

  function setStatus(state, text) {
    status.className = 'status status--' + state;
    status.textContent = text;
  }

  function decisionLabel(decision) {
    return { allow: 'Allow', ask: 'Ask', deny: 'Deny', block: 'Blocked' }[decision] || decision || 'Unknown';
  }

  function renderEvent(event) {
    var card = document.createElement('article');
    card.className = 'card card--' + (event.decision || 'allow');

    var badge = document.createElement('span');
    badge.className = 'badge';
    badge.textContent = decisionLabel(event.decision);

    var meta = document.createElement('span');
    meta.className = 'meta';
    var when = event.timestamp ? new Date(event.timestamp).toLocaleTimeString() : '';
    meta.textContent = [when, event.platform, event.tool].filter(Boolean).join(' · ');

    if (event.source === 'audit-log-backfill') {
      var tag = document.createElement('span');
      tag.className = 'tag';
      tag.textContent = 'from audit log (interventions only)';
      meta.appendChild(document.createTextNode(' '));
      meta.appendChild(tag);
    }

    card.appendChild(badge);
    card.appendChild(meta);

    if (event.reason) {
      var reason = document.createElement('p');
      reason.className = 'reason';
      reason.textContent = event.reason;
      card.appendChild(reason);
    }

    timeline.prepend(card);
  }

  function connect() {
    setStatus('connecting', 'connecting…');
    var source = new EventSource('/events');

    source.addEventListener('open', function () {
      setStatus('connected', 'connected');
    });
    source.onmessage = function (e) {
      try {
        renderEvent(JSON.parse(e.data));
      } catch (err) {
        console.error('companion: could not parse event', err);
      }
    };
    source.onerror = function () {
      setStatus('disconnected', 'disconnected — retrying…');
    };
  }

  connect();
})();
