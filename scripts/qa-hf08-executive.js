'use strict';
const fs=require('fs');
const app=fs.readFileSync('public/app.js','utf8');
const css=fs.readFileSync('public/styles.css','utf8');
const pkg=require('../package.json');
const checks=[['command',app.includes("exec_dashboard: executiveDashboard")],['renderer',app.includes('async function executiveDashboard()')],['endpoint',app.includes("/api/executive/dashboard")],['receipt',app.includes("/api/executive/action")],['styles',css.includes('HF08 — Executive Dashboard rebuild')],['schema untouched',pkg.nashCleanBuild.mysqlSchemaTouched===false],['data untouched',pkg.nashCleanBuild.databaseDataTouched===false]];
const failed=checks.filter(x=>!x[1]); checks.forEach(x=>console.log(`${x[1]?'PASS':'FAIL'} ${x[0]}`)); if(failed.length) process.exit(1);
