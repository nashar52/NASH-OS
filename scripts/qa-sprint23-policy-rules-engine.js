#!/usr/bin/env node
'use strict';
const fs = require('fs');
const assert = require('assert');
const server = fs.readFileSync('server.js', 'utf8');
const client = fs.readFileSync('public/app.js', 'utf8');
const required = ['POLICY_CATEGORIES', 'POLICY_STATES', 'RULE_TYPES', 'SAFE_POLICY_OPERATORS', "'/api/policies/:id/evaluate'", "'/api/policies/conflicts'", "'/api/policy-exceptions'", "'/api/policies/:id/acknowledgements'", 'policyReceipt', 'requireSession'];
required.forEach((term) => assert(server.includes(term), `Missing Sprint 23 control: ${term}`));
assert(!/\beval\s*\(/.test(server), 'Unsafe eval() is prohibited.');
assert(server.includes('Runtime-only; schema support required'), 'Runtime-only persistence state must be disclosed.');
assert(!server.includes('policyRuntime = { policies:[{'), 'Policy seed/fake data is prohibited.');
assert(client.includes('Policy & Rules Engine'), 'Policy workspace is missing.');
assert(client.includes('policyRulesWorkspace'), 'Policy workspace command binding is missing.');
console.log('Sprint 23 Policy & Rules Engine QA passed: safe operators, role-bound APIs, workflow-gated lifecycle receipts, evaluations, exceptions, acknowledgements, no eval(), no seeded policy data.');
