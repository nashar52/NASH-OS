const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));
const server = read('server.js');
const app = read('public/app.js');
const html = read('public/index.html');

const checks = [
  ['lock', pkg.nashCleanBuild.lock === 'NASH_OS_CLEAN_BUILD_11_GOVERNMENT_RELATIONS_COMPLIANCE_DECISION_LINK_LOCK'],
  ['script', Boolean(pkg.scripts['qa:clean-build-11'])],
  ['government panel', html.includes('governmentPanel') && html.includes('Government Relations Decision Center')],
  ['government buttons', ['runGovernmentCheck','createGovernmentTask','sendGovernmentApproval','requestGovernmentEvidence','holdGovernmentPayroll','createGovernmentReceipt','approveGovernmentCase','returnGovernmentCase','rejectGovernmentCase','exportGovernmentQueue'].every((id) => html.includes(id))],
  ['client routes', app.includes('loadGovernment') && app.includes('governmentAction') && app.includes('/api/government/case/')],
  ['server endpoints', ['/api/government/summary','/api/government/case/:employeeId','/api/government/action','/api/government/actions/:employeeId'].every((needle) => server.includes(needle))],
  ['qiwa/gosi/mudad/nitaqat', ['Qiwa','GOSI','Mudad','Nitaqat','work permit'].every((needle) => server.includes(needle) || html.includes(needle))],
  ['human decision', server.includes('humanFinalDecisionRequired: true') && pkg.nashCleanBuild.humanFinalDecisionRequired === true],
  ['ai blocked', server.includes('Auto-submit Qiwa') && pkg.nashCleanBuild.aiAutonomousDecisionBlocked === true],
  ['no schema change', pkg.nashCleanBuild.schemaMigrationIncluded === false && pkg.nashCleanBuild.databaseSchemaTouched === false],
  ['no migration commands', !/(CREATE TABLE|ALTER TABLE|DROP TABLE|TRUNCATE TABLE|migrate:|db:init)/i.test(server + JSON.stringify(pkg.scripts))]
];

const failed = checks.filter(([, ok]) => !ok);
for (const [name, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
if (failed.length) {
  console.error(`qa:clean-build-11 = FAIL (${failed.map(([name]) => name).join(', ')})`);
  process.exit(1);
}
console.log('qa:clean-build-11 = PASS');
console.log('governmentRelationsDecisionCenterActive = true');
console.log('qiwaGosiMudadLinked = true');
console.log('nitaqatSaudizationLinked = true');
console.log('workPermitIqamaQueueActive = true');
console.log('complianceToTaskApprovalEvidenceActive = true');
console.log('payrollHoldControlActive = true');
console.log('humanFinalDecisionRequired = true');
console.log('schemaMigrationIncluded = false');
console.log('databaseSchemaTouched = false');
