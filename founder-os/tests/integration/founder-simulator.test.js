const assert = require('assert');
const { evaluate, loadPolicy } = require('../../bin/policy-check.js');

/**
 * Integration test to simulate a "Founder" interaction.
 * We want to ensure that typical "Founder" workflows are both safe and effective.
 */

describe('Founder Integration Simulator', () => {
  const rules = loadPolicy();

  it('should allow a founder to run a safe build command', () => {
    const payload = {
      tool_name: 'Bash',
      tool_input: { command: 'npm run build' }
    };
    const { decision } = evaluate(rules, payload);
    assert.strictEqual(decision, 'allow', 'Build commands should be allowed for velocity');
  });

  it('should block a dangerous command that attempts to delete root', () => {
    const payload = {
      tool_name: 'Bash',
      tool_input: { command: 'rm -rf /' }
    };
    const { decision } = evaluate(rules, payload);
    assert.strictEqual(decision, 'block', 'Destructive root commands must be blocked');
  });

  it('should block attempt to read SSH keys', () => {
    const payload = {
      tool_name: 'Bash',
      tool_input: { command: 'cat ~/.ssh/id_rsa' }
    };
    const { decision } = evaluate(rules, payload);
    assert.strictEqual(decision, 'block', 'Sensitive file access should be blocked');
  });
});
