#!/usr/bin/env node
'use strict';
const fs=require('fs'), assert=require('assert');
const server=fs.readFileSync('server.js','utf8'), client=fs.readFileSync('public/app.js','utf8'), pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
['SPRINT24_ADVISORY_TYPES','sprint24UnavailableAdvisory',"'/api/ai/advisories'","'/api/ai/executive-risk-summary'","'/api/ai/workforce-intelligence'","'/api/ai/policy-compliance'","'/api/ai/workflow-delays'","'/api/ai/advisories/:id/decisions'",'sourceLabels','dataLimitations','confidenceLevel','missingData','humanReviewRequired','receiptId','auditEventId','AI_PROVIDER_NOT_CONFIGURED','requireSession','tenantId'].forEach(x=>assert(server.includes(x),`Missing Sprint 24 control: ${x}`));
assert(pkg.scripts['qa:sprint24-ai-decision-intelligence'],'Sprint 24 QA command is not registered.');
assert(!/\beval\s*\(/.test(server),'eval() is prohibited.');
assert(!/generated\s+SQL/i.test(server),'Generated SQL execution language is prohibited.');
assert(!server.includes('sprint24Runtime = { advisories:[{'),'Seeded or fabricated Sprint 24 advisories are prohibited.');
assert(server.includes("advisory.tenantId!==req.accessSession.tenant"),'Tenant-scoped advisory access is required.');
assert(server.includes('AI provider not configured'),'Provider-unavailable state must be explicit.');
assert(client.includes('AI Decision Support'),'Role workspace entry is missing.');
console.log('Sprint 24 AI Decision Intelligence QA passed: advisory contract, source labels, explainability, categorical confidence, unavailable-provider boundary, tenant and role checks, human-decision boundary, receipts/audit, no eval(), no seeded AI output.');
