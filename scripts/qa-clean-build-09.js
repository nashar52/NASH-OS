
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const files = {
  package: fs.readFileSync(path.join(root, 'package.json'), 'utf8'),
  server: fs.readFileSync(path.join(root, 'server.js'), 'utf8'),
  app: fs.readFileSync(path.join(root, 'public', 'app.js'), 'utf8'),
  html: fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8')
};
const pkg = JSON.parse(files.package);
const checks = [
  ['cleanBuild09TrainingDevelopmentGapLock', pkg.nashCleanBuild.lock === 'NASH_OS_CLEAN_BUILD_09_TRAINING_DEVELOPMENT_GAP_LOCK'],
  ['employee360StillActive', pkg.nashCleanBuild.employee360Active === true],
  ['workdayAttendanceStillActive', pkg.nashCleanBuild.workdayAttendanceActive === true],
  ['taskExecutionStillActive', pkg.nashCleanBuild.taskExecutionActive === true],
  ['closureReviewStillActive', pkg.nashCleanBuild.closureReviewActive === true],
  ['jdSopStillActive', pkg.nashCleanBuild.jdSopLibraryActive === true],
  ['selfServiceStillActive', pkg.nashCleanBuild.employeeSelfServiceActive === true],
  ['performanceStillActive', pkg.nashCleanBuild.performance28FactorsActive === true],
  ['trainingDevelopmentActive', pkg.nashCleanBuild.trainingDevelopmentActive === true],
  ['trainingGapEngineActive', pkg.nashCleanBuild.trainingGapEngineActive === true],
  ['learningPathActive', pkg.nashCleanBuild.learningPathActive === true],
  ['coachingPlanActive', pkg.nashCleanBuild.coachingPlanActive === true],
  ['postTrainingEvaluationActive', pkg.nashCleanBuild.postTrainingEvaluationActive === true],
  ['trainingApiPresent', files.server.includes('/api/training/plan/:employeeId') && files.server.includes('/api/training/assign-plan')],
  ['trainingPanelPresent', files.html.includes('Training & Development Gap Engine') && files.app.includes('renderTraining')],
  ['humanApprovalRequired', files.server.includes('humanApprovalRequired: true') && files.server.includes('HR/manager approve')],
  ['noGenericTrainingForm', !/NASH-TASK-001|Button routed|renderOperatorFocusBoard|generic training form/i.test(files.app + files.html + files.server)],
  ['legacyPatchUiRemoved', pkg.nashCleanBuild.legacyPatchUiAllowed === false],
  ['schemaMigrationIncluded', pkg.nashCleanBuild.schemaMigrationIncluded === false],
  ['databaseSchemaTouched', pkg.nashCleanBuild.databaseSchemaTouched === false]
];
const failed = checks.filter(([, ok]) => !ok);
console.log('NASH OS Clean Build 09 QA');
checks.forEach(([name, ok]) => console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`));
if (failed.length) {
  console.error(`qa:clean-build-09 failed: ${failed.map(([n]) => n).join(', ')}`);
  process.exit(1);
}
console.log('qa:clean-build-09 = PASS');
