const { spawnSync } = require('node:child_process');

function safeTestDatabaseUrl(value) {
  let url;
  try { url = new URL(value); } catch { throw new Error('TEST_DATABASE_URL deve apontar para PostgreSQL local descartável.'); }
  const name = decodeURIComponent(url.pathname.slice(1));
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || !/^[a-zA-Z0-9_]+_test$/.test(name) || url.search || url.hash) {
    throw new Error('Testes destrutivos exigem PostgreSQL local, banco terminado em _test e URL sem parâmetros.');
  }
  return value;
}

if (require.main === module) {
  const databaseUrl = safeTestDatabaseUrl(process.env.TEST_DATABASE_URL);
  const cli = require.resolve('prisma/build/index.js');
  const result = spawnSync(process.execPath, [cli, 'migrate', 'deploy', '--config', 'prisma7.config.ts'], { stdio: 'inherit', env: { ...process.env, DATABASE_URL: databaseUrl } });
  process.exit(result.status ?? 1);
}
module.exports = { safeTestDatabaseUrl };
