'use strict';

const assert = require('assert');
const { spawn } = require('child_process');

const port = 3117;
const baseUrl = `http://127.0.0.1:${port}`;
let server;

async function request(path, options = {}) {
  return fetch(`${baseUrl}${path}`, options);
}

async function login(email) {
  const response = await request('/api/access/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tenant: 'NASH Enterprise', email, password: '123456' })
  });
  assert.equal(response.status, 200, `Expected login for ${email} to succeed.`);
  return (await response.json()).session.token;
}

async function waitForServer() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const response = await request('/');
      if (response.ok) return;
    } catch (_) { /* Server is still starting. */ }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('Timed out waiting for the NASH OS server.');
}

async function run() {
  server = spawn(process.execPath, ['server.js'], { env: { ...process.env, PORT: String(port) }, stdio: 'ignore' });
  await waitForServer();

  const anonymous = await request('/api/saas/tenants');
  assert.equal(anonymous.status, 401, 'Control plane must reject anonymous access.');
  assert.ok(anonymous.headers.get('content-security-policy'), 'CSP header must be present.');
  assert.equal(anonymous.headers.get('x-frame-options'), 'DENY', 'Framing must be blocked.');
  assert.ok(anonymous.headers.get('x-request-id'), 'Request ID must be present.');

  const employeeToken = await login('employee@nash.local');
  const employee = await request('/api/saas/tenants', { headers: { 'X-NASH-SESSION': employeeToken } });
  assert.equal(employee.status, 403, 'Non-executive roles must not access the SaaS control plane.');

  const executiveToken = await login('executive@nash.local');
  const executive = await request('/api/saas/tenants', { headers: { 'X-NASH-SESSION': executiveToken } });
  assert.equal(executive.status, 200, 'Executive role must retain control-plane access.');
  console.log('PASS security boundaries');
}

run().catch((error) => {
  console.error(`FAIL security boundaries: ${error.message}`);
  process.exitCode = 1;
}).finally(() => {
  if (server) server.kill();
});
