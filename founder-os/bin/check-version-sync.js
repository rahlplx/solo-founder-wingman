#!/usr/bin/env node
'use strict';

/**
 * Checks that the founder-os version string is identical across the 3
 * places it's independently maintained. Nothing enforced this before --
 * they currently match only by discipline, not by any check. Run from
 * CI/local-ci and via `npm run check:version-sync`.
 */

const fs = require('fs');
const path = require('path');

const PACKAGE_JSON = path.join(__dirname, '..', 'package.json');
const PLUGIN_JSON = path.join(__dirname, '..', '.claude-plugin', 'plugin.json');
const MARKETPLACE_JSON = path.join(__dirname, '..', '..', '.claude-plugin', 'marketplace.json');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function findFounderOsPluginEntry(marketplace) {
  if (!marketplace || !Array.isArray(marketplace.plugins)) {
    throw new Error(`${MARKETPLACE_JSON}: missing a "plugins" array`);
  }
  const entry = marketplace.plugins.find((p) => p && p.name === 'founder-os');
  if (!entry) {
    throw new Error(`${MARKETPLACE_JSON}: no plugin entry named "founder-os" in "plugins"`);
  }
  return entry;
}

function main() {
  const pkg = readJson(PACKAGE_JSON);
  const plugin = readJson(PLUGIN_JSON);
  const marketplace = readJson(MARKETPLACE_JSON);
  const marketplaceEntry = findFounderOsPluginEntry(marketplace);

  const versions = {
    'founder-os/package.json': pkg.version,
    'founder-os/.claude-plugin/plugin.json': plugin.version,
    '.claude-plugin/marketplace.json (plugins[founder-os].version)': marketplaceEntry.version,
  };

  const unique = new Set(Object.values(versions));

  if (unique.size > 1) {
    process.stderr.write('check-version-sync: version mismatch across founder-os config files:\n');
    for (const [where, version] of Object.entries(versions)) {
      process.stderr.write(`  - ${where}: ${JSON.stringify(version)}\n`);
    }
    process.exit(1);
  }

  process.stdout.write(`check-version-sync: all 3 files agree on version ${JSON.stringify([...unique][0])}\n`);
}

main();
