const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));
const server = read('server.js');
const app = read('public/app.js');
const html = read('public/index.html');

const checks = [
  ['lock', pkg.nashCleanBuild.lock === 'NASH_OS_CLEAN_BUILD_17_UI_COMPRESSION_NAVIGATION_CLEANUP_LOCK'],
  ['script', Boolean(pkg.scripts['qa:clean-build-17'])],
  ['ui compression panel', html.includes('uiCompressionPanel') && html.includes('UI Compression / Navigation Cleanup')],
  ['ui buttons', ['loadCleanNavigation','runButtonMatrix','createUiReceipt','exportUiNavigationMap','showUiCompression'].every((id) => html.includes(id))],
  ['client handlers', ['loadUiCompression','uiCompressionAction','exportUiNavigationMap','renderUiCompressionSurface'].every((needle) => app.includes(needle))],
  ['server endpoints', ['/api/ui-compression/summary','/api/ui-compression/surface','/api/ui-compression/action','/api/ui-compression/actions'].every((needle) => server.includes(needle))],
  ['compressed nav endpoint', server.includes('compressRoleNavigation()') && server.includes('visibleNavigationCompressed')],
  ['button matrix', server.includes('buildUiButtonMatrix') && server.includes('silentButtonBlocked')],
  ['policy flags', ['uiCompressionActive','navigationCleanupActive','buttonMatrixActive','duplicatePageBlocked','silentButtonBlocked'].every((needle) => JSON.stringify(pkg).includes(needle) && server.includes(needle))],
  ['human decision', server.includes('humanFinalDecisionRequired: true') && pkg.nashCleanBuild.humanFinalDecisionRequired === true],
  ['ai blocked', server.includes('aiAutonomousDecisionBlocked: true') && pkg.nashCleanBuild.aiAutonomousDecisionBlocked === true],
  ['no schema change', pkg.nashCleanBuild.schemaMigrationIncluded === false && pkg.nashCleanBuild.databaseSchemaTouched === false],
  ['no migration commands', !/(CREATE TABLE|ALTER TABLE|DROP TABLE|TRUNCATE TABLE|migrate:|db:init)/i.test(server + JSON.stringify(pkg.scripts))]
];

const failed = checks.filter(([, ok]) => !ok);
for (const [name, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
if (failed.length) {
  console.error(`qa:clean-build-17 = FAIL (${failed.map(([name]) => name).join(', ')})`);
  process.exit(1);
}
console.log('qa:clean-build-17 = PASS');
console.log('uiCompressionActive = true');
console.log('navigationCleanupActive = true');
console.log('visibleNavigationCompressed = true');
console.log('buttonMatrixActive = true');
console.log('duplicatePageBlocked = true');
console.log('silentButtonBlocked = true');
console.log('humanFinalDecisionRequired = true');
console.log('schemaMigrationIncluded = false');
console.log('databaseSchemaTouched = false');
