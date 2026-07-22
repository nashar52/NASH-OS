const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));
const server = read('server.js');
const app = read('public/app.js');
const html = read('public/index.html');

const checks = {
  cleanBuild04TaskExecutionLock: pkg.nashCleanBuild?.lock === 'NASH_OS_CLEAN_BUILD_04_TASK_EXECUTION_LOCK' && server.includes('NASH_OS_CLEAN_BUILD_04_TASK_EXECUTION_LOCK'),
  controlledEmployeePickerStillActive: pkg.nashCleanBuild?.employeePickerFromMysql === true && app.includes('/api/employees/search'),
  workdayAttendanceStillActive: pkg.nashCleanBuild?.workdayAttendanceActive === true && server.includes('/api/workday/check-in') && server.includes('/api/workday/check-out'),
  taskExecutionActive: pkg.nashCleanBuild?.taskExecutionActive === true && html.includes('Task Execution Gate') && app.includes('loadTasks'),
  jdMatchedTasks: pkg.nashCleanBuild?.jdMatchedTasks === true && server.includes('jdReference') && server.includes('matchSignals'),
  slaEvidenceActionReports: pkg.nashCleanBuild?.slaEvidenceActionReports === true && server.includes('slaHours') && server.includes('evidenceRequired') && app.includes('actionReport'),
  controlledTaskEmployee: pkg.nashCleanBuild?.controlledTaskEmployee === true && server.includes('Controlled employee selection is required before opening tasks'),
  taskStartSubmitReceipt: pkg.nashCleanBuild?.taskStartSubmitReceipt === true && server.includes('/api/workday/tasks/start') && server.includes('/api/workday/tasks/submit-completion') && server.includes('SUBMIT_WORK'),
  taskSourceInspection: pkg.nashCleanBuild?.taskSourceInspection === true && server.includes('/api/workday/tasks/source'),
  noGenericOperatingForm: pkg.nashCleanBuild?.genericOperatingFormAllowed === false && !html.includes('Generic Operating Form') && !app.includes('NASH-TASK-001'),
  legacyPatchUiRemoved: pkg.nashCleanBuild?.legacyPatchUiAllowed === false && !html.includes('Hardening Console') && !html.includes('UX Audit') && !app.includes('renderOperatorFocusBoard'),
  schemaMigrationFlagCorrect: pkg.nashCleanBuild?.schemaMigrationIncluded === false,
  databaseSchemaFlagCorrect: pkg.nashCleanBuild?.databaseSchemaTouched === false
};

const failed = Object.entries(checks).filter(([, ok]) => !ok);
if (failed.length) {
  console.error('qa:clean-build-04 = FAIL');
  for (const [name] of failed) console.error(`${name} = false`);
  process.exit(1);
}

console.log('qa:clean-build-04 = PASS');
console.log('cleanBuild04TaskExecutionLock = true');
console.log('controlledEmployeePickerStillActive = true');
console.log('workdayAttendanceStillActive = true');
console.log('taskExecutionActive = true');
console.log('jdMatchedTasks = true');
console.log('slaEvidenceActionReports = true');
console.log('controlledTaskEmployee = true');
console.log('taskStartSubmitReceipt = true');
console.log('taskSourceInspection = true');
console.log('noGenericOperatingForm = true');
console.log('legacyPatchUiRemoved = true');
console.log('schemaMigrationIncluded = false');
console.log('databaseSchemaTouched = false');
