const mysql = require('mysql2/promise');
const { dbConfig, runtimeLock } = require('./env');

const TABLES = ['departments', 'positions', 'employees', 'tasks', 'approval_requests', 'audit_trail', 'reviews', 'payroll_cycles'];

async function tableExists(conn, db, table) {
  const [rows] = await conn.query(
    'SELECT COUNT(*) AS c FROM information_schema.tables WHERE table_schema = ? AND table_name = ?',
    [db, table]
  );
  return rows[0].c > 0;
}

async function countTable(conn, table) {
  const [rows] = await conn.query(`SELECT COUNT(*) AS c FROM \`${table}\``);
  return rows[0].c;
}

async function main() {
  const cfg = dbConfig();
  const lock = runtimeLock();
  const conn = await mysql.createConnection(cfg);
  const counts = {};
  for (const table of TABLES) {
    if (await tableExists(conn, cfg.database, table)) {
      counts[table] = await countTable(conn, table);
    }
  }
  await conn.end();

  const result = {
    ok: true,
    lock: 'NASH_OS_CLEAN_BUILD_00_FOUNDATION_LOCK',
    database: {
      mode: lock.mode,
      locked: lock.locked,
      sourceOfTruth: lock.sourceOfTruth,
      primaryMode: 'mysql',
      fallbackActive: lock.fallbackActive,
      jsonFallbackAllowed: lock.jsonFallbackAllowed,
      jsonPrimaryBlocked: lock.jsonPrimaryBlocked,
      host: cfg.host,
      port: cfg.port,
      database: cfg.database,
      user: cfg.user,
      autoMigrate: lock.autoMigrate,
      seedIfEmpty: lock.seedIfEmpty
    },
    counts,
    policy: {
      schemaMigrationIncluded: false,
      databaseSchemaTouched: false,
      legacyPatchUiAllowed: false,
      genericOperatingFormAllowed: false
    }
  };

  if (lock.mode !== 'mysql' || lock.sourceOfTruth !== 'mysql' || lock.fallbackActive || lock.jsonFallbackAllowed || lock.autoMigrate || lock.seedIfEmpty) {
    console.error(JSON.stringify(result, null, 2));
    process.exit(2);
  }
  console.log('NASH Clean Build 00 MySQL runtime lock check passed.');
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error('NASH Clean Build 00 MySQL runtime lock check failed.');
  console.error(error.message);
  process.exit(1);
});
