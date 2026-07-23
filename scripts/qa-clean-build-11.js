'use strict';
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));
const server = read('server.js');
const app = read('public/app.js');
const checks = [
  ['Saudi compliance sprint flag', pkg.nashCleanBuild.saudiGovernmentComplianceSprintActive === true],
  ['government workspace', app.includes('governmentComplianceWorkspace') && app.includes('Saudi Government Relations & Compliance')],
  ['case actions', ['CREATE_TASK', 'REQUEST_EVIDENCE', 'REQUEST_APPROVAL', 'ESCALATE', 'PLACE_PAYROLL_HOLD', 'RECORD_FEE'].every((item) => server.includes(item))],
  ['government routes', ['/api/government/dashboard', '/api/government/cases', '/api/government/cases/:id/action'].every((item) => server.includes(item))],
  ['Saudi services', ['QIWA_CONTRACT', 'WORK_PERMIT', 'IQAMA', 'GOSI', 'MUDAD_WPS', 'NITAQAT', 'LABOR_LAW', 'GOVERNMENT_FEE'].every((item) => server.includes(item))],
  ['human approval boundary', server.includes('humanFinalDecisionRequired: true') && server.includes('externalGovernmentSubmissionBlocked: true')],
  ['MySQL source of truth', server.includes('mysqlSourceOfTruth: true') && server.includes('directMysqlMutation: false')],
  ['no schema change', pkg.nashCleanBuild.schemaMigrationIncluded === false && pkg.nashCleanBuild.databaseSchemaTouched === false],
  ['no migration commands', !/(CREATE TABLE|ALTER TABLE|DROP TABLE|TRUNCATE TABLE|migrate:|db:init)/i.test(server + JSON.stringify(pkg.scripts))]
];
const failed = checks.filter(([, ok]) => !ok);
for (const [name, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
if (failed.length) { console.error(`qa:clean-build-11 = FAIL (${failed.map(([name]) => name).join(', ')})`); process.exit(1); }
console.log('qa:clean-build-11 = PASS');
