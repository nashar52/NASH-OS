'use strict';
const assert = require('assert');
const { spawn } = require('child_process');

const port = 3110;
const baseUrl = `http://127.0.0.1:${port}`;
const accounts = [
  ['employee@nash.local', 'employee'],
  ['manager@nash.local', 'manager'],
  ['hr@nash.local', 'hr'],
  ['executive@nash.local', 'executive']
];
const server = spawn(process.execPath, ['server.js'], { env: { ...process.env, PORT: String(port), NODE_ENV: 'development' }, stdio: ['ignore', 'pipe', 'pipe'] });
let output = '';
server.stdout.on('data', (chunk) => { output += chunk; });
server.stderr.on('data', (chunk) => { output += chunk; });

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const body = await response.json();
  return { response, body };
}
async function login(email, password = 'NashDemo@2026', mfaCode = '000000') {
  return request('/api/access/login', { method: 'POST', body: { tenant: 'NASH Enterprise', email, password, mfaCode } });
}
async function waitForServer() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try { if ((await fetch(`${baseUrl}/api/access/config`)).ok) return; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Server did not start. ${output}`);
}
async function main() {
  await waitForServer();
  const config = await request('/api/access/config');
  assert.strictEqual(config.body.localDevelopment, true, 'local development config should be enabled');

  for (const [email, role] of accounts) {
    const result = await login(email);
    assert.strictEqual(result.response.status, 200, `${email} should sign in`);
    assert.strictEqual(result.body.session.role, role, `${email} must receive its assigned role`);
    assert.strictEqual(result.body.policy.roleSwitchingBlocked, true, 'role switching must remain blocked');
    const token = result.body.session.token;
    const verified = await request('/api/access/session', { headers: { 'X-NASH-SESSION': token } });
    assert.strictEqual(verified.response.status, 200, 'session should verify');
    assert.strictEqual(verified.body.session.role, role, 'verified session role must match assigned role');
    const logout = await request('/api/access/logout', { method: 'POST', headers: { 'X-NASH-SESSION': token } });
    assert.strictEqual(logout.response.status, 200, 'logout should succeed');
    const expired = await request('/api/access/session', { headers: { 'X-NASH-SESSION': token } });
    assert.strictEqual(expired.response.status, 401, 'logged out session should not verify');
  }

  let result = await login('employee@nash.local', 'Incorrect@2026');
  assert.strictEqual(result.response.status, 401); assert.strictEqual(result.body.error, 'Invalid email or password');
  result = await login('employee@nash.local', 'NashDemo@2026', '111111');
  assert.strictEqual(result.response.status, 401); assert.strictEqual(result.body.error, 'Invalid MFA code');
  result = await login('missing@nash.local');
  assert.strictEqual(result.response.status, 403); assert.strictEqual(result.body.error, 'Account not configured');
  for (let attempt = 0; attempt < 10; attempt += 1) await login('limited@nash.local', 'Incorrect@2026');
  result = await login('limited@nash.local', 'Incorrect@2026');
  assert.strictEqual(result.response.status, 429); assert.strictEqual(result.body.error, 'Too many login attempts');
  console.log('PASS local authentication QA: all demo roles, credential rejection, MFA, role binding, session verification, logout, and throttling.');
}
main().catch((error) => { console.error(error.stack); process.exitCode = 1; }).finally(() => server.kill());
