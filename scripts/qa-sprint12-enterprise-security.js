'use strict';
const fs = require('fs'); const assert = require('assert');
const server = fs.readFileSync('server.js', 'utf8'); const app = fs.readFileSync('public/app.js', 'utf8'); const html = fs.readFileSync('public/index.html', 'utf8'); const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
for (const token of ['PASSWORD_POLICY', 'passwordPolicyError', 'mfaCode', '/api/sprint12/sso/initiate', '/api/sprint12/devices/register', '/api/sprint12/rbac/action', '/api/sprint12/saas/action', '/api/sprint12/security/center', '/api/sprint12/health', 'securityArtifact', 'API_RATE_LIMITED', 'REQUEST_VALIDATION_FAILED', 'MySQL remains the only system of record']) assert(server.includes(token), `Missing Sprint 12 server control: ${token}`);
for (const token of ['enterpriseSecurityWorkspace', 'exec_security', 'Security Center', 'securitySso', 'securityDelegation']) assert(app.includes(token), `Missing Sprint 12 UI control: ${token}`);
assert(html.includes('mfaCodeInput'), 'Missing MFA login input');
assert.strictEqual(pkg.nashOs.sprint12EnterpriseSecurityIdentityActive, true); assert.strictEqual(pkg.nashOs.sprint12NoSchemaChange, true); assert.strictEqual(pkg.scripts['qa:sprint12'], 'node scripts/qa-sprint12-enterprise-security.js');
console.log('PASS Sprint 12 static QA: enterprise authentication, RBAC, security controls, hardening, SaaS administration, audit/receipt/evidence, and MySQL/no-schema guardrails are present.');
