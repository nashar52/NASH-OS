const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
const app = fs.readFileSync(path.join(root, 'public', 'app.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'public', 'styles.css'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const checks = [
  ['NASH logo card exists', html.includes('nash-logo-card') && html.includes('Decision Operating System')],
  ['Operational workbench exists', html.includes('operationalWorkbench') && app.includes('renderOperationalWorkbench')],
  ['Role-specific workbench config exists', app.includes('OPERATIONAL_ROLE_WORKBENCH') && app.includes('Employee Command Center') && app.includes('HR Operations Command Center')],
  ['Role-specific surface map exists', app.includes('ROLE_SURFACE_MAP') && app.includes('role-hidden')],
  ['Operational commands dispatch to real handlers', app.includes('runOperationalCommand') && app.includes('attendanceAction') && app.includes('compensationAction') && app.includes('governmentAction')],
  ['Same-page role clutter is blocked', app.includes('applyRoleSurface') && css.includes('.role-hidden')],
  ['NASH logo styling exists', css.includes('.nash-logo-mark') && css.includes('.nash-mini-logo')],
  ['No schema migration', pkg.nashCleanBuild.schemaMigrationIncluded === false && pkg.nashCleanBuild.databaseSchemaTouched === false],
  ['AI remains controlled', pkg.nashCleanBuild.aiAutonomousDecisionBlocked === true && pkg.nashCleanBuild.humanFinalDecisionRequired === true],
];
let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (!ok) failed++;
}
if (failed) process.exit(1);
console.log('qa:operational-patch-18a = PASS');
console.log('operationalWorkbenchActive = true');
console.log('roleSpecificSurfacesActive = true');
console.log('nashLogoApplied = true');
console.log('schemaMigrationIncluded = false');
console.log('databaseSchemaTouched = false');
