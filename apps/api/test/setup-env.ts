// Os testes e2e usam um banco PostgreSQL SEPARADO e descartável (nunca o de
// desenvolvimento). Os dados são todos fictícios.
const url = process.env.TEST_DATABASE_URL;
if (!url || !/_test(\?|$)/.test(url)) {
  throw new Error(
    'Defina TEST_DATABASE_URL apontando para um banco cujo nome termine em _test',
  );
}
process.env.DATABASE_URL = url;
process.env.JWT_SECRET = 'segredo-de-teste-com-mais-de-32-caracteres-xxxxxxxx';
process.env.SESSION_TTL_SECONDS = '300';
