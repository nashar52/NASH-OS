const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'public', 'app.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'public', 'styles.css'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const html = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
const checks = [
  ['HF27 version', pkg.version.includes('hf27')],
  ['HF27 feature flag', pkg.nashCleanBuild.hf27FunctionalInteractionClosureActive === true],
  ['Visible button accountability', app.includes('hf27GuardVisibleButtons')],
  ['Mutation observer coverage', app.includes('new MutationObserver')],
  ['Disabled action explanation', app.includes('aria-disabled') && app.includes('unavailable in the current workflow stage')],
  ['Empty command feedback', app.includes('is not available in this role or context')],
  ['Button audit telemetry', app.includes('hf27VisibleButtons') && app.includes('hf27DisabledButtons')],
  ['Interaction warning style', css.includes('hf27-action-warning')],
  ['No empty onclick attributes', !/onclick\s*=\s*["']\s*["']/.test(html + app)],
  ['MySQL/schema protections preserved', pkg.nashCleanBuild.sourceOfTruth === 'mysql' && pkg.nashCleanBuild.databaseSchemaTouched === false && pkg.nashCleanBuild.schemaMigrationIncluded === false]
];
let passed = 0;
for (const [name, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); if (ok) passed++; }
console.log(`HF27 QA ${passed}/${checks.length}`);
if (passed !== checks.length) process.exit(1);
