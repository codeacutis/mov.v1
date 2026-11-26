import { ArgumentsHost, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { ApiExceptionFilter } from './api-exception.filter';

describe('ApiExceptionFilter', () => {
  const filter = new ApiExceptionFilter();
  const json = jest.fn();
  const status = jest.fn(() => ({ json }));
  const host = { switchToHttp: () => ({ getResponse: () => ({ status }) }) } as unknown as ArgumentsHost;
  beforeEach(() => jest.clearAllMocks());

  it('preserva mensagens e status de validacao', () => {
    filter.catch(new BadRequestException(['campo invalido']), host);
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({ statusCode: 400, message: ['campo invalido'] });
  });
  it.each([['P2002', 409], ['P2003', 409], ['P2025', 404]])('traduz erro Prisma %s', (code, expected) => {
    filter.catch(new Prisma.PrismaClientKnownRequestError('detalhes internos', { code, clientVersion: 'test' }), host);
    expect(status).toHaveBeenCalledWith(expected);
    expect(JSON.stringify(json.mock.calls)).not.toContain('detalhes internos');
  });
  it('oculta detalhes de erros internos', () => {
    filter.catch(new InternalServerErrorException('SQL e stack privados'), host);
    expect(status).toHaveBeenCalledWith(500);
    expect(JSON.stringify(json.mock.calls)).not.toContain('SQL e stack privados');
  });
});
