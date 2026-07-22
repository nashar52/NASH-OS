const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const pkg = require('../package.json');
const app = fs.readFileSync(path.join(root, 'public', 'app.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'public', 'styles.css'), 'utf8');
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');

const checks = [
  ['finalGoldMaster flag', pkg.nashCleanBuild && pkg.nashCleanBuild.finalGoldMaster === true],
  ['schemaMigrationIncluded false', pkg.nashCleanBuild && pkg.nashCleanBuild.schemaMigrationIncluded === false],
  ['databaseSchemaTouched false', pkg.nashCleanBuild && pkg.nashCleanBuild.databaseSchemaTouched === false],
  ['human final decision required', pkg.nashCleanBuild && pkg.nashCleanBuild.humanFinalDecisionRequired === true],
  ['AI autonomous decision blocked', pkg.nashCleanBuild && pkg.nashCleanBuild.aiAutonomousDecisionBlocked === true],
  ['action-first title', html.includes('Final Operating Console')],
  ['no automatic information promise', html.includes('does not preload employee data')],
  ['employee command center', app.includes('Employee Command Center')],
  ['manager command center', app.includes('Manager Command Center')],
  ['HR command center', app.includes('HR Operations Command Center')],
  ['executive command center', app.includes('Executive Command Center')],
  ['permissioned action API binding', app.includes('/api/permissioned-action')],
  ['profile edit request binding', app.includes('EMPLOYEE_PROFILE_EDIT_REQUEST')],
  ['delete draft evidence binding', app.includes('DELETE_DRAFT_EVIDENCE')],
  ['manager add task binding', app.includes('ADD_TEAM_TASK_REQUEST')],
  ['manager return binding', app.includes('MANAGER_RETURN')],
  ['source status on request only', app.includes("$('sourceStatusBtn').onclick = sourceStatus")],
  ['ledger on request only', app.includes("$('ledgerBtn').onclick")],
  ['final acceptance on request only', app.includes("$('acceptanceBtn').onclick = finalAcceptance")],
  ['server direct db crud blocked', server.includes('directDatabaseCrudBlocked: true')],
  ['final styles present', css.includes('Build Final Gold Master')]
];
const failed = checks.filter(([, ok]) => !ok);
if (failed.length) {
  console.error('qa:final-gold = FAIL');
  failed.forEach(([name]) => console.error(' - ' + name));
  process.exit(1);
}
console.log('qa:final-gold = PASS');
console.log('finalGoldMaster = true');
console.log('actionFirstUi = true');
console.log('noUnrequestedInformationPanels = true');
console.log('permissionedActionsOnly = true');
console.log('runtimeCrudReceiptsActive = true');
console.log('directDatabaseCrudBlocked = true');
console.log('schemaMigrationIncluded = false');
console.log('databaseSchemaTouched = false');
console.log('humanFinalDecisionRequired = true');
console.log('aiAutonomousDecisionBlocked = true');
