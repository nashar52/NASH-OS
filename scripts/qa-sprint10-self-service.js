'use strict';
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'public', 'app.js'), 'utf8');
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'public', 'styles.css'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const employee = ['My Profile','Personal Information','Documents','Attendance','Leave Requests','Business Trips','Expense Claims','Tasks','Goals','Performance Reviews','Learning','Payslips','Benefits','Requests','Notifications'];
const manager = ['Team Dashboard','Team Attendance','Leave Approvals','Expense Approvals','Recruitment Requests','Performance Reviews','Goal Reviews','Learning Approval','Team Documents','Team Analytics'];
const checks = [
  ['Employee service catalogue is complete', employee.every((name) => app.includes(`['${name}',`))],
  ['Manager service catalogue is complete', manager.every((name) => app.includes(`['${name}',`))],
  ['Role-bound navigation opens both workspaces', app.includes("emp_self_service: employeeSelfServiceWorkspace") && app.includes("mgr_team_workspace: managerSelfServiceWorkspace")],
  ['All service buttons use the runtime action receipt flow', app.includes("data-sprint10-service") && app.includes('permissionReceipt(actionType')],
  ['Employee and manager Sprint 10 actions are server-authorized', server.includes("'SPRINT10_EMPLOYEE_ACTION'") && server.includes("'SPRINT10_MANAGER_ACTION'")],
  ['Receipt contains audit trail and evidence', server.includes('auditTrail: { eventId:') && server.includes("evidence: { reference:")],
  ['Production workspace styles are present', css.includes('.sprint10-service-grid') && css.includes('.sprint10-hero')],
  ['No schema change declared', pkg.nashOs.sprint10NoSchemaChange === true]
];
const failed = checks.filter(([, pass]) => !pass);
checks.forEach(([name, pass]) => console.log(`${pass ? 'PASS' : 'FAIL'}: ${name}`));
if (failed.length) process.exit(1);
console.log('Sprint 10 Employee & Manager Self-Service QA PASS');
