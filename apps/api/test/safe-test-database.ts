// A mesma validação é usada também pelo preparador de migrations.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const helper = require('./prepare-test-db.cjs') as { safeTestDatabaseUrl(value: string | undefined): string };
export const safeTestDatabaseUrl = helper.safeTestDatabaseUrl;
