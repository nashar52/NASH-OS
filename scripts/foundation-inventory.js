const mysql = require('mysql2/promise');
const { dbConfig } = require('./env');

const MODULE_RULES = [
  ['Employee Master', /employee|department|position|contract/i],
  ['Workday / Tasks', /task|work|attendance|presence|shift/i],
  ['Review / Approval', /review|approval|beneficiary|receipt/i],
  ['Performance', /performance|evaluation|factor/i],
  ['Training', /training|learning|course|development/i],
  ['Compensation / Payroll', /payroll|salary|wage|wps|compensation|allowance|deduction/i],
  ['Government Compliance', /gosi|qiwa|mudad|nitaqat|permit|compliance|saud/i],
  ['Evidence / Audit', /evidence|audit|log|trail|receipt/i]
];

function classify(table) {
  const matches = MODULE_RULES.filter(([, re]) => re.test(table)).map(([name]) => name);
  return matches.length ? matches : ['Unclassified / Needs Mapping'];
}

async function main() {
  const cfg = dbConfig();
  const conn = await mysql.createConnection(cfg);
  const [tables] = await conn.query(
    'SELECT table_name AS name FROM information_schema.tables WHERE table_schema = ? ORDER BY table_name',
    [cfg.database]
  );
  const inventory = tables.map((row) => ({ table: row.name, module: classify(row.name) }));
  await conn.end();
  console.log(JSON.stringify({
    lock: 'NASH_OS_CLEAN_BUILD_00_FOUNDATION_LOCK',
    database: cfg.database,
    tableCount: inventory.length,
    inventory
  }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
