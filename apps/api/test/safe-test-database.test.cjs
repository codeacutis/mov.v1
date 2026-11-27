const { safeTestDatabaseUrl } = require('./prepare-test-db.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
test('permite somente banco local de teste sem parâmetros', () => {
  assert.equal(safeTestDatabaseUrl('postgresql://test@127.0.0.1:55439/mov_test'), 'postgresql://test@127.0.0.1:55439/mov_test');
  for (const value of [undefined, 'postgresql://test@remote/mov_test', 'postgresql://test@localhost/mov', 'postgresql://test@localhost/mov_test?host=remote', 'postgresql://test@localhost/mov_test_extra']) {
    assert.throws(() => safeTestDatabaseUrl(value));
  }
});
