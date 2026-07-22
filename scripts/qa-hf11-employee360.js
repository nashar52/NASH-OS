'use strict';
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'public', 'app.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'public', 'styles.css'), 'utf8');
const checks = [
  ['Employee 360 binding', app.includes('hr_file: employee360Workspace')],
  ['Employee 360 loader', app.includes('async function employee360Workspace()')],
  ['Existing APIs reused', app.includes('/api/performance/evaluation/') && app.includes('/api/training/plan/') && app.includes('/api/ai/radar/')],
  ['Role-bound actions', app.includes('data-e360-command')],
  ['Tabbed employee workspace', app.includes('data-e360-tab="overview"') && app.includes('data-e360-panel="documents"')],
  ['Employee 360 styling', css.includes('HF11 — Employee 360 SaaS workspace') && css.includes('.employee360-shell')]
];
const failed = checks.filter(([,ok]) => !ok);
checks.forEach(([name,ok]) => console.log(`${ok?'PASS':'FAIL'}: ${name}`));
if (failed.length) process.exit(1);
console.log('HF11 Employee 360 QA PASS');
