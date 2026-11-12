# Desenvolvimento

## 1. Pré-requisitos

- Node.js em versão LTS compatível com a versão do NestJS adotada.
- npm, pnpm ou yarn — **PENDING:** padronizar um único gerenciador e versioná-lo.
- PostgreSQL.
- Git.
- Editor com suporte a TypeScript.

## 2. Repositórios

Manter frontend e backend separados. Cada repositório deve possuir seu próprio README, scripts, variáveis de ambiente de exemplo e pipeline.

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
