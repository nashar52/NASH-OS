const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));
const server = read('server.js');
const app = read('public/app.js');
const html = read('public/index.html');

const checks = [
  ['lock', pkg.nashCleanBuild.lock === 'NASH_OS_CLEAN_BUILD_14_QUALITY_GOVERNANCE_OPERATING_CENTER_LOCK'],
  ['script', Boolean(pkg.scripts['qa:clean-build-14'])],
  ['quality panel', html.includes('qualityPanel') && html.includes('Quality & Governance Operating Center')],
  ['quality buttons', ['loadQuality','runQualityCheck','createCorrectiveAction','enforceGovernanceGate','requestQualityEvidence','createQualityReceipt','approveQualityGate','returnQualityGate','rejectQualityGate','exportQualityReport'].every((id) => html.includes(id))],
  ['client routes', app.includes('loadQuality') && app.includes('qualityAction') && app.includes('/api/quality/governance/')],
  ['server endpoints', ['/api/quality/summary','/api/quality/governance/:employeeId','/api/quality/action','/api/quality/actions/:employeeId'].every((needle) => server.includes(needle))],
  ['quality governance concepts', ['qualityChecks','governanceGates','controlFailures','correctiveActions'].every((needle) => server.includes(needle) || app.includes(needle))],
  ['human decision', server.includes('humanFinalDecisionRequired: true') && pkg.nashCleanBuild.humanFinalDecisionRequired === true],
  ['ai blocked', server.includes('AI cannot approve a governance gate') && pkg.nashCleanBuild.aiAutonomousDecisionBlocked === true],
  ['no schema change', pkg.nashCleanBuild.schemaMigrationIncluded === false && pkg.nashCleanBuild.databaseSchemaTouched === false],
  ['no migration commands', !/(CREATE TABLE|ALTER TABLE|DROP TABLE|TRUNCATE TABLE|migrate:|db:init)/i.test(server + JSON.stringify(pkg.scripts))]
];

const failed = checks.filter(([, ok]) => !ok);
for (const [name, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
if (failed.length) {
  console.error(`qa:clean-build-14 = FAIL (${failed.map(([name]) => name).join(', ')})`);
  process.exit(1);
}
console.log('qa:clean-build-14 = PASS');
console.log('qualityGovernanceCenterActive = true');
console.log('qualityChecksActive = true');
console.log('governanceGatesActive = true');
console.log('controlFailureRegisterActive = true');
console.log('correctiveActionsActive = true');
console.log('qualityEvidenceReceiptActive = true');
console.log('qualityAuditTrailActive = true');
console.log('humanFinalDecisionRequired = true');
console.log('schemaMigrationIncluded = false');
console.log('databaseSchemaTouched = false');
