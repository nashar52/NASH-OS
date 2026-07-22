const fs=require('fs');
const app=fs.readFileSync('public/app.js','utf8');
const css=fs.readFileSync('public/styles.css','utf8');
const pkg=require('../package.json');
const server=fs.readFileSync('server.js','utf8');
const checks=[
 ['HF30 version',String(pkg.version).includes('hf30-operational-product-conversion')],
 ['No raw objectBox JSON',/function objectBox\(obj\) \{ return businessSummary/.test(app)],
 ['Operational smart table',app.includes('hf30-smart-table')],
 ['Module-specific queues',app.includes('Government Compliance Queue')&&app.includes('Compensation Decision Queue')],
 ['Search binding',app.includes('data-hf30-search')&&app.includes('bindHf30OperationalPanel')],
 ['Export receipt',app.includes('OPERATIONAL_VIEW_EXPORTED')],
 ['AI recommendation receipt',app.includes('AI_EXPLAINABLE_RECOMMENDATION_GENERATED')],
 ['AI structured recommendation',app.includes('hf30-recommendation-grid')],
 ['Raw object box hidden',css.includes('.object-box{display:none!important}')],
 ['HF30 startup banner',server.includes('HF30 Operational Product Conversion running at')]
];
let fail=0; for(const [n,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${n}`); if(!ok)fail++;}
console.log(`HF30 QA ${checks.length-fail}/${checks.length}`); process.exit(fail?1:0);
