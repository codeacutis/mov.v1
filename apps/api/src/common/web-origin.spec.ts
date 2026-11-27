import { validateWebOrigin } from './web-origin';
describe('CORS em produção', () => {
  it.each([undefined, '*', 'http://example.test', 'https://example.test/path', 'https://example.test/'])('rejeita origem ausente ou insegura: %s', value => {
    expect(() => validateWebOrigin({ NODE_ENV: 'production', WEB_ORIGIN: value })).toThrow();
  });
  it('aceita origem HTTPS exata e preserva desenvolvimento', () => {
    expect(() => validateWebOrigin({ NODE_ENV: 'production', WEB_ORIGIN: 'https://mov.example.test' })).not.toThrow();
    expect(() => validateWebOrigin({ NODE_ENV: 'test' })).not.toThrow();
  });
});
