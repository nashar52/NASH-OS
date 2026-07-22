'use strict';
const fs=require('fs'); const path=require('path');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'public','index.html'),'utf8');
const js=fs.readFileSync(path.join(root,'public','app.js'),'utf8');
const css=fs.readFileSync(path.join(root,'public','styles.css'),'utf8');
const checks=[
 ['tenant context card',html.includes('tenantContextCard')],
 ['subscription card',html.includes('saasPlanCard')],
 ['workspace identity',html.includes('workspaceIdentity')],
 ['role aware nav',js.includes('const SAAS_NAV')&&js.includes('renderWorkspaceNavigation')],
 ['tenant isolation label',js.includes('tenantSlug')&&js.includes('TNT-')],
 ['mobile navigation',css.includes('.sidebar.mobile-open')],
 ['schema untouched',!js.includes('ALTER TABLE')&&!js.includes('CREATE TABLE')]
];
const failed=checks.filter(x=>!x[1]); checks.forEach(([n,ok])=>console.log(`${ok?'PASS':'FAIL'} ${n}`)); if(failed.length) process.exit(1);
console.log('HF09 SaaS shell QA PASS');
