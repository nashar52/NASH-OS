'use strict';
const fs=require('fs');
const app=fs.readFileSync('public/app.js','utf8');
const css=fs.readFileSync('public/styles.css','utf8');
const pkg=require('../package.json');
const checks=[
 ['HF32 version',pkg.version==='32.0.0-hf32-distinct-operational-apps'],
 ['attendance dedicated app',app.includes('function employeeAttendanceApp()') && app.includes('Attendance & Timesheet')],
 ['tasks dedicated app',app.includes('function employeeTasksApp()') && app.includes('Tasks & Evidence')],
 ['employee file dedicated app',app.includes('function employeeFileApp()') && app.includes('My Employee File')],
 ['performance dedicated app',app.includes('function employeePerformanceApp()') && app.includes('My Performance')],
 ['rights dedicated app',app.includes('function employeeRightsApp()') && app.includes('Rights & Reports')],
 ['HR domain apps',app.includes("hrDomainApp('performance')") && app.includes("hrDomainApp('government')") && app.includes("hrDomainApp('quality')")],
 ['old employee nav mappings replaced',app.includes('emp_checkin: employeeAttendanceApp') && app.includes('emp_tasks: employeeTasksApp') && app.includes('emp_file: employeeFileApp')],
 ['distinct app CSS',css.includes('.domain-attendance') || css.includes('.domain-app-header')],
 ['no schema change flag',pkg.nashCleanBuild.noDatabaseSchemaChangeHF32===true]
];
let pass=0; for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`); if(ok)pass++;}
console.log(`HF32 QA ${pass}/${checks.length}`); if(pass!==checks.length)process.exit(1);
