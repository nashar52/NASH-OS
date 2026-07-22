const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const pkg = JSON.parse(read('package.json'));
const app = read('public/app.js');
const html = read('public/index.html');
const server = read('server.js');
const checks = {
  compensationDecisionCenterActive: html.includes('Compensation Decision Center') && server.includes('/api/compensation/decision/:employeeId'),
  performanceLinkedToCompensation: server.includes('buildPerformanceEvaluation(profile)') && server.includes('Build 08 28-factor evaluation'),
  trainingGapBlocksConfigured: server.includes('buildTrainingDevelopmentPlan(profile)') && server.includes('training.developmentRisk'),
  payrollImpactPreviewActive: server.includes('payrollImpact') && html.includes('Calculate Payroll Impact'),
  wpsReadinessCheckActive: server.includes('wpsReadiness') && server.includes('Mudad/WPS'),
  approvalQueueActive: html.includes('Send to Approval') && html.includes('Approve HR Decision'),
  evidenceReceiptActive: html.includes('Create Evidence Receipt') && server.includes('createReceipt(`COMPENSATION_'),
  auditTrailActive: server.includes('evidenceRequired') && server.includes('databaseSchemaTouched: false'),
  aiRecommendationOnly: server.includes('aiRecommendationOnly: true') && server.includes('AI recommendation only'),
  humanFinalDecisionRequired: server.includes('humanFinalDecisionRequired: true') && pkg.nashCleanBuild.humanFinalDecisionRequired === true,
  schemaMigrationNotIncluded: pkg.nashCleanBuild.schemaMigrationIncluded === false,
  databaseSchemaNotTouched: pkg.nashCleanBuild.databaseSchemaTouched === false
};
const ok = Object.values(checks).every(Boolean);
console.log('qa:clean-build-10 = ' + (ok ? 'PASS' : 'FAIL'));
for (const [k, v] of Object.entries(checks)) console.log(`${k} = ${v}`);
console.log('schemaMigrationIncluded = ' + pkg.nashCleanBuild.schemaMigrationIncluded);
console.log('databaseSchemaTouched = ' + pkg.nashCleanBuild.databaseSchemaTouched);
process.exit(ok ? 0 : 1);
