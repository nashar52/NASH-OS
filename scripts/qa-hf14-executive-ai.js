const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'public', 'app.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'public', 'styles.css'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const checks = [
  ['executiveAiWorkspace function', app.includes('async function executiveAiWorkspace()')],
  ['exec_ai binding', app.includes('exec_ai: executiveAiWorkspace')],
  ['decision packet action', app.includes('prepare_ai_decision_packet')],
  ['human escalation boundary', app.includes('AI signal escalated for authorized human review')],
  ['source-labelled aggregation', app.includes("optionalApi('/api/executive/dashboard')") && app.includes("optionalApi('/api/ai/summary')")],
  ['AI workspace styles', css.includes('HF14 — Executive Workspace + AI Layer') && css.includes('.ai-executive-shell')],
  ['schema untouched', pkg.nashCleanBuild.mysqlSchemaTouched === false && pkg.nashCleanBuild.databaseDataTouched === false],
  ['autonomous decision blocked', pkg.nashCleanBuild.aiAutonomousDecisionBlocked === true]
];
const failed = checks.filter(([,ok]) => !ok);
checks.forEach(([name,ok]) => console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`));
if (failed.length) process.exit(1);
console.log('HF14 Executive AI QA PASS');
