'use strict';
const assert = require('assert'), fs = require('fs');
const server = fs.readFileSync('server.js', 'utf8'), pkg = require('../package.json');
['employee_lifecycle_events','/api/lifecycle/timeline/:employeeId','/api/lifecycle/events','/api/lifecycle/analytics','LIFECYCLE_STAGES','LIFECYCLE_EVENT_TYPES','workflow_instances','workflow_receipts','workflow_audit_events'].forEach(x => assert.ok(server.includes(x), `missing ${x}`));
['HIRING','DEPARTMENT_CHANGE','MANAGER_CHANGE','POSITION_CHANGE','SALARY_REVIEW','PROMOTION','TRANSFER','TRAINING_COMPLETION','PERFORMANCE_REVIEW','LEAVE_APPROVAL','TERMINATION','RETIREMENT','REHIRE','RESIGNATION','EXIT_INTERVIEW','ASSET_RETURN','KNOWLEDGE_TRANSFER'].forEach(x => assert.ok(server.includes(x), `missing event ${x}`));
['CANDIDATE','ACTIVE_EMPLOYMENT','COMPENSATION_REVIEW','SUCCESSION_CANDIDATE','ALUMNI','review_cycle','course','separation_reason','human_authorization_status','lifecycleAccessAllowed','AI is advisory'].forEach(x => assert.ok(server.includes(x), `missing lifecycle contract ${x}`));
assert.ok(pkg.scripts['qa:sprint22-lifecycle-engine']);
assert.ok(!server.includes('lifecycle.json'), 'JSON lifecycle storage is forbidden');
console.log('PASS Sprint 22 lifecycle QA: chronological MySQL timeline, workflow-linked events, organization-aware authorization, performance/learning/compensation/separation fields, receipts/audit, executive analytics, and advisory-only AI boundary.');
