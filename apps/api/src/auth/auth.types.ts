import { Role } from '../generated/prisma/client';

export interface AuthUser {
  id: string;
  name: string;
  role: Role;
  /** Sessão que autenticou a requisição (usada pelo logout). */
  sessionId: string;
}

/** O token carrega só identificadores; papel e situação vêm do banco. */
export interface JwtPayload {
  sub: string;
  sid: string;
}
