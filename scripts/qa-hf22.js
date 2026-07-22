const fs=require('fs');const path=require('path');
const root=path.join(__dirname,'..');const app=fs.readFileSync(path.join(root,'public','app.js'),'utf8');const css=fs.readFileSync(path.join(root,'public','styles.css'),'utf8');const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
const tests=[
['HF22 baseline retained',pkg.nashCleanBuild.hf22Employee360OperationalWorkspaceActive===true],
['Lifecycle command strip',app.includes('employee360-command-strip')],
['Operational priorities',app.includes('Operational priorities')&&app.includes('e360-priority-list')],
['Controlled timeline',app.includes('Controlled timeline')&&app.includes('e360-timeline')],
['Human AI boundary visible',app.includes('AI recommendation only · human approval required')],
['Responsive command strip',css.includes('@media(max-width:1100px){.employee360-command-strip')],
['Enterprise hero rebuild',css.includes('HF22 — Employee 360 operational workspace rebuild')],
['No schema migration',pkg.nashCleanBuild.databaseSchemaTouched===false&&pkg.nashCleanBuild.mysqlSchemaTouched===false],
['MySQL source truth preserved',pkg.nashCleanBuild.sourceOfTruth==='mysql'],
['HF22 lock flags',pkg.nashCleanBuild.hf22Employee360OperationalWorkspaceActive===true]
];let fail=0;for(const [n,ok] of tests){console.log(`${ok?'PASS':'FAIL'} - ${n}`);if(!ok)fail++;}console.log(`HF22 QA ${tests.length-fail}/${tests.length}`);process.exit(fail?1:0);
