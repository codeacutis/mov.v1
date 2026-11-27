import { applyDecorators } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';
import { ref } from './response-schemas';

/** Apenas metadados OpenAPI; os guards existentes continuam autorizando as rotas. */
export function ApiEndpoint(
  summary: string,
  options: {
    description?: string;
    schema?: SchemaObject;
    status?: number;
    access?: 'PUBLIC' | 'AUTHENTICATED' | 'ADMIN' | 'MOTORISTA';
    errors?: number[];
  } = {},
) {
  const access = options.access ?? 'ADMIN';
  const errors = new Set([
    400,
    500,
    ...(access === 'PUBLIC' ? [] : [401, 403]),
    ...(options.errors ?? []),
  ]);
  const descriptions: Record<number, string> = {
    400: 'Parâmetros ou corpo inválidos; validação ou regra de negócio não atendida.',
    401: 'Credenciais inválidas ou sessão ausente, expirada ou revogada.',
    403: 'Perfil sem permissão ou inicialização do sistema indisponível.',
    404: 'Registro não encontrado ou viagem não atribuída ao motorista autenticado.',
    409: 'Conflito: duplicidade, capacidade, agenda, estado ou vínculo incompatível.',
    500: 'Erro interno; resposta sem detalhes técnicos.',
  };
  return applyDecorators(
    ApiOperation({
      summary,
      description: `Acesso: ${access}. ${options.description ?? ''}`,
    }),
    ...(access === 'PUBLIC' ? [] : [ApiBearerAuth()]),
    ApiResponse({
      status: options.status ?? 200,
      description:
        options.status === 204
          ? 'Operação concluída, sem corpo.'
          : 'Operação concluída.',
      ...(options.schema ? { schema: options.schema } : {}),
    }),
    ...[...errors].map((status) =>
      ApiResponse({
        status,
        description: descriptions[status],
        schema: ref('ApiError'),
      }),
    ),
  );
}
