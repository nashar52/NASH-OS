'use strict';
const fs = require('fs');
const assert = require('assert');
const html = fs.readFileSync('public/index.html', 'utf8');
const js = fs.readFileSync('public/app.js', 'utf8');
const css = fs.readFileSync('public/styles.css', 'utf8');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const checks = [
  ['login surface', html.includes('id="loginExperience"')],
  ['login form', html.includes('id="loginForm"')],
  ['role selector', html.includes('id="loginRoleSelect"')],
  ['demo access', html.includes('id="demoAccessBtn"')],
  ['sign out', html.includes('id="signOutBtn"')],
  ['session gate', js.includes('ACCESS_SESSION_KEY') && js.includes('initializeLoginExperience')],
  ['role binding', js.includes('state.role = ROLES[role] ? role')],
  ['login styling', css.includes('HF07 — Enterprise Login Experience')],
  ['schema untouched', pkg.nashCleanBuild.mysqlSchemaTouched === false && pkg.nashCleanBuild.databaseDataTouched === false]
];
for (const [name, ok] of checks) { assert.ok(ok, name); console.log(`PASS ${name}`); }
console.log('qa:hf07-login = PASS');
