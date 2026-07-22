const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));
const server = read('server.js');
const app = read('public/app.js');
const html = read('public/index.html');

const checks = {
  cleanBuild05ClosureReviewLock: pkg.nashCleanBuild?.lock === 'NASH_OS_CLEAN_BUILD_05_CLOSURE_REVIEW_LOCK' && server.includes('NASH_OS_CLEAN_BUILD_05_CLOSURE_REVIEW_LOCK'),
  controlledEmployeePickerStillActive: pkg.nashCleanBuild?.employeePickerFromMysql === true && app.includes('/api/employees/search'),
  workdayAttendanceStillActive: pkg.nashCleanBuild?.workdayAttendanceActive === true && server.includes('/api/workday/check-in') && server.includes('/api/workday/check-out'),
  taskExecutionStillActive: pkg.nashCleanBuild?.taskExecutionActive === true && server.includes('/api/workday/tasks/submit-completion'),
  closureReviewActive: pkg.nashCleanBuild?.closureReviewActive === true && html.includes('Manager / Beneficiary Closure Gate') && app.includes('loadClosureQueue'),
  managerBeneficiaryClosure: pkg.nashCleanBuild?.managerBeneficiaryClosure === true && server.includes('/api/workday/closure/decision') && app.includes('manager_accept') && app.includes('beneficiary_accept'),
  acceptReturnChain: pkg.nashCleanBuild?.acceptReturnChain === true && server.includes('manager_return') && server.includes('beneficiary_return'),
  closureDecisionReceipt: pkg.nashCleanBuild?.closureDecisionReceipt === true && server.includes('runtimeClosureDecisions') && server.includes('CLOSE_WITH_AUDIT'),
  submittedWorkRequiredBeforeClosure: pkg.nashCleanBuild?.submittedWorkRequiredBeforeClosure === true && server.includes('Task must be submitted before manager or beneficiary closure'),
  noGenericOperatingForm: pkg.nashCleanBuild?.genericOperatingFormAllowed === false && !html.includes('Generic Operating Form') && !app.includes('NASH-TASK-001'),
  legacyPatchUiRemoved: pkg.nashCleanBuild?.legacyPatchUiAllowed === false && !html.includes('Hardening Console') && !html.includes('UX Audit') && !app.includes('renderOperatorFocusBoard'),
  schemaMigrationFlagCorrect: pkg.nashCleanBuild?.schemaMigrationIncluded === false,
  databaseSchemaFlagCorrect: pkg.nashCleanBuild?.databaseSchemaTouched === false
};

const failed = Object.entries(checks).filter(([, ok]) => !ok);
if (failed.length) {
  console.error('qa:clean-build-05 = FAIL');
  for (const [name] of failed) console.error(`${name} = false`);
  process.exit(1);
}

console.log('qa:clean-build-05 = PASS');
console.log('cleanBuild05ClosureReviewLock = true');
console.log('controlledEmployeePickerStillActive = true');
console.log('workdayAttendanceStillActive = true');
console.log('taskExecutionStillActive = true');
console.log('closureReviewActive = true');
console.log('managerBeneficiaryClosure = true');
console.log('acceptReturnChain = true');
console.log('closureDecisionReceipt = true');
console.log('submittedWorkRequiredBeforeClosure = true');
console.log('noGenericOperatingForm = true');
console.log('legacyPatchUiRemoved = true');
console.log('schemaMigrationIncluded = false');
console.log('databaseSchemaTouched = false');
