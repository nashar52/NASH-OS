'use strict';

const fs = require('fs');
const server = fs.readFileSync('server.js', 'utf8');
const app = fs.readFileSync('public/app.js', 'utf8');
const checks = [];
const check = (name, pass) => { checks.push({ name, pass }); console.log(`${pass ? 'PASS' : 'FAIL'} ${name}`); };

check('Recruitment dashboard is protected for HR', server.includes("/api/recruitment/dashboard', requireSession(['hr'])"));
check('Requisition and position approval workflows exist', server.includes('/api/recruitment/requisitions') && server.includes('/approval'));
check('Internal and external job posting is enforced', server.includes("['INTERNAL','EXTERNAL']") && server.includes('careerPortalUrl'));
check('Candidate profile, resume parsing, and advisory matching exist', server.includes('resumeParsed') && server.includes('/candidates/:id/match') && server.includes('AI matching is advisory only'));
check('Interview, scorecard, and assessment workflows exist', ['/api/recruitment/interviews', '/api/recruitment/scorecards', '/api/recruitment/assessments'].every(route => server.includes(route)));
check('Offer, background check, hiring approval, and onboarding trigger exist', server.includes('/api/recruitment/offers') && server.includes('/api/recruitment/background-checks') && server.includes('DIGITAL_ONBOARDING_TRIGGERED'));
check('Analytics include time-to-hire, cost-per-hire, and pipeline', ['timeToHireDays', 'costPerHire', "'APPLIED','SCREENING','INTERVIEW','ASSESSMENT','OFFER','HIRED'"].every(text => server.includes(text)));
check('Recruitment UI exposes every controlled workflow action', ['requisition','posting','candidate','interview','scorecard','assessment','offer','background'].every(action => app.includes(`actionButton('${action}'`)));
check('Recruitment UI routes actions through the ATS API', app.includes('recruitmentForm') && app.includes('/api/recruitment/'));
check('No database schema migration was introduced', !server.includes('ALTER TABLE') && !server.includes('CREATE TABLE'));

const failed = checks.filter(item => !item.pass);
console.log(`Recruitment ATS QA ${checks.length - failed.length}/${checks.length}`);
process.exit(failed.length ? 1 : 0);
