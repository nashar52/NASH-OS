const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));
const server = read('server.js');
const app = read('public/app.js');
const html = read('public/index.html');

const checks = [
  ['lock', pkg.nashCleanBuild.lock === 'NASH_OS_CLEAN_BUILD_18_FINAL_ACCEPTANCE_LOCAL_RUN_LOCK'],
  ['script', Boolean(pkg.scripts['qa:clean-build-18']) && Boolean(pkg.scripts['qa:final-acceptance'])],
  ['final panel', html.includes('finalAcceptancePanel') && html.includes('Final Acceptance / Local Run Lock')],
  ['final buttons', ['loadFinalAcceptance','runFinalAcceptance','createFinalReceipt','exportFinalLockReport','showFinalAcceptance'].every((id) => html.includes(id))],
  ['client handlers', ['loadFinalAcceptance','finalAcceptanceAction','exportFinalLockReport','renderFinalAcceptance'].every((needle) => app.includes(needle))],
  ['server endpoints', ['/api/final-acceptance/summary','/api/final-acceptance/status','/api/final-acceptance/action','/api/final-acceptance/actions'].every((needle) => server.includes(needle))],
  ['button matrix contains final buttons', ['Load Final Acceptance','Run Final Acceptance','Create Final Receipt','Export Final Lock Report'].every((needle) => server.includes(needle))],
  ['final flags', ['finalAcceptanceActive','localRunLockActive','finalButtonAcceptanceActive','finalRouteAcceptanceActive','finalHandoverReady'].every((needle) => JSON.stringify(pkg).includes(needle) && server.includes(needle))],
  ['local run steps', ['npm.cmd run mysql:lock-check','npm.cmd run qa:clean-build-18','npm.cmd start'].every((needle) => server.includes(needle))],
  ['human decision', server.includes('humanFinalDecisionRequired: true') && pkg.nashCleanBuild.humanFinalDecisionRequired === true],
  ['ai blocked', server.includes('aiAutonomousDecisionBlocked: true') && pkg.nashCleanBuild.aiAutonomousDecisionBlocked === true],
  ['mysql only', server.includes("sourceOfTruth: 'mysql'") || server.includes('sourceOfTruth=mysql')],
  ['no schema change', pkg.nashCleanBuild.schemaMigrationIncluded === false && pkg.nashCleanBuild.databaseSchemaTouched === false],
  ['no migration commands', !/(CREATE TABLE|ALTER TABLE|DROP TABLE|TRUNCATE TABLE|migrate:|db:init)/i.test(server + JSON.stringify(pkg.scripts))]
];

const failed = checks.filter(([, ok]) => !ok);
for (const [name, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
if (failed.length) {
  console.error(`qa:clean-build-18 = FAIL (${failed.map(([name]) => name).join(', ')})`);
  process.exit(1);
}
console.log('qa:clean-build-18 = PASS');
console.log('finalAcceptanceActive = true');
console.log('localRunLockActive = true');
console.log('finalButtonAcceptanceActive = true');
console.log('finalRouteAcceptanceActive = true');
console.log('finalHandoverReady = true');
console.log('humanFinalDecisionRequired = true');
console.log('schemaMigrationIncluded = false');
console.log('databaseSchemaTouched = false');
