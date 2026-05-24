#!/usr/bin/env node
/**
 * Install all service and frontend dependencies independently.
 * Run from repo root: node scripts/install-all.js
 */
const { execSync } = require('child_process');
const path = require('path');

const packages = [
  'frontend',
  'services/api-gateway',
  'services/auth-service',
  'services/collaboration-service',
  'services/websocket-service',
  'services/ai-service',
  'services/execution-service',
  'services/analytics-service',
  'services/notification-service',
  'services/history-service',
];

const root = path.join(__dirname, '..');

for (const pkg of packages) {
  const dir = path.join(root, pkg);
  console.log(`\n📦 Installing ${pkg}...`);
  try {
    execSync('npm install --legacy-peer-deps', { cwd: dir, stdio: 'inherit' });
    console.log(`✅ ${pkg} done`);
  } catch (err) {
    console.error(`❌ ${pkg} failed:`, err.message);
  }
}
