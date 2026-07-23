'use strict';

const fs = require('fs');
const app = fs.readFileSync('public/app.js', 'utf8');
const server = fs.readFileSync('server.js', 'utf8');
const checks = [];
function check(name, pass) {
  checks.push({ name, pass });
  console.log(`${pass ? 'PASS' : 'FAIL'} ${name}`);
}

check('Domain shell accepts header actions before body', app.includes("function appShell(kind, eyebrow, title, subtitle, actions='', body='')"));
check('Attendance app supplies actions before its content', /appShell\('attendance'[\s\S]*?data-command="emp_checkout_action"[\s\S]*?<div class="attendance-hero-grid">/.test(app));
check('Tasks app supplies actions before its content', /appShell\('tasks'[\s\S]*?data-new-evidence[\s\S]*?<div class="task-metrics">/.test(app));
check('Employee file app supplies actions before its content', /appShell\('employee-file'[\s\S]*?data-upload-file[\s\S]*?<section class="profile-hero">/.test(app));
check('Performance self-review has a controlled handler', app.includes('data-performance-self-review') && app.includes("permissionReceipt('EMPLOYEE_PERFORMANCE_SELF_REVIEW'"));
check('Employee service buttons have controlled handlers', app.includes('data-service-request') && app.includes("permissionReceipt('EMPLOYEE_SERVICE_REQUEST'"));
check('Performance self-review is role-authorized', server.includes("'EMPLOYEE_PERFORMANCE_SELF_REVIEW'"));
check('Employee service requests are role-authorized', server.includes("'EMPLOYEE_SERVICE_REQUEST'"));
check('No schema migration introduced', !server.includes('ALTER TABLE') && !server.includes('CREATE TABLE'));

const failed = checks.filter((check) => !check.pass);
console.log(`HF35 domain app QA ${checks.length - failed.length}/${checks.length}`);
process.exit(failed.length ? 1 : 0);
