import { ConfigService } from '@nestjs/config';
import { BrevoPasswordResetNotifier } from './brevo-password-reset.notifier';

// Dados 100% fictícios.
// Fake isolado do ambiente: o ConfigService real dá prioridade a process.env,
// e o CI define WEB_ORIGIN, o que tornaria o teste dependente de onde roda.
const config = (values: Record<string, string>): ConfigService =>
  ({
    get: (key: string) => values[key],
    getOrThrow: (key: string) => {
      if (!(key in values)) throw new Error(`${key} ausente`);
      return values[key];
    },
  }) as unknown as ConfigService;

describe('BrevoPasswordResetNotifier', () => {
  const env = {
    BREVO_API_KEY: 'chave-ficticia',
    MAIL_FROM_EMAIL: 'envio@teste.local',
    WEB_ORIGIN: 'https://web.teste.local',
  };
  let fetchMock: jest.SpyInstance;

  beforeEach(() => {
    fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response('{}', { status: 201 }));
  });
  afterEach(() => jest.restoreAllMocks());

  it('envia à API do Brevo com chave, destinatário e link com o token', async () => {
    const n = new BrevoPasswordResetNotifier(config(env));
    await n.send({
      email: 'maria@teste.local',
      name: 'Maria <b>',
      token: 'tok_123',
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.brevo.com/v3/smtp/email');
    expect((init.headers as Record<string, string>)['api-key']).toBe(
      'chave-ficticia',
    );
    const body = JSON.parse(init.body as string);
    expect(body.to[0].email).toBe('maria@teste.local');
    expect(body.htmlContent).toContain(
      'https://web.teste.local/redefinir-senha?token=tok_123',
    );
    expect(body.htmlContent).not.toContain('<b>');
  });

  it('não lança nem registra o token quando o Brevo recusa', async () => {
    fetchMock.mockResolvedValue(new Response('erro tok_123', { status: 401 }));
    const n = new BrevoPasswordResetNotifier(config(env));
    const error = jest
      .spyOn(n['logger'], 'error')
      .mockImplementation(() => undefined);
    await expect(
      n.send({ email: 'a@teste.local', name: 'A', token: 'tok_123' }),
    ).resolves.toBeUndefined();
    expect(error).toHaveBeenCalledWith(expect.stringContaining('401'));
    expect(JSON.stringify(error.mock.calls)).not.toContain('tok_123');
  });
});
