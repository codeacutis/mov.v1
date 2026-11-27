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
| POST | `/auth/bootstrap` | banco vazio; em produção exige segredo de inicialização |
| POST | `/auth/login` | público |
| POST | `/auth/logout` | autenticado (204) |
| GET | `/auth/me` | autenticado |
| POST | `/auth/forgot-password` | público (202, resposta sempre igual) |
| POST | `/auth/reset-password` | público (204; corpo `{ token, password }`) |
| POST | `/users` | ADMIN |

## CI e deploy após verificações

O workflow `.github/workflows/ci.yml` valida API e frontend em push e pull request. A API roda lint, tipos, testes unitários, migrations e testes integrados somente em PostgreSQL descartável do runner; `npm run build` apenas gera o cliente Prisma e compila. O frontend roda lint, testes de interface e build. Os testes integrados recusam conexões remotas, URLs com parâmetros e bancos que não terminem em `_test`.

Em push na `main`, o job `deploy` depende dos dois jobs e usa o ambiente GitHub `production`. Ele confere se o commit ainda é o atual da main, aplica `prisma migrate deploy` e solicita os dois deploys Render fixando o SHA validado. Em pull requests e outras branches não há deploy. O job não espera a conclusão dos serviços no Render: acompanhe o resultado em Deploys; um hook aceito não garante que a publicação terminou. Um commit mais recente durante uma migration pode impedir o acionamento do hook anterior; migrations já aplicadas não são revertidas. Migrations devem ser compatíveis com a versão ainda em execução e revisadas antes do merge.

Configuração externa necessária, sem incluir valores no Git:

- No GitHub, crie o ambiente `production` e os secrets `PRODUCTION_DATABASE_URL`, `RENDER_API_DEPLOY_HOOK` e `RENDER_WEB_DEPLOY_HOOK`. A URL do banco deve permitir migrations e conexão a partir do runner. Se o ambiente tiver aprovações obrigatórias, o deploy aguardará essas aprovações.
- No Render, vincule os dois serviços à mesma `main`, configure deploy automático como **Off** nos dois serviços e sincronize o Blueprint; isso impede execução em paralelo com os hooks. O Blueprint usa `npm ci`. No plano gratuito, a etapa de pre-deploy não está disponível, por isso o workflow aplica migrations antes dos hooks.
- Configure na API Render `DATABASE_URL`, `JWT_SECRET`, `WEB_ORIGIN` (origem HTTPS exata, sem caminho ou barra final), `NODE_ENV=production`, e as variáveis do provedor de e-mail quando aprovadas. No frontend configure `VITE_API_URL` com a URL pública da API. Nunca coloque credenciais em variáveis `VITE_`.
- O bootstrap em produção fica bloqueado sem `BOOTSTRAP_SECRET` com ao menos 32 caracteres. Para inicializar um banco vazio, configure temporariamente esse segredo na API e envie-o no cabeçalho `X-Bootstrap-Secret` por conexão segura; remova-o após criar o primeiro ADMIN. A transação impede segundo ADMIN via bootstrap mesmo que o segredo permaneça. Não registre o cabeçalho ou o segredo em logs.
- Os secrets de deploy ainda precisam ser configurados externamente. Criar ou sincronizar um Blueprint, ou mudar configurações do Render, pode disparar implantação: siga o procedimento operacional aprovado.

Para rodar testes integrados localmente, use servidor PostgreSQL descartável local com banco cujo nome termine em `_test`, configure `TEST_DATABASE_URL` sem parâmetros de conexão e execute `npm run test:e2e:prepare` e `npm run test:e2e` em `apps/api`. Os testes apagam todos os dados desse banco. Não aponte a variável para banco compartilhado.

## Verificação da Data API Supabase

A API Mov+ usa PostgreSQL pelo backend e não precisa da Data API Supabase. A inspeção `node scripts/check-supabase-security.cjs` em `apps/api` consulta apenas metadados de `public`, privilégios de `anon`/`authenticated` e RLS; não lê linhas nem altera políticas. Ela não comprova se o schema está exposto nem se a Data API está ativa. No painel, confira os schemas expostos e considere desativar a Data API se não for utilizada. Se precisar mantê-la, revise grants, RLS, policies, views e funções com o responsável antes de modificar o banco publicado. Veja https://supabase.com/docs/guides/api/securing-your-api.
