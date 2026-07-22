const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'public', 'app.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'public', 'styles.css'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const checks = [
  ['HF29 version', pkg.version.includes('hf29-performance-responsive-runtime')],
  ['HF29 feature flag', pkg.nashCleanBuild.hf29PerformanceResponsiveRuntimeActive === true],
  ['Batched mutation audit', app.includes('hf29ScheduleWorkspaceAudit') && app.includes('requestAnimationFrame')],
  ['Render telemetry', app.includes('hf29RecordRenderMetric') && app.includes('__NASH_PERFORMANCE__')],
  ['Lazy asset loading', app.includes("img.loading = 'lazy'") && app.includes("img.decoding = 'async'")],
  ['Debounce utility', app.includes('function hf29Debounce')],
  ['Viewport telemetry', app.includes('hf29Viewport')],
  ['Content visibility', css.includes('content-visibility:auto')],
  ['Responsive hardening', css.includes('@media(max-width:560px)')],
  ['No DB schema change', pkg.nashCleanBuild.noDatabaseSchemaChangeHF29 === true]
];
let pass = 0;
for (const [name, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`); if (ok) pass++; }
console.log(`HF29 QA: ${pass}/${checks.length}`);
if (pass !== checks.length) process.exit(1);
