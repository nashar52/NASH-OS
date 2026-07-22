const fs=require('fs');const path=require('path');
const root=path.join(__dirname,'..');const app=fs.readFileSync(path.join(root,'public','app.js'),'utf8');const css=fs.readFileSync(path.join(root,'public','styles.css'),'utf8');const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
const tests=[
['HF23 version',pkg.version.includes('hf23') || pkg.version.includes('hf24')],
['Executive Command Center',app.includes('Executive Command Center')&&app.includes('executive-command-center')],
['Decision-led priority ribbon',app.includes('exec-priority-ribbon')&&app.includes('Weakest coverage')],
['Intervention queue',app.includes('Intervention queue')&&app.includes('exec-intervention-list')],
['Controlled domain drilldown',app.includes('DOMAIN DRILLDOWN')&&app.includes('data-exec-domain')],
['Human decision packet',app.includes('HUMAN DECISION REQUIRED')&&app.includes('AI does not approve this decision.')],
['Explainable risk drilldown',app.includes('Explainable Risk Driver')&&app.includes('AI-supported signal')],
['Responsive executive layout',css.includes('@media(max-width:1180px){.exec-command-layout')],
['No schema migration',pkg.nashCleanBuild.databaseSchemaTouched===false&&pkg.nashCleanBuild.mysqlSchemaTouched===false],
['HF23 lock flags',pkg.nashCleanBuild.hf23ExecutiveCommandCenterActive===true&&pkg.nashCleanBuild.executiveControlledDrilldownsActive===true]
];let fail=0;for(const [n,ok] of tests){console.log(`${ok?'PASS':'FAIL'} - ${n}`);if(!ok)fail++;}console.log(`HF23 QA ${tests.length-fail}/${tests.length}`);process.exit(fail?1:0);
