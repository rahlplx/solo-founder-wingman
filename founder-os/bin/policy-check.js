#!/usr/bin/env node
'use strict';
const fs = require('fs');
let _compiledRules = null;
const RULES = [{"id":"destructive-rm-rf","category":"destructive_ops","scope":"bash","pattern":"\\brm\\b(?=.*(?:^|\\s)(-[a-zA-Z]*[rR][a-zA-Z]*\\b|--recursive\\b))(?=.*(?:^|\\s)(-[a-zA-Z]*f[a-zA-Z]*\\b|--force\\b))","action":"block","message":"This deletes files/folders permanently with no undo. What exactly is being deleted and why?","keywords":["rm"]},{"id":"destructive-git-force-push","category":"destructive_ops","scope":"bash","pattern":"git\\s+push\\s+.*(--force(?!-with-lease)|(?<!-)-f\\b)","action":"block","message":"Force-push can overwrite remote history other people (or your future self) depend on. Use --force-with-lease if you're sure, or explain why this is safe.","keywords":["git","push"]},{"id":"destructive-git-reset-hard","category":"destructive_ops","scope":"bash","pattern":"git\\s+reset\\s+--hard","action":"confirm","message":"This discards uncommitted work with no undo. Confirm nothing important is uncommitted first.","keywords":["git","reset"]},{"id":"destructive-git-branch-delete","category":"destructive_ops","scope":"bash","pattern":"git\\s+branch\\s+-D\\b","action":"confirm","message":"Force-deleting a branch discards its commits if unmerged.","keywords":["git","branch"]},{"id":"destructive-sql-drop","category":"destructive_ops","scope":"bash","pattern":"\\bDROP\\s+(TABLE|DATABASE|SCHEMA)\\b","flags":"i","action":"block","message":"This permanently deletes a database table/schema and its data. This should almost never run outside a migration you wrote deliberately.","keywords":["DROP"]},{"id":"destructive-sql-unscoped-write","category":"destructive_ops","scope":"bash","pattern":"\\b(DELETE\\s+FROM\\s+\\w+|UPDATE\\s+\\w+\\s+SET)\\b(?!.*\\bWHERE\\b)","flags":"i","action":"confirm","message":"This UPDATE/DELETE has no WHERE clause — it will affect every row in the table. Is that intended?","keywords":["DELETE","UPDATE"]},{"id":"destructive-terraform-destroy","category":"destructive_ops","scope":"bash","pattern":"terraform\\s+destroy","action":"block","message":"This tears down real infrastructure.","keywords":["terraform","destroy"]},{"id":"destructive-k8s-delete","category":"destructive_ops","scope":"bash","pattern":"kubectl\\s+delete\\s+(namespace|-f\\s)","action":"confirm","message":"This deletes a namespace or applies a broad delete manifest.","keywords":["kubectl","delete"]},{"id":"destructive-chmod-777","category":"destructive_ops","scope":"bash","pattern":"chmod\\s+(-R\\s+)?777","action":"confirm","message":"777 makes files world-writable — usually not what you want, even to unblock something quickly.","keywords":["chmod","777"]},{"id":"secrets-read-env-to-output","category":"secrets","scope":"bash","pattern":"(cat|less|more|head|tail)\\s+.*\\.env\\b","action":"confirm","message":"This would print secret values into the chat log. Consider checking a specific key with grep instead of dumping the whole file.","keywords":[".env"]},{"id":"secrets-git-add-env","category":"secrets","scope":"bash","pattern":"git\\s+add\\s+.*\\.env(?!\\.example)","action":"block","message":".env files hold secrets and should never be committed. Add it to .gitignore instead.","keywords":[".env","git","add"]},{"id":"secrets-exfil-pattern","category":"secrets","scope":"bash","pattern":"\\b(cat|env|printenv)\\b.*(\\||;).*\\b(curl|wget|nc)\\b","action":"block","message":"This reads environment/secret values and sends them to a network destination in the same command — blocked pending explicit confirmation of what's being sent where.","keywords":["curl","wget","nc","cat","env","printenv"]},{"id":"prod-boundary-destructive-with-prod-flag","category":"prod_boundary","scope":"bash","pattern":"\\b(prod|production)\\b.*\\b(drop|delete|truncate|reset|migrate\\s+--force)\\b","flags":"i","action":"confirm","message":"This mentions something tagged production alongside a destructive-sounding word. Confirm explicitly this is actually a destructive action against production, not e.g. a commit message or unrelated command — this check is a soft keyword match, not a precise one.","keywords":["prod","production"]},{"id":"prod-boundary-stripe-live-key","category":"prod_boundary","scope":"any","pattern":"sk_live_[A-Za-z0-9]+","action":"confirm","message":"A live Stripe secret key is present. Live-mode Stripe actions move real money — confirm this is intentional, not a copy-paste from test mode.","keywords":["sk_live_"]},{"id":"cost-cloud-resource-create","category":"cost_sensitive","scope":"bash","pattern":"(aws\\s+\\w+\\s+create-|gcloud\\s+\\w+\\s+create|az\\s+\\w+\\s+create|terraform\\s+apply)","action":"confirm","message":"This provisions billed cloud infrastructure. Confirm you understand the ongoing cost before this runs.","keywords":["aws","gcloud","az","terraform"]},{"id":"cost-stripe-live-mode-toggle","category":"cost_sensitive","scope":"any","pattern":"(stripe.*live.?mode|STRIPE_MODE\\s*=\\s*[\"']?live)","flags":"i","action":"confirm","message":"Switching Stripe to live mode means real charges to real cards. Confirm this is intentional.","keywords":["stripe","STRIPE_MODE"]},{"id":"obfuscation-substitution-hides-destructive","category":"obfuscation","scope":"bash","pattern":"(\\$\\([^)]*\\b(rm|dd|mkfs|drop|truncate|delete)\\b[^)]*\\)|`[^`]*\\b(rm|dd|mkfs|drop|truncate|delete)\\b[^`]*`)","flags":"i","action":"block","message":"This hides a destructive-sounding command inside a subshell ($(...) or backticks), which is a common way to sneak a dangerous action past a simple keyword check. What does this subshell actually produce?","keywords":["$","`"]},{"id":"obfuscation-ifs-splitting","category":"obfuscation","scope":"bash","pattern":"(\\$\\{?IFS\\}?|\\bIFS\\s*=)","action":"confirm","message":"This manipulates IFS (the shell's word-separator variable), which is an unusual, rarely-legitimate way to split a command that can be used to hide its real meaning from simple pattern checks. What is this command actually doing?","keywords":["IFS"]},{"id":"obfuscation-eval","category":"obfuscation","scope":"bash","pattern":"\\beval\\b\\s","action":"confirm","message":"eval executes a dynamically-built string as a command, which this policy engine can't inspect ahead of time. What command does this actually run?","keywords":["eval"]},{"id":"obfuscation-encoded-pipe-to-shell","category":"obfuscation","scope":"bash","pattern":"(base64\\s+(-d|--decode)|xxd\\s+-r).*\\|\\s*(sh|bash|zsh|dash)\\b","flags":"i","action":"block","message":"This decodes an encoded blob and pipes it straight into a shell interpreter, which is a well-known way to run a hidden command that no simple keyword check can read in advance. What does the decoded content actually contain?","keywords":["base64","xxd"]}];

