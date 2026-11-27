import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { responseSchemas } from './response-schemas';

export function swaggerEnabled(env: NodeJS.ProcessEnv): boolean {
  if (
    env.SWAGGER_ENABLED !== undefined &&
    !['true', 'false'].includes(env.SWAGGER_ENABLED)
  ) {
    throw new Error('SWAGGER_ENABLED deve ser true ou false');
  }
  return env.SWAGGER_ENABLED === undefined
    ? env.NODE_ENV !== 'production'
    : env.SWAGGER_ENABLED === 'true';
}

export function createApiDocument(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('Mov+')
    .setDescription(
      'API de transporte municipal de pacientes. ADMIN administra o planejamento; MOTORISTA opera somente viagens atribuídas. Autentique em /auth/login e informe o accessToken em Authorize. Exemplos devem usar dados fictícios. As operações respeitam os guards e as regras da API. Datas em ISO 8601; informe o fuso horário. Não inclua diagnósticos nas observações.',
    )
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' })
    .build();
  const document = SwaggerModule.createDocument(app, config);
  document.components ??= {};
  document.components.schemas = {
    ...document.components.schemas,
    ...responseSchemas,
  };
  return document;
}

export function setupSwagger(
  app: INestApplication,
  env: NodeJS.ProcessEnv = process.env,
) {
  if (!swaggerEnabled(env)) return;
  SwaggerModule.setup('api/docs', app, createApiDocument(app), {
    jsonDocumentUrl: '/api/docs-json',
    yamlDocumentUrl: '/api/docs-yaml',
    swaggerOptions: {
      persistAuthorization: false,
      displayRequestDuration: true,
      validatorUrl: null,
    },
  });
}
