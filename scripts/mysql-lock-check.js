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
  if (!cfg.host || !cfg.database || !cfg.user || !process.env.DB_PASSWORD) throw Object.assign(new Error('Database configuration is incomplete. Set DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, and DB_NAME in an untracked .env file.'), { code: 'NASH_DB_CONFIGURATION_MISSING' });
  let conn;
  try { conn = await mysql.createConnection(cfg); } catch (error) { const code = error.code || 'UNKNOWN'; const classifications = { ECONNREFUSED: 'Connection refused', ER_ACCESS_DENIED_ERROR: 'Authentication failed', ER_BAD_DB_ERROR: 'Database missing' }; throw Object.assign(new Error(`${classifications[code] || 'Database connection failed'} (${code}) at ${cfg.host}:${cfg.port}/${cfg.database}. ${error.message}`), { code }); }
  const counts = {};
  const missingTables = [];
  for (const table of TABLES) {
    if (await tableExists(conn, cfg.database, table)) {
      counts[table] = await countTable(conn, table);
    } else missingTables.push(table);
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
    missingTables,
    policy: {
      schemaMigrationIncluded: false,
      databaseSchemaTouched: false,
      legacyPatchUiAllowed: false,
      genericOperatingFormAllowed: false
    }
  };

  if (missingTables.length) { console.error(JSON.stringify(result, null, 2)); console.error(`Required table missing: ${missingTables.join(', ')}`); process.exit(3); }
  if (lock.mode !== 'mysql' || lock.sourceOfTruth !== 'mysql' || lock.fallbackActive || lock.jsonFallbackAllowed || lock.autoMigrate || lock.seedIfEmpty) {
    console.error(JSON.stringify(result, null, 2));
    process.exit(2);
  }
  console.log('NASH MySQL source lock passed. Schema capability status: required baseline tables available.');
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error('NASH Clean Build 00 MySQL runtime lock check failed.');
  console.error(`Classification: ${error.code === 'NASH_DB_CONFIGURATION_MISSING' ? 'Configuration missing' : error.code || 'Schema capability missing'}`);
  console.error(error.message);
  process.exit(1);
});
