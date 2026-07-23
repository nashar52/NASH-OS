'use strict';
const { spawn } = require('child_process');
const assert = require('assert');
const port = 3188;
const base = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['server.js'], { env: { ...process.env, PORT: String(port) }, stdio: ['ignore', 'pipe', 'pipe'] });
let log = '';
server.stdout.on('data', (chunk) => { log += chunk; });
server.stderr.on('data', (chunk) => { log += chunk; });
async function waitForServer() {
  for (let i = 0; i < 80; i += 1) {
    try { const response = await fetch(`${base}/api/access/session`); if ([401, 200].includes(response.status)) return; } catch (_) { /* keep waiting */ }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Server did not start. ${log}`);
}
async function request(path, options = {}, token) {
  const response = await fetch(`${base}${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...(token ? { 'X-NASH-SESSION': token } : {}), ...(options.headers || {}) } });
  const data = await response.json();
  return { response, data };
}
(async () => {
  await waitForServer();
  const login = await request('/api/access/login', { method: 'POST', body: JSON.stringify({ tenant: 'NASH E2E', email: 'hr@nash.local', password: 'secure123' }) });
  assert.equal(login.response.status, 200, JSON.stringify(login.data));
  const token = login.data.session.token;
  const forbidden = await request('/api/hr-core/dashboard');
  assert.equal(forbidden.response.status, 401);
  const dashboard = await request('/api/hr-core/dashboard', {}, token);
  assert.equal(dashboard.response.status, 200);
  const cases = {
    employees: { fullName: 'Amina Test', employeeCode: 'E2E-001', workEmail: 'amina@example.com' },
    organizations: { name: 'People Operations', code: 'PO-E2E' },
    positions: { title: 'HR Analyst', code: 'POS-E2E' },
    jobDescriptions: { title: 'HR Analyst JD', positionCode: 'POS-E2E' },
    candidates: { fullName: 'Khalid Candidate', jobTitle: 'HR Analyst' },
    onboarding: { employeeName: 'Amina Test', startDate: '2026-08-01' },
    lifecycle: { employeeName: 'Amina Test', eventType: 'Transfer' }
  };
  for (const [collection, body] of Object.entries(cases)) {
    const created = await request(`/api/hr-core/${collection}`, { method: 'POST', body: JSON.stringify(body) }, token);
    assert.equal(created.response.status, 201, `${collection}: ${JSON.stringify(created.data)}`);
    assert.equal(created.data.entity.status, 'DRAFT');
    const transitioned = await request(`/api/hr-core/${collection}/${created.data.entity.id}/transition`, { method: 'POST', body: JSON.stringify({ status: 'IN_REVIEW', note: 'E2E progression' }) }, token);
    assert.equal(transitioned.response.status, 200, `${collection}: ${JSON.stringify(transitioned.data)}`);
    assert.equal(transitioned.data.entity.status, 'IN_REVIEW');
  }
  const finalDashboard = await request('/api/hr-core/dashboard', {}, token);
  for (const collection of Object.keys(cases)) assert.equal(finalDashboard.data.records[collection].length, 1, `${collection} missing from dashboard`);
  console.log('PASS Enterprise HR core E2E: all 7 workflows create, transition, audit, and appear on dashboard.');
})().catch((error) => { console.error(error.stack || error); process.exitCode = 1; }).finally(() => { server.kill('SIGTERM'); });
