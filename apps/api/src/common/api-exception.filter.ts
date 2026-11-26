import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { Prisma } from '../generated/prisma/client';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Erro interno do servidor. Tente novamente mais tarde.';

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') {
        status = HttpStatus.CONFLICT;
        message = 'Já existe um registro com esses dados.';
      } else if (exception.code === 'P2003') {
        status = HttpStatus.CONFLICT;
        message = 'A operação conflita com um registro relacionado.';
      } else if (exception.code === 'P2025') {
        status = HttpStatus.NOT_FOUND;
        message = 'Registro não encontrado.';
      }
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      if (status < 500) {
        const body = exception.getResponse();
        const candidate = typeof body === 'string' ? body : (body as { message?: unknown }).message;
        if (typeof candidate === 'string' || (Array.isArray(candidate) && candidate.every(item => typeof item === 'string'))) message = candidate;
        else message = 'Não foi possível concluir a operação.';
      }
    }
    response.status(status).json({ statusCode: status, message });
  }
}
