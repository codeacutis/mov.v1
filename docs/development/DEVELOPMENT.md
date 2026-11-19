# Desenvolvimento

## 1. Pré-requisitos

- Node.js em versão LTS compatível com a versão do NestJS adotada.
- npm (**PROPOSED** como gerenciador único; pnpm/yarn não misturar no mesmo clone).
- PostgreSQL.
- Git.
- Editor com suporte a TypeScript.

## 2. Organização do repositório

Monorepo: um Git, duas aplicações.

```text
apps/api    NestJS + Prisma + PostgreSQL
apps/web    React + TypeScript
docs/       produto, arquitetura e decisões
```

Cada aplicação deve ter o próprio `package.json`, `.env.example`, scripts e pipeline. Não colocar frontend e backend no mesmo `package.json`.

## 3. Backend

Stack: NestJS + TypeScript + Prisma + PostgreSQL.

Fluxo recomendado:
1. instalar dependências;
2. configurar `.env` local a partir de `.env.example`;
3. iniciar PostgreSQL local;
4. aplicar migrations;
5. executar aplicação em modo desenvolvimento;
6. executar testes e lint.

Não inventar comandos: os scripts reais devem ser registrados no README do repositório após a configuração inicial.

## 4. Frontend

Stack: React + TypeScript. Consumir a API REST; não duplicar regras críticas de negócio no frontend.

## 5. Variáveis de ambiente

Manter `.env.example` sem segredos. Variáveis esperadas (nomes ilustrativos, padronizar no código):
- `DATABASE_URL`
- `PORT`
- `JWT_SECRET` ou configuração equivalente
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_VERIFY_TOKEN`
- `WHATSAPP_APP_SECRET`

Nunca enviar valores reais ao Git.

## 6. Banco e migrations

- Prisma schema versionado.
- Migrations revisadas e aplicadas de forma reproduzível.
- Não editar banco de produção manualmente para contornar migrations.
- Fazer backup antes de operações destrutivas.
- Dados de seed devem ser fictícios.

## 7. Integrações

WhatsApp deve ser encapsulado por uma interface/provider para permitir mock e testes sem dependência da Meta. Webhooks devem ser idempotentes.

Serviços de geocodificação/rota não estão definidos. Não acoplar regra de negócio a um provedor antes da decisão.

## 8. Deploy

Vercel + Render + Supabase são opções propostas para demonstração acadêmica, não uma decisão de produção. Confirmar limites e políticas atuais. Não utilizar dados reais de saúde em ambiente gratuito sem avaliação formal.

## 8.1 Integração contínua

O workflow `.github/workflows/ci.yml` executa em pull requests e pushes para `main` ou `master`. Ele instala dependências com `npm ci`, executa lint, testes unitários, testes e2e da API com PostgreSQL descartável e builds da API e do frontend. O job usa apenas dados fictícios e um banco criado no runner.

Para habilitar o pipeline, envie o repositório ao GitHub com `.github/workflows` versionado. Em **Settings > Branches**, crie uma regra para exigir os status `API - lint, testes e build` e `Web - lint e build` antes do merge. O GitHub Actions executa o job em Linux, então a verificação usa os finais de linha normalizados pelo checkout.

## 8.2 Deploy com Render

O arquivo `render.yaml` descreve a API e o site estático. No Render, crie um Blueprint apontando para o repositório e informe `DATABASE_URL` e `WEB_ORIGIN` da API. Informe `VITE_API_URL` do frontend com a URL pública da API. O build da API aplica as migrations antes de compilar, então o banco deve estar acessível durante o deploy.

Nunca coloque `DATABASE_URL`, `JWT_SECRET`, tokens do WhatsApp ou outras credenciais em commits, variáveis `VITE_*` que devam ser secretas ou logs do pipeline. `VITE_API_URL` é configuração pública do frontend.

## 9. Comandos reais da API (`apps/api`)

```bash
cp .env.example .env            # preencha DATABASE_URL e JWT_SECRET (openssl rand -base64 48)
npm install                     # gera o Prisma Client no postinstall
npm run prisma:migrate          # aplica migrations (usa prisma7.config.ts)
npm run start:dev
npm test                        # unitários
TEST_DATABASE_URL=postgresql://USUARIO@localhost:5432/mov_test npm run test:e2e:prepare
TEST_DATABASE_URL=postgresql://USUARIO@localhost:5432/mov_test npm run test:e2e
```

O banco de teste deve ter nome terminando em `_test`; os e2e limpam as tabelas.

### Endpoints de autenticação

| Método | Rota | Acesso |
|---|---|---|
| POST | `/auth/bootstrap` | público, só enquanto não há usuários |
| POST | `/auth/login` | público |
| POST | `/auth/logout` | autenticado (204) |
| GET | `/auth/me` | autenticado |
| POST | `/auth/forgot-password` | público (202, resposta sempre igual) |
| POST | `/auth/reset-password` | público (204; corpo `{ token, password }`) |
| POST | `/users` | ADMIN |
