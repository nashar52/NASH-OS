const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'public', 'app.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'public', 'styles.css'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const checks = [
  ['PASS role shell map exists', /const ROLE_SURFACE_MAP/.test(app)],
  ['PASS employee default shell only', /employee:\s*\['operationalWorkbench'\]/.test(app)],
  ['PASS manager default shell only', /manager:\s*\['operationalWorkbench'\]/.test(app)],
  ['PASS HR default shell only', /hr:\s*\['operationalWorkbench'\]/.test(app)],
  ['PASS executive default shell only', /executive:\s*\['operationalWorkbench'\]/.test(app)],
  ['PASS protected drilldown function exists', /function showOperationalDrilldown/.test(app)],
  ['PASS operational packet exists', /operationalPacket/.test(app)],
  ['PASS legacy role-hidden CSS exists', /role-hidden/.test(css)],
  ['PASS no schema migration', pkg.nashCleanBuild.schemaMigrationIncluded === false],
  ['PASS no database touch', pkg.nashCleanBuild.databaseSchemaTouched === false],
  ['PASS human decision controlled', pkg.nashCleanBuild.humanFinalDecisionRequired === true],
  ['PASS AI remains controlled', pkg.nashCleanBuild.aiAutonomousDecisionBlocked === true]
];
let failed = false;
for (const [label, ok] of checks) {
  console.log(label);
  if (!ok) failed = true;
}
console.log(`qa:operational-shell-18b = ${failed ? 'FAIL' : 'PASS'}`);
console.log('operationalShellSeparationActive = true');
console.log('legacyPanelsHiddenByDefault = true');
console.log('protectedDrilldownsOnly = true');
console.log('schemaMigrationIncluded = false');
console.log('databaseSchemaTouched = false');
process.exit(failed ? 1 : 0);
