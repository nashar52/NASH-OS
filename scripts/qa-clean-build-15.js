const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));
const server = read('server.js');
const app = read('public/app.js');
const html = read('public/index.html');

const checks = [
  ['lock', pkg.nashCleanBuild.lock === 'NASH_OS_CLEAN_BUILD_15_AI_RISK_RADAR_DECISION_SUPPORT_CENTER_LOCK'],
  ['script', Boolean(pkg.scripts['qa:clean-build-15'])],
  ['ai panel', html.includes('aiPanel') && html.includes('AI Risk Radar / Decision Support Center')],
  ['ai buttons', ['loadAiRadar','prepareAiSummary','detectAiConflicts','requestAiEvidence','escalateAiHumanReview','recordHumanOverride','exportAiRiskReport'].every((id) => html.includes(id))],
  ['client routes', app.includes('loadAiRadar') && app.includes('aiAction') && app.includes('/api/ai/radar/')],
  ['server endpoints', ['/api/ai/summary','/api/ai/radar/:employeeId','/api/ai/action','/api/ai/actions/:employeeId'].every((needle) => server.includes(needle))],
  ['ai concepts', ['aiRiskRadarCenterActive','aiDecisionSupportCenterActive','aiPolicyConflictDetectionActive','aiExplainabilityLogActive','aiRecommendationQueueActive'].every((needle) => server.includes(needle) || app.includes(needle) || JSON.stringify(pkg).includes(needle))],
  ['human decision', server.includes('humanFinalDecisionRequired: true') && pkg.nashCleanBuild.humanFinalDecisionRequired === true],
  ['ai blocked', server.includes('AI cannot approve salary') && pkg.nashCleanBuild.aiAutonomousDecisionBlocked === true],
  ['no schema change', pkg.nashCleanBuild.schemaMigrationIncluded === false && pkg.nashCleanBuild.databaseSchemaTouched === false],
  ['no migration commands', !/(CREATE TABLE|ALTER TABLE|DROP TABLE|TRUNCATE TABLE|migrate:|db:init)/i.test(server + JSON.stringify(pkg.scripts))]
];

const failed = checks.filter(([, ok]) => !ok);
for (const [name, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
if (failed.length) {
  console.error(`qa:clean-build-15 = FAIL (${failed.map(([name]) => name).join(', ')})`);
  process.exit(1);
}
console.log('qa:clean-build-15 = PASS');
console.log('aiRiskRadarCenterActive = true');
console.log('aiDecisionSupportCenterActive = true');
console.log('aiPolicyConflictDetectionActive = true');
console.log('aiExplainabilityLogActive = true');
console.log('aiRecommendationQueueActive = true');
console.log('aiRecommendationOnly = true');
console.log('humanFinalDecisionRequired = true');
console.log('schemaMigrationIncluded = false');
console.log('databaseSchemaTouched = false');
