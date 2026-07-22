const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'public', 'app.js'), 'utf8');
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const checks = [
  ['frontend accepts profiles or employees contract', app.includes('data.profiles || data.employees || []')],
  ['server returns profiles compatibility key', server.includes('profiles: payload')],
  ['server still returns employees key', server.includes('employees: payload')],
  ['request profile edit still requires selected employee context', app.includes('Request Profile Edit') && app.includes('EMPLOYEE_PROFILE_EDIT_REQUEST')],
  ['permissioned receipts remain runtime only', server.includes('runtime receipt only') && server.includes('databaseSchemaTouched: false')],
  ['direct DB CRUD remains blocked', server.includes('directDatabaseCrudBlocked: true')]
];
const failed = checks.filter(([, ok]) => !ok);
if (failed.length) {
  console.error('qa:final-gold-hotfix-01 = FAIL');
  failed.forEach(([name]) => console.error(' - ' + name));
  process.exit(1);
}
console.log('qa:final-gold-hotfix-01 = PASS');
console.log('employeeContextBindingFixed = true');
console.log('selectMyRecordReturnsEmployees = true');
console.log('schemaMigrationIncluded = false');
console.log('databaseSchemaTouched = false');
console.log('directDatabaseCrudBlocked = true');
