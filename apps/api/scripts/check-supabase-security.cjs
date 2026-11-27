// Inspeção somente de metadados; não lê linhas de tabelas da aplicação.
require('dotenv').config({ quiet: true });
const { Client } = require('pg');
(async () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 10000 });
  try {
    await client.connect();
    await client.query('BEGIN READ ONLY');
    const roles = await client.query("SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated')");
    const names = new Set(roles.rows.map(row => row.rolname));
    if (!names.has('anon') || !names.has('authenticated')) {
      console.log('Papéis da Data API não encontrados; verifique a configuração no painel Supabase.');
    } else {
      const result = await client.query(`SELECT c.relname, c.relrowsecurity,
        has_table_privilege('anon', c.oid, 'SELECT,INSERT,UPDATE,DELETE') AS anon_grant,
        has_table_privilege('authenticated', c.oid, 'SELECT,INSERT,UPDATE,DELETE') AS authenticated_grant
        FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relkind IN ('r','p','v','m') ORDER BY c.relname`);
      console.log('Metadados do schema public (acesso efetivo depende da Data API, RLS e políticas):');
      for (const row of result.rows) console.log(`${row.relname}: RLS=${row.relrowsecurity}, anon=${row.anon_grant}, authenticated=${row.authenticated_grant}`);
      if (result.rows.some(row => !row.relrowsecurity && (row.anon_grant || row.authenticated_grant))) process.exitCode = 2;
    }
    await client.query('ROLLBACK');
  } catch (error) {
    console.error(`Não foi possível inspecionar metadados (${error && error.code ? error.code : 'erro de conexão'}).`);
    process.exitCode = 1;
  } finally { await client.end().catch(() => {}); }
})();
