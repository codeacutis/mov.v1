// Todos os testes e2e apagam dados: somente banco local descartável.
import { safeTestDatabaseUrl } from './safe-test-database';
process.env.DATABASE_URL = safeTestDatabaseUrl(process.env.TEST_DATABASE_URL);
process.env.JWT_SECRET = 'segredo-de-teste-com-mais-de-32-caracteres-xxxxxxxx';
process.env.SESSION_TTL_SECONDS = '300';