function compileRules(rules) {
  return rules.map(rule => {
    try {
      return {
        ...rule,
        re: new RegExp(rule.pattern, rule.flags || ''),
        keywords: (rule.keywords || []).map(k => k.toLowerCase())
      };
    } catch (err) {
      return null;
    }
  }).filter(Boolean);
}

function getCompiledRules() {
  if (!_compiledRules) _compiledRules = compileRules(RULES);
  return _compiledRules;
}

function readStdin() {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => (data += chunk));
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', reject);
  });
}

function extractCheckableStrings(payload) {
  const toolName = payload.tool_name || '';
  const input = payload.tool_input || {};
  const strings = [];
  if (toolName === 'Bash' && typeof input.command === 'string') {
    strings.push({ value: input.command, origin: 'bash' });
  } else if ((toolName === 'Edit' || toolName === 'Write') && typeof input.file_path === 'string') {
    strings.push({ value: input.file_path, origin: 'file' });
    if (typeof input.content === 'string') strings.push({ value: input.content, origin: 'file' });
    if (typeof input.new_string === 'string') strings.push({ value: input.new_string, origin: 'file' });
  } else if (toolName === 'MultiEdit' && typeof input.file_path === 'string') {
    strings.push({ value: input.file_path, origin: 'file' });
    if (Array.isArray(input.edits)) {
      for (const edit of input.edits) {
        if (edit && typeof edit.new_string === 'string') {
          strings.push({ value: edit.new_string, origin: 'file' });
        }
      }
    }
  }
  return strings;
}

function evaluate(rules, payload) {
  const compiledRules = rules[0] && rules[0].re ? rules : compileRules(rules);
  const strings = extractCheckableStrings(payload);
  if (strings.length === 0) return { decision: 'allow', reason: '' };
  for (const rule of compiledRules) {
    const scope = rule.scope || 'any';
    for (const { value, origin } of strings) {
      if (scope !== 'any' && scope !== origin) continue;
      if (rule.keywords && rule.keywords.length > 0) {
        const lowerValue = value.toLowerCase();
        if (!rule.keywords.some(k => lowerValue.includes(k))) continue;
      }
      if (rule.re.test(value)) {
        return { decision: rule.action === 'block' ? 'deny' : 'ask', reason: `[${rule.id}] ${rule.message}` };
      }
    }
  }
  return { decision: 'allow', reason: '' };
}

async function main() {
  const raw = await readStdin();
  try {
    const payload = JSON.parse(raw);
    const { decision, reason } = evaluate(getCompiledRules(), payload);
    process.stdout.write(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: decision,
        permissionDecisionReason: reason || '',
      },
    }));
  } catch (err) {
    process.stdout.write(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'allow',
        permissionDecisionReason: '',
      },
    }));
  }
  process.exit(0);
}

if (require.main === module) {
  main().catch(() => process.exit(0));
}

module.exports = { evaluate, extractCheckableStrings, loadPolicy: () => RULES };
