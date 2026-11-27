// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import Login from './Login';
import RecuperarSenha from '../RecuperarSenha/RecuperarSenha';

function response(status: number, payload: unknown) {
  return { ok: status >= 200 && status < 300, status, json: async () => payload };
}
describe('Autenticação na interface', () => {
  beforeEach(() => { sessionStorage.clear(); localStorage.clear(); });
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
  it('autentica e usa o papel retornado pela API', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(response(200, { accessToken: 'token-ficticio' })).mockResolvedValueOnce(response(200, { role: 'ADMIN' }));
    vi.stubGlobal('fetch', fetch); const enter = vi.fn();
    render(<Login onEntrar={enter} onEsqueciSenha={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'admin@teste.local' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'senha-ficticia' } });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    await waitFor(() => expect(enter).toHaveBeenCalledWith('ADMIN'));
    expect(sessionStorage.getItem('mov.accessToken')).toBe('token-ficticio');
    expect(new Headers(fetch.mock.calls[1][1].headers).get('Authorization')).toBe('Bearer token-ficticio');
  });
  it('mostra falha de rede e remove token quando a consulta de perfil falha', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(response(200, { accessToken: 'token-ficticio' })).mockRejectedValueOnce(new TypeError('offline')));
    const enter = vi.fn(); render(<Login onEntrar={enter} onEsqueciSenha={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'admin@teste.local' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'senha-ficticia' } });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    expect((await screen.findByRole('alert')).textContent).toMatch(/acessar a API/);
    expect(enter).not.toHaveBeenCalled(); expect(sessionStorage.getItem('mov.accessToken')).toBeNull();
  });
  it('recuperação exibe confirmação genérica e não revela se a conta existe', async () => {
    const fetch = vi.fn().mockResolvedValue(response(202, { message: 'ok' })); vi.stubGlobal('fetch', fetch);
    render(<RecuperarSenha onVoltar={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'PESSOA@TESTE.LOCAL' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar link de recuperação' }));
    expect((await screen.findByRole('status')).textContent).toMatch(/estiver cadastrado/);
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ email: 'pessoa@teste.local' });
  });
});
