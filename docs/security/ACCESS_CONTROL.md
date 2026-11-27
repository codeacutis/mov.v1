# Controle de acesso da API

Autenticação e autorização são aplicadas **no backend** por dois guards globais, nesta ordem:

1. `JwtAuthGuard` — exige token válido, sessão não revogada/expirada e usuário ativo (o papel é lido do banco a cada requisição).
2. `RolesGuard` — **fail-closed**: toda rota precisa declarar `@Public()`, `@Authenticated()` ou `@Roles(...)`. Rota sem declaração é negada (403) e registrada em log. `@Roles` no método sobrescreve o da classe.

Código negado: **401** sem autenticação válida, **403** com papel insuficiente. Recursos de outro motorista respondem **404** (não revelam existência).

## Matriz de rotas

| Rota | Anônimo | MOTORISTA | ADMIN |
|---|:-:|:-:|:-:|
| `GET /` | ✔ | ✔ | ✔ |
| `POST /auth/bootstrap` (banco vazio; em produção exige segredo) | permitido com segredo | permitido com segredo | permitido com segredo |
| `POST /auth/login` | ✔ | ✔ | ✔ |
| `POST /auth/forgot-password`, `POST /auth/reset-password` (token de uso único) | ✔ | ✔ | ✔ |
| `POST /auth/logout`, `GET /auth/me` | ✘ 401 | ✔ | ✔ |
| `POST /users` | ✘ 401 | ✘ 403 | ✔ |
| `GET/POST /vehicles`, `PATCH /vehicles/:id[/inactivate]` | ✘ 401 | ✘ 403 | ✔ |
| `GET/POST /drivers`, `PATCH /drivers/:id[/inactivate]` | ✘ 401 | ✘ 403 | ✔ |
| `GET/POST /patients`, `PATCH /patients/:id[/inactivate]` | ✘ 401 | ✘ 403 | ✔ |
| `GET/POST /trips`, `PATCH /trips/:id/cancel` | ✘ 401 | ✘ 403 | ✔ |
| `GET /audit`, `GET /trips/:id/observations`, `PATCH /trips/:id/actual-times` | 401 | 403 | ADMIN |
| `GET /driver/trips`, `GET /driver/trips/:id` | ✘ 401 | ✔ (só as suas) | ✘ 403 |

## Rotas do motorista
Mostram apenas o necessário ao transporte (RN-12, D-011): nome, telefone e indicadores de acessibilidade do paciente, acompanhantes (nome/telefone), estabelecimento e horário da consulta, estados de ida/volta e, **somente após aprovação do ADMIN**, as paradas da rota (RN-07). Nunca expõem CPF, Cartão SUS, endereço ou data de nascimento do paciente, observações, prioridade/justificativa ou confirmação.

## Ao criar uma rota nova
1. Declare `@Roles(...)`, `@Authenticated()` ou `@Public()`. Sem isso a rota é negada.
2. Inclua-a na matriz de `test/authorization.e2e-spec.ts` (o teste de varredura falha se faltar declaração).
