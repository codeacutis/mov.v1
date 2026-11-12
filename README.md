# Mov+

Aplicação web para planejamento e acompanhamento do **transporte municipal de pacientes**. A Secretaria Municipal de Saúde organiza viagens de ida e volta, pacientes, motoristas, veículos, rotas, confirmações e ocorrências — sem tratar o sistema como prontuário eletrônico.

Repositório **monorepo** do projeto acadêmico: documentação em `docs/`, API em `apps/api` (NestJS) e interface em `apps/web` (React). São duas aplicações no mesmo Git, com deploys independentes.

> **Dados reais de saúde não devem ser usados** neste ambiente. Desenvolvimento, testes e demonstrações utilizam apenas dados fictícios. Operação produtiva depende de avaliação formal de privacidade (LGPD), segurança e infraestrutura.

## Sumário

- [Apresentação](#apresentação)
- [Stacks](#stacks)
- [Arquitetura](#arquitetura)
- [Execução na máquina local](#execução-na-máquina-local)
- [Documentação](#documentação)
- [Status do projeto](#status-do-projeto)
- [Contribuição](#contribuição)
- [Segurança e privacidade](#segurança-e-privacidade)
- [Autoria](#autoria)

## Apresentação

O Mov+ apoia a Secretaria Municipal de Saúde na organização do transporte de pacientes para consultas, exames e procedimentos em outros municípios.

A operação é modelada como **uma viagem municipal de ida e volta**: horário fixo de saída, horário fixo de início do retorno, um motorista e um veículo. Cada paciente participa com estados independentes na ida e na volta, prioridade definida pelo administrador, estabelecimento da consulta e, quando habilitado, confirmação por WhatsApp.

**Papéis**

| Papel | Responsabilidade |
| --- | --- |
| `ADMIN` | Representa a Secretaria. Cadastra pacientes, frota e viagens; define prioridade; aprova rota; acompanha confirmações. |
| `MOTORISTA` | Consulta viagens atribuídas, inicia e finaliza a operação, registra embarque, ausência e ocorrências. Acessa somente o necessário à execução. |

**O que o sistema faz (MVP acadêmico)**

- Cadastro de usuários, motoristas, veículos e pacientes (dados mínimos operacionais)
- Criação de viagens com alocação sem conflito de agenda
- Participantes, acompanhantes e controle de capacidade do veículo
- Prioridade administrativa (`HIGH` / `MEDIUM` / `LOW`) por participação
- Sugestão simples de sequência de paradas, com revisão e aprovação do ADMIN
- Início e encerramento com horários gerados no servidor
- Cancelamento antes do início e interrupção após o início
- Confirmação automática por WhatsApp (integração oficial; mock no início do desenvolvimento)

**Fora do escopo inicial:** navegação tipo Waze, trânsito em tempo real, diagnóstico clínico, decisão clínica automatizada e remoção automática de paciente por falta de resposta no WhatsApp.

## Stacks

| Camada | Tecnologia | Observação |
| --- | --- | --- |
| Backend | Node.js, NestJS, TypeScript | Monólito modular |
| HTTP | Express | Adaptador padrão do NestJS, não um segundo backend |
| Frontend | React, TypeScript | Consome a API REST; regras críticas ficam no backend |
| Persistência | PostgreSQL | Banco relacional |
| ORM | Prisma | Schema e migrations versionados |
| Integração | API REST | Contrato entre frontend e backend |
| Confirmação | WhatsApp Business Platform / Cloud API | Encapsulada por provider; webhook idempotente |
| Hospedagem (proposta acadêmica) | Vercel, Render, Supabase | Apenas MVP/demonstração com dados fictícios |

Gerenciador de pacotes proposto: **npm**. Não misturar pnpm ou yarn no mesmo clone.

## Arquitetura

O backend é um **monólito modular NestJS**. A divisão segue limites de domínio, não microserviços.

```text
[React + TypeScript]  --REST-->  [NestJS / Express]
                                      |
                                      v
                               [PostgreSQL + Prisma]
                                      ^
[WhatsApp Cloud API] <--webhook--> [Notifications]
```

**Módulos previstos**

| Módulo | Responsabilidade |
| --- | --- |
| Auth | Autenticação, sessão/token e autorização |
| Users | Contas e papéis |
| Patients | Cadastro mínimo de pacientes |
| Drivers | Cadastro operacional de motoristas |
| Vehicles | Frota e disponibilidade |
| Trips | Planejamento, execução e encerramento |
| TripStops | Paradas e sequência da rota |
| PatientTrips | Participação, prioridade, confirmação e estados de ida/volta |
| Companions | Acompanhantes da participação |
| Notifications | Confirmação por WhatsApp |
| Audit | Trilha de auditoria |
| Health | Saúde operacional da API |

**Regras transversais**

- Autorização aplicada no backend
- Integridade de agenda em transação (sem sobreposição de motorista ou veículo)
- Horários reais gerados pelo servidor, não pelo relógio do dispositivo
- Alterações administrativas críticas auditadas
- Dados sensíveis minimizados; motorista não acessa CPF, Cartão SUS, endereço completo ou diagnóstico
- Ausência de resposta no WhatsApp **não** significa desistência

Detalhes em [`docs/architecture/ARCHITECTURE.md`](docs/architecture/ARCHITECTURE.md), [`docs/architecture/DOMAINS.md`](docs/architecture/DOMAINS.md) e [`docs/architecture/DATA_MODEL.md`](docs/architecture/DATA_MODEL.md).

## Execução na máquina local

O scaffold de NestJS e React ainda não foi gerado: `apps/api` e `apps/web` existem como pastas-base. Depois da instalação (ver `apps/README.md`), o fluxo local previsto é o seguinte.

### Pré-requisitos

- Node.js LTS compatível com a versão do NestJS adotada
- npm
- PostgreSQL em execução
- Git
- Editor com suporte a TypeScript

### Backend (`apps/api`)

1. Instalar as dependências em `apps/api`
2. Copiar `.env.example` para `.env` e preencher valores locais (sem commitar segredos)
3. Subir o PostgreSQL
4. Aplicar as migrations do Prisma
5. Iniciar a API em modo desenvolvimento
6. Rodar testes e lint

Variáveis esperadas (nomes ilustrativos, a padronizar no código):

```env
DATABASE_URL=
PORT=
JWT_SECRET=
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_VERIFY_TOKEN=
WHATSAPP_APP_SECRET=
```

### Frontend

1. Instalar as dependências em `apps/web`
2. Configurar a URL da API local (`apps/api`)
3. Iniciar a aplicação em modo desenvolvimento

O frontend consome a API REST e **não duplica** regras críticas de negócio.

### Dados e ambiente

- Seeds e cadastros de desenvolvimento devem ser fictícios
- Não versionar `.env` nem credenciais
- WhatsApp deve poder ser mockado; não depende da Meta para desenvolver regras de domínio
- Geocodificação/roteirização avançada ainda não está definida; o MVP pode operar com endereços e sequência aprovada manualmente

## Documentação

| Documento | Conteúdo |
| --- | --- |
| [Requisitos](docs/requirements/REQUIREMENTS.md) | Requisitos funcionais, não funcionais e regras de negócio |
| [Histórias de usuário](docs/requirements/USER_STORIES.md) | ADMIN, MOTORISTA e confirmações |
| [Arquitetura](docs/architecture/ARCHITECTURE.md) | Visão lógica, fluxos e componentes externos |
| [Domínios](docs/architecture/DOMAINS.md) | Limites de módulo e papéis |
| [Modelo de dados](docs/architecture/DATA_MODEL.md) | Entidades conceituais |
| [Decisões](docs/decisions/DECISIONS.md) | Registro CONFIRMED / PROPOSED / PENDING |
| [Desenvolvimento](docs/development/DEVELOPMENT.md) | Ambiente, env, banco e deploy acadêmico |
| [Testes](docs/development/TESTING.md) | Pirâmide e casos prioritários |
| [Contribuição](docs/development/CONTRIBUTING.md) | Branches, PRs e qualidade |
| [Segurança](docs/security/SECURITY.md) | Privacidade, LGPD e controles |
| [Roadmap](docs/project/ROADMAP.md) | Fases do MVP e evoluções |
| [Equipe](docs/project/TEAM.md) | Organização e ferramentas |

## Status do projeto

Fase atual: **fechamento de decisões e base de pastas do monorepo**, rumo à base técnica (NestJS em `apps/api`, React em `apps/web`, PostgreSQL, autenticação e CI).

Pendências conhecidas incluem campos obrigatórios do paciente, política de espera no retorno, provedor de mapas/rotas, política de autenticação/retenção e avaliação formal antes de qualquer uso com dados reais. O detalhamento está em [`docs/decisions/DECISIONS.md`](docs/decisions/DECISIONS.md) e [`docs/project/ROADMAP.md`](docs/project/ROADMAP.md).


## Segurança e privacidade

- Finalidade específica: organizar transporte municipal de pacientes
- Minimização de dados e menor privilégio por papel
- Senhas apenas em hash; HTTPS em ambientes publicados
- Webhooks do WhatsApp autenticados e idempotentes; sem conteúdo clínico nas mensagens
- Auditoria registra ator, ação, entidade e instante, sem payloads desnecessários

Antes de produção: base legal, aviso de privacidade, retenção, backups, incidentes e avaliação da hospedagem. Ver [`docs/security/SECURITY.md`](docs/security/SECURITY.md).

## Autoria

Trabalho acadêmico de Programação Backend — Sistemas de Informação.

- Eduardo Brandão dos Santos
- Guilherme Augusto Alves de Faria
- João Pedro Rodrigues Vilas Boas
- Lucas Joaquim de Oliveira Soares
- Matheus Santos de Paula
