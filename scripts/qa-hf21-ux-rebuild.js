const fs=require('fs'); const path=require('path');
const root=path.join(__dirname,'..');
const app=fs.readFileSync(path.join(root,'public','app.js'),'utf8');
const html=fs.readFileSync(path.join(root,'public','index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'public','styles.css'),'utf8');
const checks=[
 ['approved logo asset',fs.existsSync(path.join(root,'public','assets','nash-approved-mark.png'))],
 ['approved lockup asset',fs.existsSync(path.join(root,'public','assets','nash-approved-lockup.png'))],
 ['favicon wired',html.includes('/assets/favicon.png')],
 ['sidebar approved logo',html.includes('approved-logo-sidebar')],
 ['login approved logo',html.includes('approved-logo-login')],
 ['business summaries',app.includes('function businessSummary')],
 ['recommendation panels',app.includes('function recommendationList')],
 ['employee performance raw JSON removed',!app.includes('JSON.stringify(performanceData,null,2)')],
 ['employee learning raw JSON removed',!app.includes('JSON.stringify(training,null,2)')],
 ['technical trace hidden',css.includes('.technical-trace { display:none; }')]
];
let pass=0; checks.forEach(([n,ok])=>{console.log(`${ok?'PASS':'FAIL'} ${n}`); if(ok) pass++;});
console.log(`HF21 QA ${pass}/${checks.length}`); process.exit(pass===checks.length?0:1);
