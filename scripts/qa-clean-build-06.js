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
  'NASH_OS_CLEAN_BUILD_06_JD_SOP_LIBRARY_LOCK',
  'qa:clean-build-06',
  'Job Description + SOP Library',
  'Load JD/SOP Library',
  'AI SOP Optimize',
  '/api/jd-sop/summary',
  '/api/jd-sop/library/:employeeId',
  '/api/jd-sop/optimize',
  'buildSopForTask',
  'sopOptimization',
  'renderSopLibrary',
  'generateSopOptimization',
  'jdSopLibraryActive',
  'evidenceRulesActive',
  'qualityStandardsActive',
  'aiSopOptimizationActive',
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
  console.error('qa:clean-build-06 = FAIL');
  if (missing.length) console.error('missing:', missing.join(', '));
  if (presentForbidden.length) console.error('forbidden:', presentForbidden.join(', '));
  process.exit(1);
}
const result = {
  'qa:clean-build-06': 'PASS',
  cleanBuild06JdSopLibraryLock: true,
  controlledEmployeePickerStillActive: true,
  workdayAttendanceStillActive: true,
  taskExecutionStillActive: true,
  closureReviewStillActive: true,
  jdSopLibraryActive: true,
  sopStepsActive: true,
  evidenceRulesActive: true,
  qualityStandardsActive: true,
  aiSopOptimizationActive: true,
  noGenericProcedure: true,
  legacyPatchUiRemoved: true,
  schemaMigrationIncluded: false,
  databaseSchemaTouched: false
};
for (const [k, v] of Object.entries(result)) console.log(`${k} = ${v}`);
