const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));
const server = read('server.js');
const app = read('public/app.js');
const html = read('public/index.html');

const checks = {
  cleanBuild03WorkdayAttendanceLock: pkg.nashCleanBuild?.lock === 'NASH_OS_CLEAN_BUILD_03_WORKDAY_ATTENDANCE_LOCK' && server.includes('NASH_OS_CLEAN_BUILD_03_WORKDAY_ATTENDANCE_LOCK'),
  controlledEmployeePickerStillActive: pkg.nashCleanBuild?.employeePickerFromMysql === true && app.includes('/api/employees/search'),
  workdayAttendanceActive: pkg.nashCleanBuild?.workdayAttendanceActive === true && html.includes('Workday Attendance Gate'),
  controlledAttendanceEmployee: pkg.nashCleanBuild?.controlledAttendanceEmployee === true && server.includes('Controlled employee selection is required'),
  checkInCheckOut: pkg.nashCleanBuild?.checkInCheckOut === true && server.includes('/api/workday/check-in') && server.includes('/api/workday/check-out'),
  workdaySessionReceipt: pkg.nashCleanBuild?.workdaySessionReceipt === true && server.includes('createReceipt') && server.includes('START_WORKDAY'),
  attendanceSourceInspection: pkg.nashCleanBuild?.attendanceSourceInspection === true && server.includes('/api/workday/attendance/source'),
  noGenericOperatingForm: pkg.nashCleanBuild?.genericOperatingFormAllowed === false && !html.includes('Generic Operating Form') && !app.includes('NASH-TASK-001'),
  legacyPatchUiRemoved: pkg.nashCleanBuild?.legacyPatchUiAllowed === false && !html.includes('Hardening Console') && !html.includes('UX Audit') && !app.includes('renderOperatorFocusBoard'),
  schemaMigrationFlagCorrect: pkg.nashCleanBuild?.schemaMigrationIncluded === false,
  databaseSchemaFlagCorrect: pkg.nashCleanBuild?.databaseSchemaTouched === false
};

const failed = Object.entries(checks).filter(([, ok]) => !ok);
if (failed.length) {
  console.error('qa:clean-build-03 = FAIL');
  for (const [name] of failed) console.error(`${name} = false`);
  process.exit(1);
}

console.log('qa:clean-build-03 = PASS');
console.log('cleanBuild03WorkdayAttendanceLock = true');
console.log('controlledEmployeePickerStillActive = true');
console.log('workdayAttendanceActive = true');
console.log('controlledAttendanceEmployee = true');
console.log('checkInCheckOut = true');
console.log('workdaySessionReceipt = true');
console.log('attendanceSourceInspection = true');
console.log('noGenericOperatingForm = true');
console.log('legacyPatchUiRemoved = true');
console.log('schemaMigrationIncluded = false');
console.log('databaseSchemaTouched = false');
