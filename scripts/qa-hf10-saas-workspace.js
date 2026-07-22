'use strict';
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'public', 'app.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'public', 'styles.css'), 'utf8');
const pkg = require(path.join(root, 'package.json'));
const checks = [
  ['SaaS title', html.includes('Enterprise HR AI SaaS Workspace')],
  ['Workspace home', app.includes('renderProductWorkspace') && app.includes('WORKSPACE_HOME')],
  ['Role priorities', app.includes('Needs your attention')],
  ['AI copilot', app.includes('Decision Copilot')],
  ['Quick actions', app.includes('quick-action-grid')],
  ['Command preservation', app.includes('role.commands.map(commandCard)')],
  ['SaaS styles', css.includes('HF10 — Enterprise SaaS product workspace')],
  ['No schema touch', pkg.nashCleanBuild.mysqlSchemaTouched === false && pkg.nashCleanBuild.databaseDataTouched === false]
];
const failed = checks.filter(([,ok]) => !ok);
checks.forEach(([name,ok]) => console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`));
if (failed.length) process.exit(1);
console.log('HF10 SaaS workspace QA PASS');
