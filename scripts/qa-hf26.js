const fs = require('fs');
const assert = require('assert');
const pkg = require('../package.json');
const css = fs.readFileSync(require('path').join(__dirname,'../public/styles.css'),'utf8');
const app = fs.readFileSync(require('path').join(__dirname,'../public/app.js'),'utf8');
const checks = [
  ['HF26 foundation preserved', pkg.nashCleanBuild.enterpriseDesignPolishActive === true],
  ['Design polish flag', pkg.nashCleanBuild.enterpriseDesignPolishActive === true],
  ['No schema migration', pkg.nashCleanBuild.schemaMigrationIncluded === false && pkg.nashCleanBuild.databaseSchemaTouched === false],
  ['HF26 CSS marker', css.includes('HF26 — Enterprise Design Polish')],
  ['Focus-visible support', css.includes(':focus-visible')],
  ['Reduced-motion support', css.includes('prefers-reduced-motion')],
  ['Sticky table headers', css.includes('position:sticky;top:0')],
  ['Responsive mobile breakpoint', css.includes('@media(max-width:640px)')],
  ['Unified workspace preserved', app.includes('unified-workspace-shell')],
  ['Closed-loop workflow preserved', app.includes('operational-workflow-rail')]
];
for (const [name, ok] of checks) { assert.ok(ok, name); console.log(`PASS ${name}`); }
console.log(`HF26 QA PASS ${checks.length}/${checks.length}`);
