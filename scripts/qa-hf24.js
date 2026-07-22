const fs = require('fs');
const assert = require('assert');
const app = fs.readFileSync('public/app.js','utf8');
const css = fs.readFileSync('public/styles.css','utf8');
const pkg = JSON.parse(fs.readFileSync('package.json','utf8'));
const checks = [
  ['HF24 version', pkg.version.includes('hf24-unified-workspace-framework')],
  ['Unified shell renderer', app.includes('unified-workspace-shell')],
  ['Workspace breadcrumbs', app.includes('workspace-breadcrumbs')],
  ['MySQL source context', app.includes('MySQL · Live')],
  ['Role-bound action bar', app.includes('unified-action-bar')],
  ['Workspace home action', app.includes("$('workspaceHome').onclick")],
  ['Ledger action', app.includes("$('workspaceLedger').onclick")],
  ['Unified shell CSS', css.includes('HF24 — Unified Enterprise Workspace Framework')],
  ['Responsive workspace CSS', css.includes('@media(max-width:820px)')],
  ['No schema migration flag', pkg.nashCleanBuild.databaseSchemaTouched === false]
];
for (const [name, ok] of checks) { assert.ok(ok, name); console.log('PASS', name); }
console.log(`HF24 QA PASS ${checks.length}/${checks.length}`);
