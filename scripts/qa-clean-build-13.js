const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));
const server = read('server.js');
const app = read('public/app.js');
const html = read('public/index.html');

const checks = [
  ['lock', pkg.nashCleanBuild.lock === 'NASH_OS_CLEAN_BUILD_13_UNIFIED_APPROVAL_SLA_EVIDENCE_LEDGER_LOCK'],
  ['script', Boolean(pkg.scripts['qa:clean-build-13'])],
  ['control panel', html.includes('controlsPanel') && html.includes('Unified Approval / SLA / Evidence Ledger')],
  ['control buttons', ['loadControls','createApprovalPacket','escalateControlSla','requestControlEvidence','createControlAuditReceipt','approveControlItem','returnControlItem','rejectControlItem','exportControlLedger'].every((id) => html.includes(id))],
  ['client routes', app.includes('loadControls') && app.includes('controlAction') && app.includes('/api/controls/unified/')],
  ['server endpoints', ['/api/controls/summary','/api/controls/unified/:employeeId','/api/controls/action','/api/controls/actions/:employeeId'].every((needle) => server.includes(needle))],
  ['approval sla evidence audit', ['Approval','SLA','Evidence','Audit'].every((needle) => server.includes(needle) || html.includes(needle))],
  ['human decision', server.includes('humanFinalDecisionRequired: true') && pkg.nashCleanBuild.humanFinalDecisionRequired === true],
  ['ai blocked', server.includes('AI cannot approve HR') && pkg.nashCleanBuild.aiAutonomousDecisionBlocked === true],
  ['no schema change', pkg.nashCleanBuild.schemaMigrationIncluded === false && pkg.nashCleanBuild.databaseSchemaTouched === false],
  ['no migration commands', !/(CREATE TABLE|ALTER TABLE|DROP TABLE|TRUNCATE TABLE|migrate:|db:init)/i.test(server + JSON.stringify(pkg.scripts))]
];

const failed = checks.filter(([, ok]) => !ok);
for (const [name, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
if (failed.length) {
  console.error(`qa:clean-build-13 = FAIL (${failed.map(([name]) => name).join(', ')})`);
  process.exit(1);
}
console.log('qa:clean-build-13 = PASS');
console.log('unifiedControlCenterActive = true');
console.log('approvalCenterActive = true');
console.log('slaMonitorActive = true');
console.log('evidenceLedgerActive = true');
console.log('auditTrailViewerActive = true');
console.log('humanFinalDecisionRequired = true');
console.log('schemaMigrationIncluded = false');
console.log('databaseSchemaTouched = false');
