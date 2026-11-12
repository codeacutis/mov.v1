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

## 9. Comandos reais da API (`apps/api`)

```bash
cp .env.example .env            # preencha DATABASE_URL e JWT_SECRET (openssl rand -base64 48)
npm install                     # gera o Prisma Client no postinstall
npm run prisma:migrate          # aplica migrations (usa prisma7.config.ts)
npm run db:seed                 # dados FICTÍCIOS; SEED_PASSWORD opcional
npm run start:dev
npm test                        # unitários
TEST_DATABASE_URL=postgresql://USUARIO@localhost:5432/mov_test npm run test:e2e:prepare
TEST_DATABASE_URL=postgresql://USUARIO@localhost:5432/mov_test npm run test:e2e
```

O banco de teste deve ter nome terminando em `_test`; os e2e limpam as tabelas a cada teste.

### Endpoints de agendamento

| Método | Rota | Papel |
|---|---|---|
| POST | `/auth/login` | público |
| GET | `/trips`, `/trips/:id` | ADMIN (completo), MOTORISTA (só atribuídas, visão reduzida) |
| POST | `/trips` | ADMIN |
| PATCH | `/trips/:id` | ADMIN (só `SCHEDULED`) |
| POST | `/trips/:id/cancel` | ADMIN (só `SCHEDULED`, motivo obrigatório) |
| POST | `/trips/:id/patients` | ADMIN |
| PATCH | `/trips/:id/patients/:patientTripId` | ADMIN |
| POST / DELETE | `/trips/:id/patients/:patientTripId/companions[/:companionId]` | ADMIN |

Datas em ISO-8601 com fuso (ex.: `2027-01-10T06:00:00-03:00`).
