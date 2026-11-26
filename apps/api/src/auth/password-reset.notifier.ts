import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface PasswordResetNotification {
  email: string;
  name: string;
  /** Token em claro. Só pode trafegar até o canal de entrega; nunca persistir/logar. */
  token: string;
}

/**
 * Canal de entrega do link de recuperação. É uma abstração para que o provedor
 * (e-mail/SMTP etc.) seja decidido depois e para permitir mock nos testes —
 * mesmo padrão previsto para o WhatsApp (DEVELOPMENT.md §7). PENDING: provedor.
 */
export abstract class PasswordResetNotifier {
  abstract send(notification: PasswordResetNotification): Promise<void>;
}

/** Monta o link do front que recebe ?token=... */
export function buildResetLink(config: ConfigService, token: string): string {
  const base =
    config.get<string>('PASSWORD_RESET_URL') ??
    `${config.get<string>('WEB_ORIGIN') ?? 'http://localhost:5173'}/redefinir-senha`;
  return `${base}?token=${encodeURIComponent(token)}`;
}

/**
 * Implementação padrão enquanto não há provedor de e-mail. Em produção não
 * entrega nada. Somente em desenvolvimento, com opt-in explícito
 * (PASSWORD_RESET_DEV_LOG=true), escreve o link no console para permitir testes
 * manuais — é a única exceção consciente à regra de não logar tokens.
 */
@Injectable()
export class DevPasswordResetNotifier extends PasswordResetNotifier {
  private readonly logger = new Logger('PasswordReset');

  constructor(private readonly config: ConfigService) {
    super();
  }

  send({ token }: PasswordResetNotification): Promise<void> {
    const devLog =
      this.config.get<string>('PASSWORD_RESET_DEV_LOG') === 'true' &&
      this.config.get<string>('NODE_ENV') !== 'production';

    if (!devLog) {
      this.logger.warn(
        'Nenhum provedor de e-mail configurado: link de recuperação não foi entregue',
      );
      return Promise.resolve();
    }
    this.logger.warn(
      `[DEV] Link de recuperação: ${buildResetLink(this.config, token)}`,
    );
    return Promise.resolve();
  }
}
