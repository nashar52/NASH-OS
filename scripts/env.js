const fs = require('fs');
const path = require('path');

function loadEnv() {
  const envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return;
  const raw = fs.readFileSync(envPath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

function dbConfig() {
  loadEnv();
  return {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3308),
    user: process.env.DB_USER || 'nash_new',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || process.env.DB_DATABASE || 'nash_os',
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
    multipleStatements: false
  };
}

function runtimeLock() {
  loadEnv();
  return {
    mode: process.env.DB_DRIVER || 'mysql',
    sourceOfTruth: process.env.NASH_SOURCE_OF_TRUTH || 'mysql',
    locked: String(process.env.NASH_RUNTIME_LOCK || 'true') === 'true',
    fallbackActive: false,
    jsonFallbackAllowed: String(process.env.NASH_JSON_FALLBACK || 'false') === 'true',
    jsonPrimaryBlocked: true,
    autoMigrate: String(process.env.DB_AUTO_MIGRATE || 'false') === 'true',
    seedIfEmpty: String(process.env.DB_SEED_IF_EMPTY || 'false') === 'true'
  };
}

module.exports = { loadEnv, dbConfig, runtimeLock };
