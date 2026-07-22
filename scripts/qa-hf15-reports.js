'use strict';
const fs=require('fs'); const path=require('path');
const root=path.join(__dirname,'..');
const app=fs.readFileSync(path.join(root,'public','app.js'),'utf8');
const css=fs.readFileSync(path.join(root,'public','styles.css'),'utf8');
const pkg=require(path.join(root,'package.json'));
const checks=[
 ['reports command',app.includes('exec_reports: reportsAnalyticsCenter')],
 ['reports function',app.includes('async function reportsAnalyticsCenter()')],
 ['csv export',app.includes('downloadCsv')&&app.includes('reportExportCsv')],
 ['report receipt',app.includes('EXECUTIVE_REPORT_SNAPSHOT')],
 ['source labels',app.includes('Every visible number carries a source label')],
 ['responsive styles',css.includes('HF15 — Reports & Analytics Center')],
 ['schema untouched',pkg.nashCleanBuild.mysqlSchemaTouched===false&&pkg.nashCleanBuild.databaseDataTouched===false],
 ['package flag',pkg.nashCleanBuild.hf15ReportsAnalyticsCenterActive===true]
];
let failed=0; for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`); if(!ok) failed++;}
if(failed){console.error(`HF15 QA failed: ${failed}`); process.exit(1)} console.log('HF15 Reports & Analytics QA PASS');
