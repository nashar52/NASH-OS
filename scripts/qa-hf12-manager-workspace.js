'use strict';
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'public', 'app.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'public', 'styles.css'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const checks = [
  ['Manager workspace binding', app.includes('mgr_select: managerWorkspace')],
  ['Manager workspace loader', app.includes('async function managerWorkspace()')],
  ['Team directory source', app.includes("/api/employees/search?limit=20")],
  ['Task source reused', app.includes('/api/workday/tasks/${encodeURIComponent(e.id)}')],
  ['Manager evidence boundary', app.includes('managerVisibleDocuments(docsForSelectedEmployee())')],
  ['Manager workspace tabs', app.includes('data-manager-tab="work"') && app.includes('data-manager-panel="coaching"')],
  ['Manager actions role-bound', app.includes('data-manager-command="mgr_add_task"') && app.includes('data-manager-command="mgr_escalate_sla"')],
  ['Manager workspace styling', css.includes('HF12 — Manager Workspace SaaS operations') && css.includes('.manager-workspace-shell')],
  ['No schema/data mutation flags', pkg.nashCleanBuild.mysqlSchemaTouched === false && pkg.nashCleanBuild.databaseDataTouched === false]
];
const failed = checks.filter(([,ok]) => !ok);
checks.forEach(([name,ok]) => console.log(`${ok?'PASS':'FAIL'}: ${name}`));
if (failed.length) process.exit(1);
console.log('HF12 Manager Workspace QA PASS');
