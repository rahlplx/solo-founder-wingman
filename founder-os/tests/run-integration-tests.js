'use strict';

const fs = require('fs');
const path = require('path');
const { evaluate, loadPolicy } = require('../bin/policy-check.js');

async function runTests() {
  console.log('Running Integration Tests...');
  let pass = 0;
  let fail = 0;

  const rules = loadPolicy();

  const testCases = [
    {
      name: 'Safe build command',
      payload: { tool_name: 'Bash', tool_input: { command: 'npm run build' } },
      expected: 'allow'
    },
    {
      name: 'Destructive command (rm -rf)',
      payload: { tool_name: 'Bash', tool_input: { command: 'rm -rf /' } },
      expected: 'deny'
    },
    {
      name: 'Live Stripe Key access (Safety check)',
      payload: { tool_name: 'Bash', tool_input: { command: 'grep sk_live_123 .env' } },
      expected: 'ask'
    }
  ];

  for (const tc of testCases) {
    const { decision } = evaluate(rules, tc.payload);
    if (decision === tc.expected) {
      console.log(`✅ PASS: ${tc.name}`);
      pass++;
    } else {
      console.log(`❌ FAIL: ${tc.name} (expected ${tc.expected}, got ${decision})`);
      fail++;
    }
  }

  console.log(`\nIntegration Results: ${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
}

testTasteSkillIntegrations().then(() => testUIUXProMaxIntegrations()).then(() => testImpeccableIntegrations()).then(() => testSuperpowersIntegrations()).then(() => testOpenDesignIntegrations()).then(() => testAddySkillsIntegrations()).then(() => testVibeCodeProIntegrations()).then(() => testBKitIntegrations()).then(() => testContextEngIntegrations()).then(() => testCavemanIntegrations()).then(() => testMattPocockIntegrations()).then(() => testGStackIntegrations()).then(() => testECCIntegrations()).then(() => runTests()).catch(err => {
  console.error(err);
  process.exit(1);
});

async function testECCIntegrations() {
  console.log('\nTesting ECC Integrations...');
  const rules = loadPolicy();

  // Test: Destructive command detection (from ECC gateguard logic)
  const destructiveCases = [
    { name: 'ECC: git push --force', payload: { tool_name: 'Bash', tool_input: { command: 'git push origin main --force' } }, expected: 'deny' },
    { name: 'ECC: git reset --hard', payload: { tool_name: 'Bash', tool_input: { command: 'git reset --hard HEAD~1' } }, expected: 'ask' }
  ];

  for (const tc of destructiveCases) {
    const { decision } = evaluate(rules, tc.payload);
    if (decision === tc.expected) {
      console.log(`✅ PASS: ${tc.name}`);
    } else {
      console.log(`❌ FAIL: ${tc.name} (expected ${tc.expected}, got ${decision})`);
    }
  }
}

// Update the main run loop to include this

async function testGStackIntegrations() {
  console.log('\nTesting gstack Integrations...');
  // Verify the new skill exists
  const skillPath = path.join(__dirname, '../skills/ceo-review/SKILL.md');
  if (fs.existsSync(skillPath)) {
    console.log('✅ PASS: ceo-review skill exists');
  } else {
    console.log('❌ FAIL: ceo-review skill missing');
  }
}

// Update the main run loop call

async function testMattPocockIntegrations() {
  console.log('\nTesting Matt Pocock Integrations...');
  const skillPath = path.join(__dirname, '../skills/grill-me/SKILL.md');
  if (fs.existsSync(skillPath)) {
    console.log('✅ PASS: grill-me skill exists');
  } else {
    console.log('❌ FAIL: grill-me skill missing');
  }
}

// Update the main run loop call

async function testCavemanIntegrations() {
  console.log('\nTesting RTK Efficiency (Caveman-inspired) Integrations...');
  const skillPath = path.join(__dirname, '../skills/rtk-efficiency/SKILL.md');
  if (fs.existsSync(skillPath)) {
    console.log('✅ PASS: rtk-efficiency skill exists');
  } else {
    console.log('❌ FAIL: rtk-efficiency skill missing');
  }
}

// Update the main run loop call

async function testContextEngIntegrations() {
  console.log('\nTesting Context Engineering Integrations...');
  const skillPath = path.join(__dirname, '../skills/manage-context/SKILL.md');
  if (fs.existsSync(skillPath)) {
    console.log('✅ PASS: manage-context skill exists');
  } else {
    console.log('❌ FAIL: manage-context skill missing');
  }
}

// Update the main run loop call

async function testBKitIntegrations() {
  console.log('\nTesting bkit (PDCA) Integrations...');
  const skillPath = path.join(__dirname, '../skills/ship-checklist/SKILL.md');
  if (fs.existsSync(skillPath)) {
    console.log('✅ PASS: ship-checklist skill exists');
  } else {
    console.log('❌ FAIL: ship-checklist skill missing');
  }
}

// Update the main run loop call

async function testVibeCodeProIntegrations() {
  console.log('\nTesting vibecode-pro Integrations...');
  const skillPath = path.join(__dirname, '../skills/spec-discovery/SKILL.md');
  if (fs.existsSync(skillPath)) {
    console.log('✅ PASS: spec-discovery skill exists');
  } else {
    console.log('❌ FAIL: spec-discovery skill missing');
  }
}

// Update the main run loop call

async function testAddySkillsIntegrations() {
  console.log('\nTesting Addy Osmani Integrations...');
  const skillPath = path.join(__dirname, '../skills/git-save-points/SKILL.md');
  if (fs.existsSync(skillPath)) {
    console.log('✅ PASS: git-save-points skill exists');
  } else {
    console.log('❌ FAIL: git-save-points skill missing');
  }
}

// Update the main run loop call

async function testOpenDesignIntegrations() {
  console.log('\nTesting Open Design & Vibe-Stack Integrations...');
  const skillPath = path.join(__dirname, '../skills/map-architecture/SKILL.md');
  if (fs.existsSync(skillPath)) {
    console.log('✅ PASS: map-architecture skill exists');
  } else {
    console.log('❌ FAIL: map-architecture skill missing');
  }
}

// Update the main run loop call

async function testSuperpowersIntegrations() {
  console.log('\nTesting Superpowers Integrations...');
  const skillPath = path.join(__dirname, '../skills/brainstorming/SKILL.md');
  if (fs.existsSync(skillPath)) {
    console.log('✅ PASS: brainstorming skill exists');
  } else {
    console.log('❌ FAIL: brainstorming skill missing');
  }
}

// Update the main run loop call

async function testImpeccableIntegrations() {
  console.log('\nTesting Impeccable Integrations...');
  const skillPath = path.join(__dirname, '../skills/ui-polish/SKILL.md');
  if (fs.existsSync(skillPath)) {
    console.log('✅ PASS: ui-polish skill exists');
  } else {
    console.log('❌ FAIL: ui-polish skill missing');
  }
}

// Update the main run loop call

async function testUIUXProMaxIntegrations() {
  console.log('\nTesting UI/UX Pro Max Integrations...');
  const skillPath = path.join(__dirname, '../skills/ui-ux-design/SKILL.md');
  if (fs.existsSync(skillPath)) {
    console.log('✅ PASS: ui-ux-design skill exists');
  } else {
    console.log('❌ FAIL: ui-ux-design skill missing');
  }
}

// Update the main run loop call

async function testTasteSkillIntegrations() {
  console.log('\nTesting Taste-Skill Integrations...');
  const skillPath = path.join(__dirname, '../skills/apply-taste/SKILL.md');
  if (fs.existsSync(skillPath)) {
    console.log('✅ PASS: apply-taste skill exists');
  } else {
    console.log('❌ FAIL: apply-taste skill missing');
  }
}

// Update the main run loop call
