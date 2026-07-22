const fs=require('fs');
const app=fs.readFileSync('public/app.js','utf8');
const css=fs.readFileSync('public/styles.css','utf8');
const pkg=require('../package.json');
const checks=[
 ['HF28 version',String(pkg.version).includes('hf28')],
 ['AI profile resolver',app.includes('function hf28AiProfile')],
 ['AI panel renderer',app.includes('function hf28AiPanel')],
 ['AI panel binding',app.includes('function bindHf28AiPanel')],
 ['Explainable recommendation',app.includes('Generate Explainable Recommendation')],
 ['Human decision packet',app.includes('AI_DECISION_PACKET_PREPARED')],
 ['Human override receipt',app.includes('AI_HUMAN_OVERRIDE_RECORDED')],
 ['Autonomous action blocked',app.includes('No autonomous approval, mutation, ranking, rejection, or payroll action is permitted.')],
 ['AI styling',css.includes('HF28 — Explainable AI embedded operating layer')],
 ['MySQL lock preserved',pkg.nashCleanBuild.sourceOfTruth==='mysql' && pkg.nashCleanBuild.databaseSchemaTouched===false]
];
let pass=0;for(const [n,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${n}`);if(ok)pass++;}
console.log(`HF28 QA ${pass}/${checks.length}`);process.exit(pass===checks.length?0:1);
