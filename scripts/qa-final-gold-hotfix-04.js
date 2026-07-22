const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'public', 'app.js'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const checks = [
  ['document lifecycle commands', app.includes('Replace My Document') && app.includes('Archive Draft Document') && app.includes('Document Intake Queue')],
  ['manager evidence review', app.includes('Review Evidence File') && app.includes('MANAGER_EVIDENCE_CORRECTION')],
  ['HR document verification', app.includes('Verify Employee Document') && app.includes('HR_DOCUMENT_VERIFY') && app.includes('HR_DOCUMENT_REJECT')],
  ['missing document request', app.includes('Request Missing Documents') && app.includes('HR_MISSING_DOCUMENT_REQUEST')],
  ['expiry review', app.includes('Document Expiry Review') && app.includes('documentExpiryFlag')],
  ['document metadata', app.includes('documentNumber') && app.includes('expiryDate') && app.includes('sensitivity') && app.includes('verificationStatus')],
  ['download receipt remains active', app.includes('DOCUMENT_DOWNLOAD') && app.includes('Download File')],
  ['schema untouched flag', pkg.nashCleanBuild.schemaMigrationIncluded === false && pkg.nashCleanBuild.databaseSchemaTouched === false],
  ['hotfix flags', pkg.nashCleanBuild.finalGoldHotfix04 === true && pkg.nashCleanBuild.documentLifecycleReceiptsActive === true]
];
const failed = checks.filter(([, ok]) => !ok);
for (const [name, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
if (failed.length) {
  console.error(`qa:final-gold-hotfix-04 FAIL ${failed.length} failed`);
  process.exit(1);
}
console.log('qa:final-gold-hotfix-04 PASS');
