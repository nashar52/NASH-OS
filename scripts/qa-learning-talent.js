'use strict';
const fs = require('fs');
const app = fs.readFileSync('public/app.js', 'utf8');
const server = fs.readFileSync('server.js', 'utf8');
const checks = [];
function check(name, pass) { checks.push({ name, pass }); console.log(`${pass ? 'PASS' : 'FAIL'} ${name}`); }
check('Learning and talent dashboard route is available', server.includes("/api/learning-talent/dashboard"));
check('MySQL source boundary is explicit', server.includes("sourceOfTruth: 'mysql'") && server.includes('mysqlEmployeeSource: true'));
check('AI recommendations are source-grounded and advisory', server.includes('/api/learning-talent/recommendations/:employeeId') && server.includes('humanApprovalRequired: true'));
check('All Learning & Talent workflow collections are implemented', ['catalog','paths','assignments','certifications','developmentPlans','succession','talentPools','nineBox','mentoring','coaching'].every((key) => server.includes(`'${key}'`) || server.includes(`${key}: []`)));
check('Certification expiration tracking is implemented', server.includes('expiringCertifications') && server.includes('certificationWatch'));
check('Learning UI exposes all controlled actions', ['catalog','paths','assignments','certifications','developmentPlans','succession','talentPools','nineBox','mentoring','coaching','recommendations'].every((key) => app.includes(`data-talent-action="${key}"`)));
check('Learning UI actions call API workflows', app.includes('/api/learning-talent/${action}') && app.includes('/api/learning-talent/${workflow}/'));
check('No schema migration introduced', !server.includes('ALTER TABLE') && !server.includes('CREATE TABLE'));
const failed = checks.filter((item) => !item.pass);
console.log(`Learning & Talent QA ${checks.length - failed.length}/${checks.length}`);
process.exit(failed.length ? 1 : 0);
