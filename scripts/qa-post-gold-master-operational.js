'use strict';

/**
 * Post-Gold Master operational validation.
 *
 * Starts the application from a new temporary working directory with a deliberately
 * unreachable MySQL port. This proves that local environment files and prior runtime
 * state cannot make the checks pass, while retaining MySQL as the source of truth.
 */
const assert = require('assert');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const root = path.join(__dirname, '..');
const port = 3400 + Math.floor(Math.random() * 400);
const baseUrl = `http://127.0.0.1:${port}`;
const cleanCwd = fs.mkdtempSync(path.join(os.tmpdir(), 'nash-os-clean-'));
let child;

function request(method, route, { body, token } = {}) {
  return new Promise((resolve, reject) => {
    const payload = body === undefined ? null : JSON.stringify(body);
    const req = http.request(`${baseUrl}${route}`, {
      method,
      headers: {
        ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {}),
        ...(token ? { 'X-NASH-SESSION': token } : {})
      }
    }, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        let json;
        try { json = data ? JSON.parse(data) : null; } catch { json = null; }
        resolve({ status: res.statusCode, headers: res.headers, body: data, json });
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function waitForServer() {
  let lastError;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await request('GET', '/api/navigation/policy');
      if (response.status === 200) return;
    } catch (error) { lastError = error; }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw lastError || new Error('Server did not start.');
}

async function run(name, fn) {
  await fn();
  console.log(`PASS ${name}`);
}

async function main() {
  child = spawn(process.execPath, [path.join(root, 'server.js')], {
    cwd: cleanCwd,
    env: { PATH: process.env.PATH, HOME: cleanCwd, NODE_ENV: 'test', PORT: String(port), DB_HOST: '127.0.0.1', DB_PORT: '1', DB_USER: 'clean', DB_PASSWORD: '', DB_NAME: 'nash_os', NASH_SOURCE_OF_TRUTH: 'mysql', NASH_JSON_FALLBACK: 'false' },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let serverOutput = '';
  child.stdout.on('data', (chunk) => { serverOutput += chunk; });
  child.stderr.on('data', (chunk) => { serverOutput += chunk; });
  await waitForServer();

  await run('clean boot and browser security headers', async () => {
    const response = await request('GET', '/');
    assert.equal(response.status, 200);
    for (const header of ['x-request-id', 'x-content-type-options', 'x-frame-options', 'content-security-policy', 'cache-control']) assert(response.headers[header], `Missing ${header}`);
  });

  await run('unauthenticated workspace access is denied', async () => {
    const response = await request('GET', '/api/sprint12/security/center');
    assert.equal(response.status, 401);
  });

  const login = await request('POST', '/api/access/login', { body: { tenant: 'Validation Organization', email: 'employee@nash.local', password: 'ValidPassword1!', mfaCode: '000000' } });
  await run('MFA login creates an employee-bound session', async () => {
    assert.equal(login.status, 200);
    assert.equal(login.json?.session?.role, 'employee');
    assert(login.json?.session?.token);
  });
  const employeeToken = login.json.session.token;

  await run('employee RBAC blocks executive security center', async () => {
    const response = await request('GET', '/api/sprint12/security/center', { token: employeeToken });
    assert.equal(response.status, 403);
  });

  await run('permissioned employee action records runtime receipt', async () => {
    const response = await request('POST', '/api/permissioned-action', { token: employeeToken, body: { actionType: 'EMPLOYEE_PROFILE_EDIT_REQUEST', note: 'Post-Gold Master validation' } });
    assert.equal(response.status, 200);
    assert.equal(response.json?.receipt?.status, 'RECORDED_RUNTIME_ONLY');
    assert.equal(response.json?.receipt?.policy?.directDatabaseCrudBlocked, true);
  });

  await run('cross-role permissioned action is denied', async () => {
    const response = await request('POST', '/api/permissioned-action', { token: employeeToken, body: { actionType: 'EXEC_BRIEF' } });
    assert.equal(response.status, 403);
  });

  await run('clean-environment source outage is explicit and never fabricated', async () => {
    const response = await request('GET', '/api/workday/attendance/source');
    assert.equal(response.status, 503);
    assert.match(response.json?.error || '', /ECONNREFUSED|connect/i);
    assert.equal(response.body.includes('Employment_Contract.pdf'), false);
  });

  await run('rate-limited response retains trace and security headers', async () => {
    let response;
    for (let attempt = 0; attempt < 121; attempt += 1) response = await request('GET', '/api/validation/rate-limit');
    assert.equal(response.status, 429);
    assert(response.headers['x-request-id'], '429 must be correlated');
    assert.equal(response.headers['x-content-type-options'], 'nosniff');
    assert(response.headers['content-security-policy'], '429 must retain CSP');
    assert.equal(response.json?.auditTrail?.detail?.path, '/api/validation/rate-limit');
    assert(response.json?.runtimeReceipt?.requestId, '429 audit receipt must retain request id');
  });

  await run('logout invalidates session', async () => {
    const logout = await request('POST', '/api/access/logout', { token: employeeToken });
    assert.equal(logout.status, 200);
    const session = await request('GET', '/api/access/session', { token: employeeToken });
    assert.equal(session.status, 401);
  });

  console.log('qa:post-gold-master-operational = PASS');
  console.log('tracks=9; cleanEnvironment=true; mysqlSourceUnavailable=true; productionRecommendation=NO-GO');
  if (!serverOutput.includes('running at')) throw new Error('Boot evidence was not emitted.');
}

main().catch((error) => {
  console.error('qa:post-gold-master-operational = FAIL');
  console.error(error.stack || error.message);
  process.exitCode = 1;
}).finally(() => {
  if (child && !child.killed) child.kill('SIGTERM');
  fs.rmSync(cleanCwd, { recursive: true, force: true });
});
