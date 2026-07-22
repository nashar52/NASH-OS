const fs=require('fs');
const app=fs.readFileSync('public/app.js','utf8');
const css=fs.readFileSync('public/styles.css','utf8');
const pkg=require('../package.json');
const checks=[
['HF31 version',pkg.version==='31.0.0-hf31-enterprise-employee-workspace'],
['Employee digital twin flag',pkg.nashOs?.employeeDigitalTwinWorkspaceActive===true],
['Employment tab',app.includes('data-e360-tab="employment"')&&app.includes('data-e360-panel="employment"')],
['Attendance and leave tabs',app.includes('data-e360-panel="attendance"')&&app.includes('data-e360-panel="leave"')],
['Payroll and government tabs',app.includes('data-e360-panel="payroll"')&&app.includes('data-e360-panel="government"')],
['Assets and approvals',app.includes('data-e360-panel="assets"')&&app.includes('data-e360-panel="approvals"')],
['Timeline and ledger',app.includes('data-e360-panel="timeline"')&&app.includes('data-e360-panel="ledger"')],
['Human decision boundary',app.includes('Human owner only')&&app.includes('No direct silent master-data mutation')],
['HF31 responsive CSS',css.includes('HF31 — Enterprise Employee Workspace')&&css.includes('.hf31-action-grid')],
['No schema change flag',pkg.nashOs?.noDatabaseSchemaChangeHF31===true]
];
let pass=0;for(const [n,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${n}`);if(ok)pass++;}
console.log(`HF31 QA ${pass}/${checks.length}`);process.exit(pass===checks.length?0:1);
