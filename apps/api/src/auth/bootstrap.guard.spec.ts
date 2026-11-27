import { ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BootstrapGuard } from './bootstrap.guard';

describe('Proteção de inicialização em produção', () => {
  const make = (env: string, expected?: string, supplied?: string) => {
    const config = { get: (key: string) => key === 'NODE_ENV' ? env : expected } as ConfigService;
    const ctx = { switchToHttp: () => ({ getRequest: () => ({ headers: { 'x-bootstrap-secret': supplied } }) }) } as unknown as ExecutionContext;
    return () => new BootstrapGuard(config).canActivate(ctx);
  };
  it('nega em produção quando o segredo está ausente, curto ou incorreto', () => {
    expect(make('production')).toThrow(); expect(make('production', 'curto', 'curto')).toThrow();
    expect(make('production', 'a'.repeat(32), 'b'.repeat(32))).toThrow();
  });
  it('aceita segredo correto e preserva desenvolvimento', () => {
    expect(make('production', 'a'.repeat(32), 'a'.repeat(32))()).toBe(true);
    expect(make('test')()).toBe(true);
  });
});
