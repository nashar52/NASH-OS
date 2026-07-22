const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'public', 'app.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'public', 'styles.css'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const checks = [
  ['Final Gold Hotfix 02 flag exists', pkg.nashCleanBuild.finalGoldHotfix02 === true],
  ['Action ledger summarized flag exists', pkg.nashCleanBuild.actionLedgerSummarized === true],
  ['Context selection ledger noise blocked', pkg.nashCleanBuild.contextSelectionLedgerNoiseBlocked === true],
  ['Operational receipt filter exists', /function operationalReceipts\(\)/.test(app)],
  ['Context receipt filter exists', /function isContextReceipt\(r\)/.test(app)],
  ['Employee context selection does not call addReceipt', !/addReceipt\(\{ actionType: 'SELECT_EMPLOYEE_CONTEXT'/.test(app)],
  ['Task context selection does not call addReceipt', !/addReceipt\(\{ actionType: 'SELECT_TASK_CONTEXT'/.test(app)],
  ['Business receipt card exists', /business-receipt/.test(app)],
  ['Ledger summary exists', /function ledgerSummary\(receipts\)/.test(app)],
  ['Raw JSON hidden behind technical trace', /<details class="technical-trace">/.test(app)],
  ['Executive receipt CSS exists', /Final Gold Hotfix 02/.test(css) && /\.ledger-summary/.test(css) && /\.business-receipt/.test(css)],
  ['No schema migration', pkg.nashCleanBuild.schemaMigrationIncluded === false && pkg.nashCleanBuild.databaseSchemaTouched === false],
  ['Direct database CRUD remains blocked', pkg.nashCleanBuild.directDatabaseCrudBlocked === true],
  ['Human decision remains required', pkg.nashCleanBuild.humanFinalDecisionRequired === true]
];
let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (!ok) failed += 1;
}
console.log(`qa:final-gold-hotfix-02 ${failed ? 'FAIL' : 'PASS'} (${checks.length - failed}/${checks.length})`);
if (failed) process.exit(1);
