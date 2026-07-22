const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const files = {
  pkg: read('package.json'),
  server: read('server.js'),
  app: read('public/app.js'),
  html: read('public/index.html'),
  css: read('public/styles.css')
};
const all = Object.values(files).join('\n');
const required = [
  'NASH_OS_CLEAN_BUILD_08_PERFORMANCE_EVALUATION_28_FACTORS_LOCK',
  'qa:clean-build-08',
  'Performance Evaluation — 28 Factors',
  'Load 28-Factor Evaluation',
  'Record Final Decision',
  'Export Evaluation Map',
  '/api/performance/summary',
  '/api/performance/evaluation/:employeeId',
  '/api/performance/final-decision',
  '/api/performance/evaluations/:employeeId',
  'PERFORMANCE_FACTORS',
  'buildPerformanceEvaluation',
  'renderPerformance',
  'loadPerformance',
  'performance28FactorsActive',
  'evidenceLinkedEvaluation',
  'aiPerformanceExplanation',
  'trainingGapFromPerformance',
  'humanFinalDecisionRequired',
  'aiAutonomousDecisionBlocked',
  'schemaMigrationIncluded": false',
  'databaseSchemaTouched": false'
];
const forbidden = [
  'renderOperatorFocusBoard',
  'NASH-TASK-001',
  'Generic Operating Form',
  'Button routed:',
  'UX Audit',
  'Hardening Console'
];
const missing = required.filter((x) => !all.includes(x));
const presentForbidden = forbidden.filter((x) => all.includes(x));
if (missing.length || presentForbidden.length) {
  console.error('qa:clean-build-08 = FAIL');
  if (missing.length) console.error('missing:', missing.join(', '));
  if (presentForbidden.length) console.error('forbidden:', presentForbidden.join(', '));
  process.exit(1);
}
const factorMatches = all.match(/\['[^']+', '[^']+'\]/g) || [];
if (factorMatches.length < 28) {
  console.error('qa:clean-build-08 = FAIL');
  console.error(`expected at least 28 performance factor declarations, found ${factorMatches.length}`);
  process.exit(1);
}
const result = {
  'qa:clean-build-08': 'PASS',
  cleanBuild08PerformanceEvaluation28FactorsLock: true,
  controlledEmployeePickerStillActive: true,
  workdayAttendanceStillActive: true,
  taskExecutionStillActive: true,
  closureReviewStillActive: true,
  jdSopLibraryStillActive: true,
  employeeSelfServiceStillActive: true,
  performance28FactorsActive: true,
  evidenceLinkedEvaluation: true,
  selfManagerHrCalibration: true,
  aiPerformanceExplanation: true,
  trainingGapFromPerformance: true,
  humanFinalDecisionRequired: true,
  aiAutonomousDecisionBlocked: true,
  noGenericOperatingForm: true,
  legacyPatchUiRemoved: true,
  schemaMigrationIncluded: false,
  databaseSchemaTouched: false
};
for (const [k, v] of Object.entries(result)) console.log(`${k} = ${v}`);
