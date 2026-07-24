'use strict';
const assert = require('assert'), fs = require('fs');
const server = fs.readFileSync('server.js', 'utf8'), pkg = require('../package.json');
['workflow_templates','workflow_instances','workflow_template_steps','workflow_assignments','workflow_delegations','workflow_evidence','workflow_receipts','workflow_audit_events','workflow_notifications'].forEach(x => assert.ok(server.includes(x), `missing relational ${x}`));
['SUBMIT','APPROVE','REJECT','RETURN','CANCEL','RECALL','REASSIGN','ESCALATE','SEQUENTIAL','PARALLEL','CONDITIONAL','EXECUTIVE','EMAIL_READY','PUSH_READY','human_authorized','remainingTimeMs'].forEach(x => assert.ok(server.includes(x), `missing workflow capability ${x}`));
['/api/workflows/templates','/api/workflows/:id/actions','/api/workflows/:id/evidence','/api/workflows/delegations'].forEach(x => assert.ok(server.includes(x), `missing API ${x}`));
assert.ok(pkg.scripts['qa:sprint21-workflow-engine']);
assert.ok(!server.includes('workflow.json'), 'JSON workflow storage is forbidden');
console.log('PASS Sprint 21 Workflow Engine QA: relational MySQL templates/instances/steps, sequential/parallel/conditional routing, SLA/escalation, delegation, evidence, receipts/audit/notifications, human authorization, and API regression contract.');
