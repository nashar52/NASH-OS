'use strict';
// Sprint 18 client contract audit: protects every employee workspace action against stale routes and silent handlers.
const assert = require('assert');
const fs = require('fs');
const app = fs.readFileSync('public/app.js', 'utf8');
const html = fs.readFileSync('public/index.html', 'utf8');
const server = fs.readFileSync('server.js', 'utf8');
const required = [
  'employeeAttendanceApp', 'employeeTasksApp', 'employeeFileApp', 'employeePerformanceApp', 'employeeRightsApp',
  '/api/workday/check-in', '/api/workday/check-out', '/api/workday/tasks/${encodeURIComponent(employee.id)}',
  'data-task-filter', 'data-file-tab', 'performanceAssessmentForm', 'data-service-request', 'downloadJson',
  'receiptId'
];
for (const item of required) assert.ok(app.includes(item), `Missing Sprint 18 operational contract: ${item}`);
for (const label of ['My Workspace', 'Self-Service', 'Attendance', 'Tasks & Evidence', 'Employee File', 'Performance', 'Rights & Reports']) assert.ok(app.includes(`label: '${label}'`), `Missing employee navigation: ${label}`);
assert.ok(!app.includes("optionalApi('/api/tasks')"), 'Tasks must use the employee-scoped MySQL task endpoint.');
assert.ok(!/window\.alert\(/.test(app), 'Placeholder alerts are prohibited.');
assert.ok(html.includes('id="toast"'), 'Visible feedback surface is required.');
assert.ok(server.includes('roleSwitchingBlocked'), 'Role switching must remain blocked server-side.');
console.log('PASS Sprint 18 employee operational QA: navigation, attendance API actions, MySQL task binding, task empty/filter actions, file tabs/downloads, self review, rights receipts/downloads, handler contracts, and visible feedback are present.');
