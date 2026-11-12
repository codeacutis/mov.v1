import { Role } from '../generated/prisma/client';

export interface AuthUser {
  id: string;
  name: string;
  role: Role;
}

export interface JwtPayload {
  sub: string;
  role: Role;
}
