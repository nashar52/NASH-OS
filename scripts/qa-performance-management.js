'use strict';

// Fast regression gate for the schema-preserving Performance Management sprint.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const client = fs.readFileSync(path.join(root, 'public', 'app.js'), 'utf8');

[
  "'/api/performance/dashboard'", "'/api/performance/cycles'", "'/api/performance/goals'",
  "'/api/performance/assessments'", "'/api/performance/feedback'", "'/api/performance/calibrations'",
  "'/api/performance/recommendations'"
].forEach((route) => assert(server.includes(route), `Missing Performance API route ${route}`));
assert(server.includes("requireSession(['hr', 'manager', 'executive'])"), 'Dashboard must be role protected.');
assert(server.includes('validIsoDate'), 'Performance API must validate dates.');
assert(server.includes('humanFinalDecisionRequired: true'), 'Human decision boundary must remain explicit.');
assert(server.includes('schemaChanged: false'), 'Performance sprint must not change the database schema.');
assert(client.includes('performanceManagementWorkspace'), 'Performance UI workspace is missing.');
assert(client.includes('performanceActionForm'), 'Performance UI actions must have forms.');
assert(client.includes("hr_performance: performanceManagementWorkspace"), 'HR Performance navigation must open the dedicated workspace.');
console.log('Performance management QA passed.');
