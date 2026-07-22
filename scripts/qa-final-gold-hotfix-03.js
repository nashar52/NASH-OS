const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'public', 'app.js'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const checks = [
  ['downloadable document store', app.includes('DOC_STORE_KEY') && app.includes('downloadDocument')],
  ['employee document vault command', app.includes("emp_file") && app.includes('My Employee File')],
  ['upload employee document command', app.includes('Upload Employee Document') && app.includes('EMPLOYEE_DOCUMENT_UPLOAD')],
  ['evidence file picker', app.includes('Evidence file to upload') && app.includes('Submit Evidence File')],
  ['document download buttons', app.includes('data-download-doc') && app.includes('Download File')],
  ['document categories', app.includes('CV / Resume') && app.includes('Experience Letter') && app.includes('Academic Certificate')],
  ['schema untouched flag', pkg.nashCleanBuild.schemaMigrationIncluded === false && pkg.nashCleanBuild.databaseSchemaTouched === false],
  ['hotfix flags', pkg.nashCleanBuild.finalGoldHotfix03 === true && pkg.nashCleanBuild.employeeDocumentVaultActive === true]
];
const failed = checks.filter(([, ok]) => !ok);
for (const [name, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
if (failed.length) {
  console.error(`qa:final-gold-hotfix-03 FAIL ${failed.length} failed`);
  process.exit(1);
}
console.log('qa:final-gold-hotfix-03 PASS');
