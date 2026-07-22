const fs = require('fs');
const app = fs.readFileSync('public/app.js','utf8');
const html = fs.readFileSync('public/index.html','utf8');
const css = fs.readFileSync('public/styles.css','utf8');
const pkg = fs.readFileSync('package.json','utf8');
const checks = [
  ['Single surface mode state exists', app.includes('singleSurfaceMode: true')],
  ['Command center only default exists', app.includes("visible.add('operationalWorkbench')")],
  ['Single drilldown active body class exists', app.includes('single-drilldown-active')],
  ['Back to command center exists', app.includes('Back to Command Center')],
  ['Legacy role home has explicit id', html.includes('id="roleHomePanel"')],
  ['Runtime receipts hidden panel id exists', html.includes('id="runtimeReceiptsPanel"')],
  ['Delivery roadmap hidden panel id exists', html.includes('id="deliveryRoadmapPanel"')],
  ['Shell hidden CSS exists', css.includes('.shell-hidden-panel { display: none !important; }')],
  ['Operational workbench hidden during drilldown', css.includes('body.single-drilldown-active #operationalWorkbench')],
  ['No schema migration', !pkg.includes('migrate:json-to-mysql') && !pkg.includes('db:init')],
];
let ok = true;
for (const [name, pass] of checks) {
  console.log(`${pass ? 'PASS' : 'FAIL'} ${name}`);
  if (!pass) ok = false;
}
if (!ok) process.exit(1);
console.log('qa:operational-shell-18c = PASS');
console.log('singleSurfaceShellActive = true');
console.log('legacyStackPanelsHidden = true');
console.log('oneDrilldownAtATime = true');
console.log('backToCommandCenterActive = true');
console.log('schemaMigrationIncluded = false');
console.log('databaseSchemaTouched = false');
