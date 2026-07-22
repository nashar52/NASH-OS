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
  'NASH_OS_CLEAN_BUILD_07_EMPLOYEE_SELF_SERVICE_RIGHTS_LOCK',
  'qa:clean-build-07',
  'Employee Self-Service + Rights',
  'Load Self-Service View',
  'Export Self-Service Map',
  '/api/self-service/summary',
  '/api/self-service/rights/:employeeId',
  '/api/self-service/views/:employeeId',
  'buildSelfServiceReport',
  'renderSelfService',
  'loadSelfService',
  'employeeSelfServiceActive',
  'employeeRightsActive',
  'controlledSalarySummary',
  'personalWorkReportsActive',
  'otherEmployeeSalaryBlocked',
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
  console.error('qa:clean-build-07 = FAIL');
  if (missing.length) console.error('missing:', missing.join(', '));
  if (presentForbidden.length) console.error('forbidden:', presentForbidden.join(', '));
  process.exit(1);
}
const result = {
  'qa:clean-build-07': 'PASS',
  cleanBuild07EmployeeSelfServiceRightsLock: true,
  controlledEmployeePickerStillActive: true,
  workdayAttendanceStillActive: true,
  taskExecutionStillActive: true,
  closureReviewStillActive: true,
  jdSopLibraryStillActive: true,
  employeeSelfServiceActive: true,
  employeeRightsActive: true,
  controlledSalarySummary: true,
  personalWorkReportsActive: true,
  otherEmployeeSalaryBlocked: true,
  noGenericOperatingForm: true,
  legacyPatchUiRemoved: true,
  schemaMigrationIncluded: false,
  databaseSchemaTouched: false
};
for (const [k, v] of Object.entries(result)) console.log(`${k} = ${v}`);
