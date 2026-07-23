'use strict';

/** Sprint 13 release gate: static, deterministic checks that can run without MySQL. */
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = require(path.join(root, 'package.json'));
const app = read('public/app.js');
const html = read('public/index.html');
const server = read('server.js');
const releaseNotes = read('docs/SPRINT13_GOLD_MASTER_RC.md');

const checks = [
  ['release version', pkg.version === '1.0.0-gold-master-candidate'],
  ['Sprint 13 script registered', pkg.scripts['qa:sprint13'] === 'node scripts/qa-sprint13-gold-master-candidate.js'],
  ['release flags enabled', pkg.nashCleanBuild?.sprint13GoldMasterCandidateActive && pkg.nashCleanBuild?.demoAccessRemoved && pkg.nashCleanBuild?.placeholderDataRemoved],
  ['Gold Master page title', html.includes('NASH OS v1.0 — Gold Master Candidate')],
  ['demo access removed from login', !html.includes('demoAccessBtn') && !app.includes('demoAccessBtn') && !app.includes('demo: true')],
  ['no fabricated attendance calendar', !app.includes('July attendance calendar') && !app.includes('Late arrival · 8 Jul')],
  ['no fabricated employee documents', !app.includes('Employment_Contract.pdf') && !app.includes('Degree_Certificate.pdf')],
  ['attendance source summary is live', app.includes("/api/workday/attendance/source") && app.includes('No assumed exceptions are displayed.')],
  ['document empty state is explicit', app.includes('No controlled documents have been uploaded for this employee.')],
  ['session-based API authorization exists', server.includes('function requireSession(roles = [])') && server.includes("app.post('/api/access/login'")],
  ['security headers exist', server.includes("X-Content-Type-Options") && server.includes("Content-Security-Policy")],
  ['release documentation exists', releaseNotes.includes('Gold Master Candidate') && releaseNotes.includes('Known release boundary')]
];
const failures = checks.filter(([, passed]) => !passed).map(([name]) => name);
if (failures.length) {
  console.error('qa:sprint13 = FAIL');
  failures.forEach((failure) => console.error(` - ${failure}`));
  process.exit(1);
}
console.log('qa:sprint13 = PASS');
console.log(`validated ${checks.length} release-candidate gates`);
