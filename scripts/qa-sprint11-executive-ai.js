'use strict';
const fs = require('fs');
const assert = require('assert');
const server = fs.readFileSync('server.js', 'utf8');
const app = fs.readFileSync('public/app.js', 'utf8');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
for (const token of [
  "app.get('/api/sprint11/center'", "app.post('/api/sprint11/decision'", "app.post('/api/sprint11/reports'",
  'mysqlOnlySourceOfTruth: true', 'noSchemaChange: true', 'humanApprovalRequired: true',
  'auditEvidenceRuntimeReceiptRequired: true', 'confidenceScore', 'riskScore', 'executiveTimeline'
]) assert(server.includes(token), `Missing Sprint 11 server contract: ${token}`);
for (const token of ['Export PDF', 'Export Excel CSV', 'Schedule Report', 'Record Human Decision', '/api/sprint11/reports', '/api/sprint11/decision']) assert(app.includes(token), `Missing Sprint 11 UI action: ${token}`);
assert.strictEqual(pkg.nashOs.sprint11EnterpriseExecutiveAiAnalyticsActive, true);
assert.strictEqual(pkg.nashOs.sprint11NoSchemaChange, true);
assert.strictEqual(pkg.scripts['qa:sprint11'], 'node scripts/qa-sprint11-executive-ai.js');
console.log('PASS Sprint 11 static QA: executive dashboards, analytics, human AI decisions, reports, audit/evidence/receipts, and MySQL/no-schema policy contracts are present.');
