const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'public', 'app.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'public', 'styles.css'), 'utf8');
const pkg = require(path.join(root, 'package.json'));
const checks = [
  ['HF25 version', pkg.version.includes('hf25-closed-loop-operational-workflows')],
  ['Workflow configuration', app.includes('function workflowConfig(title)')],
  ['Workflow rail renderer', app.includes('function workflowRail(title)')],
  ['Workflow binding', app.includes('function bindWorkflowRail()')],
  ['Rail inserted into operations', app.includes('${workflowRail(title)}')],
  ['Human accountability boundary', app.includes('Human accountability retained')],
  ['Evidence closure rule', app.includes('Evidence required at closure')],
  ['Receipt navigation', app.includes("command === 'workspace_ledger'")],
  ['Workflow styling', css.includes('HF25 — Closed-loop operational workflow framework')],
  ['No schema migration', pkg.nashCleanBuild.databaseSchemaTouched === false && pkg.nashCleanBuild.mysqlSchemaTouched === false]
];
let failed = 0;
for (const [name, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); if (!ok) failed++; }
console.log(`HF25 QA ${checks.length-failed}/${checks.length}`);
process.exit(failed ? 1 : 0);
