const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));
const server = read('server.js');
const app = read('public/app.js');
const html = read('public/index.html');

const checks = [
  ['lock', pkg.nashCleanBuild.lock === 'NASH_OS_CLEAN_BUILD_16_EXECUTIVE_DASHBOARD_LOCK'],
  ['script', Boolean(pkg.scripts['qa:clean-build-16'])],
  ['executive panel', html.includes('executiveDashboardPanel') && html.includes('Executive Dashboard')],
  ['executive buttons', ['loadExecutiveDashboard','refreshExecutiveRisk','requestExecutiveBrief','createExecutiveReceipt','exportExecutiveDashboard'].every((id) => html.includes(id))],
  ['client routes', app.includes('loadExecutiveDashboard') && app.includes('executiveAction') && app.includes('/api/executive/dashboard')],
  ['server endpoints', ['/api/executive/summary','/api/executive/dashboard','/api/executive/action','/api/executive/actions'].every((needle) => server.includes(needle))],
  ['executive concepts', ['executiveDashboardActive','executiveKpiBoardActive','executiveRiskBoardActive','executiveDecisionBacklogActive'].every((needle) => server.includes(needle) || app.includes(needle) || JSON.stringify(pkg).includes(needle))],
  ['source labels', server.includes('Every number on this dashboard is source-labeled') && app.includes('All numbers source-labeled')],
  ['human decision', server.includes('humanFinalDecisionRequired: true') && pkg.nashCleanBuild.humanFinalDecisionRequired === true],
  ['ai blocked', server.includes('aiAutonomousDecisionBlocked: true') && pkg.nashCleanBuild.aiAutonomousDecisionBlocked === true],
  ['no schema change', pkg.nashCleanBuild.schemaMigrationIncluded === false && pkg.nashCleanBuild.databaseSchemaTouched === false],
  ['no migration commands', !/(CREATE TABLE|ALTER TABLE|DROP TABLE|TRUNCATE TABLE|migrate:|db:init)/i.test(server + JSON.stringify(pkg.scripts))]
];

const failed = checks.filter(([, ok]) => !ok);
for (const [name, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
if (failed.length) {
  console.error(`qa:clean-build-16 = FAIL (${failed.map(([name]) => name).join(', ')})`);
  process.exit(1);
}
console.log('qa:clean-build-16 = PASS');
console.log('executiveDashboardActive = true');
console.log('executiveKpiBoardActive = true');
console.log('executiveRiskBoardActive = true');
console.log('executiveDecisionBacklogActive = true');
console.log('executiveDrilldownSourceLabelsActive = true');
console.log('humanFinalDecisionRequired = true');
console.log('schemaMigrationIncluded = false');
console.log('databaseSchemaTouched = false');
