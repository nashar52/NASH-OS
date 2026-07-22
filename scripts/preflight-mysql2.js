try {
  require.resolve('mysql2/promise');
  console.log('[NASH PREFLIGHT] mysql2 dependency is installed and available.');
} catch (error) {
  console.error('[NASH PREFLIGHT] mysql2 package is not installed. Run: npm.cmd install');
  process.exit(1);
}
