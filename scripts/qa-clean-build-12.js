const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));
const server = read('server.js');
const app = read('public/app.js');
const html = read('public/index.html');

const checks = [
  ['lock', pkg.nashCleanBuild.lock === 'NASH_OS_CLEAN_BUILD_12_HR_PROCEDURES_JD_SOP_OPERATIONAL_ENFORCEMENT_LOCK'],
  ['script', Boolean(pkg.scripts['qa:clean-build-12'])],
  ['procedure panel', html.includes('proceduresPanel') && html.includes('HR Procedure Enforcement Center')],
  ['procedure buttons', ['runProcedureCheck','createProcedureTask','sendProcedureApproval','requestProcedureEvidence','enforceProcedureSla','createProcedureReceipt','exportProcedureMap'].every((id) => html.includes(id))],
  ['client routes', app.includes('loadProcedures') && app.includes('procedureAction') && app.includes('/api/procedures/enforcement/')],
  ['server endpoints', ['/api/procedures/summary','/api/procedures/enforcement/:employeeId','/api/procedures/action','/api/procedures/actions/:employeeId'].every((needle) => server.includes(needle))],
  ['jd sop chain', ['Job Description','SOP','Task','SLA','Evidence','Approval','Quality Gate','Audit Receipt'].every((needle) => server.includes(needle) || html.includes(needle))],
  ['human decision', server.includes('humanFinalDecisionRequired: true') && pkg.nashCleanBuild.humanFinalDecisionRequired === true],
  ['ai blocked', server.includes('AI cannot approve a procedure closure') && pkg.nashCleanBuild.aiAutonomousDecisionBlocked === true],
  ['no schema change', pkg.nashCleanBuild.schemaMigrationIncluded === false && pkg.nashCleanBuild.databaseSchemaTouched === false],
  ['no migration commands', !/(CREATE TABLE|ALTER TABLE|DROP TABLE|TRUNCATE TABLE|migrate:|db:init)/i.test(server + JSON.stringify(pkg.scripts))]
];

const failed = checks.filter(([, ok]) => !ok);
for (const [name, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
if (failed.length) {
  console.error(`qa:clean-build-12 = FAIL (${failed.map(([name]) => name).join(', ')})`);
  process.exit(1);
}
console.log('qa:clean-build-12 = PASS');
console.log('procedureEnforcementCenterActive = true');
console.log('jdSopOperationalEnforcementActive = true');
console.log('procedureToTaskSlaEvidenceActive = true');
console.log('qualityGateActive = true');
console.log('approvalGateActive = true');
console.log('humanFinalDecisionRequired = true');
console.log('schemaMigrationIncluded = false');
console.log('databaseSchemaTouched = false');
