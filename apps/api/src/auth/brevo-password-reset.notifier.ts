import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  PasswordResetNotification,
  PasswordResetNotifier,
  buildResetLink,
} from './password-reset.notifier';

const BREVO_URL = 'https://api.brevo.com/v3/smtp/email';
const REQUEST_TIMEOUT_MS = 10_000;

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/**
 * Entrega o link de recuperação pela API HTTP do Brevo (HTTPS/443). Usa HTTP e
 * não SMTP porque o Render bloqueia as portas SMTP no plano gratuito.
 * Nunca registra o token, o link nem o corpo da resposta.
 */
@Injectable()
export class BrevoPasswordResetNotifier extends PasswordResetNotifier {
  private readonly logger = new Logger('PasswordReset');
  private readonly apiKey: string;
  private readonly fromEmail: string;
  private readonly fromName: string;
  private readonly ttlMinutes: number;

  constructor(private readonly config: ConfigService) {
    super();
    this.apiKey = config.getOrThrow<string>('BREVO_API_KEY');
    this.fromEmail = config.getOrThrow<string>('MAIL_FROM_EMAIL');
    this.fromName = config.get<string>('MAIL_FROM_NAME') ?? 'Mov+';
    this.ttlMinutes = Math.round(
      Number(config.get<string>('PASSWORD_RESET_TTL_SECONDS') ?? 1800) / 60,
    );
  }

  async send({ email, name, token }: PasswordResetNotification): Promise<void> {
    const link = buildResetLink(this.config, token);
    const safeName = escapeHtml(name);
    const response = await fetch(BREVO_URL, {
      method: 'POST',
      headers: {
        'api-key': this.apiKey,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        sender: { email: this.fromEmail, name: this.fromName },
        to: [{ email, name }],
        subject: 'Recuperação de senha — Mov+',
        htmlContent:
          `<p>Olá, ${safeName}.</p>` +
          `<p>Recebemos um pedido para criar uma nova senha. ` +
          `<a href="${link}">Clique aqui para redefinir</a>. ` +
          `O link vale por ${this.ttlMinutes} minutos e só pode ser usado uma vez.</p>` +
          `<p>Se você não fez esse pedido, ignore este e-mail.</p>`,
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) {
      this.logger.error(`Brevo recusou o envio (HTTP ${response.status})`);
    }
  }
}
