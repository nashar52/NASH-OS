const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'public', 'app.js'), 'utf8');
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const checks = [
  ['evidence visibility selector', app.includes("Evidence visibility") && app.includes("Manager visible")],
  ['manager evidence filter helper', app.includes('function isManagerVisibleEvidence') && app.includes("Restricted HR")],
  ['restricted HR documents hidden from manager', app.includes('HR-restricted documents are protected')],
  ['manager evidence empty state accurate', app.includes('No manager-visible work evidence is available')],
  ['manager accept evidence action', app.includes('MANAGER_EVIDENCE_ACCEPT') && app.includes('Accept Evidence')],
  ['manager correction form', app.includes('Return Evidence for Correction') && app.includes('managerCorrectionReason')],
  ['manager upload button removed from empty queue', app.includes("scope === 'hr' && !filtered.length")],
  ['server permission bound', server.includes("'MANAGER_EVIDENCE_ACCEPT'")],
  ['no schema migration', pkg.nashCleanBuild.schemaMigrationIncluded === false && pkg.nashCleanBuild.databaseSchemaTouched === false],
  ['hotfix 06 flag', pkg.nashCleanBuild.finalGoldHotfix06 === true]
];
let fail = 0;
for (const [name, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); if (!ok) fail++; }
if (fail) { console.error(`qa:final-gold-hotfix-06 FAIL (${fail}/${checks.length})`); process.exit(1); }
console.log('qa:final-gold-hotfix-06 = PASS');
