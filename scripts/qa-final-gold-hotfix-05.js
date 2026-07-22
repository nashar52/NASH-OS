const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'public', 'app.js'), 'utf8');
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const pkg = require(path.join(root, 'package.json'));
const checks = [
  ['employee document upload allowed server-side', server.includes('EMPLOYEE_DOCUMENT_UPLOAD')],
  ['document download allowed server-side', server.includes('DOCUMENT_DOWNLOAD')],
  ['visible upload form status exists', app.includes('employeeDocumentStatus') && app.includes('setFormStatus')],
  ['upload button cannot silently fail', app.includes('Document Upload Failed') && app.includes('No silent failure')],
  ['local fallback receipt exists', app.includes('localRuntimeReceipt') && app.includes('RECORDED_LOCAL_RUNTIME_API_FALLBACK')],
  ['open vault after upload exists', app.includes('openVaultAfterUpload')],
  ['no schema migration', pkg.nashCleanBuild.schemaMigrationIncluded === false && pkg.nashCleanBuild.databaseSchemaTouched === false],
  ['hotfix 05 flag', pkg.nashCleanBuild.finalGoldHotfix05 === true]
];
let failed = false;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (!ok) failed = true;
}
if (failed) process.exit(1);
console.log('qa:final-gold-hotfix-05 = PASS');
