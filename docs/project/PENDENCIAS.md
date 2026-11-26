# Pendências

Atualizado em 26/11/2026 com as decisões da Release 4; o histórico de implementação abaixo não foi revalidado nesta atualização documental. Itens marcados como *bloqueante* impedem uso real da funcionalidade; os demais são evoluções ou riscos conhecidos.

Legenda: 🔴 bloqueante · 🟠 importante · 🟡 evolução

## 1. Recuperação de senha (D-024)

| | Pendência | Detalhe |
|---|---|---|
| 🔴 | **Entrega do link (e-mail)** | Não há provedor escolhido. O `PasswordResetNotifier` padrão **não envia nada**; só em desenvolvimento, com `PASSWORD_RESET_DEV_LOG=true`, o link aparece no console. Decidir provedor (SMTP, Resend etc.), custo e política de contato, e implementar um `PasswordResetNotifier` real. |
| 🔴 | **Tela no front** | Falta a página `/redefinir-senha` (recebe `?token=`) e o formulário "esqueci minha senha" na tela de login. Só o backend existe. |
| 🟠 | Limite de tentativas por IP | Hoje só há intervalo de 60 s por usuário. Sem throttling por IP em `forgot-password`/`reset-password`/`login`. |
| 🟠 | Limpeza periódica | Tokens de recuperação e sessões expirados nunca são removidos do banco. |
| 🟡 | Política de duração | Validade do token (30 min) e da sessão (1 h) são provisórias (ARCHITECTURE §6). |

## 2. Autorização e rotas do motorista (D-025)

| | Pendência | Detalhe |
|---|---|---|
| 🔴 | **Operações do motorista** | A API só permite ao motorista *consultar* (`/driver/trips`). Faltam iniciar/finalizar viagem (horário real pelo servidor, RF-17/18), registrar embarque/ausência na ida (RF-19), retorno e ausência no recolhimento (RF-20/21). |
| 🟠 | Front sem `/driver/trips` | As telas ainda não consomem as rotas exclusivas do motorista. |
| 🟠 | Vínculo conta ↔ motorista | `POST /users` aceita criar `MOTORISTA` sem registro `Driver` (D-003 exige 1:1). Hoje o vínculo só é garantido ao cadastrar por `POST /drivers`. |
| 🟡 | Revisar ao criar rotas | Toda rota nova precisa de `@Roles`/`@Authenticated`/`@Public` e entrar na matriz de `docs/security/ACCESS_CONTROL.md`. O teste de varredura falha se faltar. |

## 3. Agenda de viagens (D-021)

| | Pendência | Detalhe |
|---|---|---|
| 🔴 | **Fim planejado da ocupação** | As operações de agenda e lotação usam bloqueio transacional compartilhado no PostgreSQL, mas o intervalo ainda termina no *início do retorno*. A Release 4 confirmou a chegada prevista ao município de origem como fim planejado; é necessário adequar modelo e validação. Até então a agenda não protege toda a operação municipal. |
| 🟠 | Capacidade e participantes | A inclusão, troca de veículo e redução de capacidade usam o mesmo bloqueio transacional. Novos caminhos de escrita que afetem lotação ou agenda devem aderir ao protocolo; escritas diretas no banco não são protegidas pelo bloqueio consultivo. |
| 🟡 | Paradas e rota | A organização manual, aprovação e ordem inversa no retorno foram confirmadas; a representação técnica e eventuais adequações permanecem pendentes. |

## 4. Deploy (D-019)

| | Pendência | Detalhe |
|---|---|---|
| 🟠 | **Deploy não executado** | `render.yaml` e `docs/deployment/DEPLOY.md` existem, mas os serviços no Render/Supabase ainda precisam ser criados com as variáveis (`DATABASE_URL`, `WEB_ORIGIN`, `VITE_API_URL`). |
| 🟠 | SSL do Supabase não testado | Se `prisma migrate deploy`/conexão falhar por certificado, a API precisará de opção de SSL. |
| 🟡 | Limitações do plano gratuito | API "dorme"; projeto Supabase pausa por inatividade. Somente dados fictícios. |

## 5. Autenticação (D-023)

| | Pendência | Detalhe |
|---|---|---|
| 🟠 | Sem refresh token | A sessão expira em 1 h e exige novo login. |
| 🟡 | Política de senha | Provisória: 10 a 72 caracteres, sem checagem de senhas vazadas/comuns. |

## 6. Decisões aguardando aprovação do responsável pelo produto

Registradas como **PROPOSED** em `docs/decisions/DECISIONS.md`: **D-019** (deploy), **D-023** (autenticação), **D-024** (recuperação de senha), **D-025** (autorização fail-closed). Não devem ser tratadas como confirmadas até haver aprovação explícita (AGENTS.md).

## 7. Qualidade do repositório

| | Pendência | Detalhe |
|---|---|---|
| 🟡 | Lint em arquivos antigos | `eslint` aponta formatação (Prettier) em `trips/dto/create-trip.dto.ts`, `vehicles/dto/create-vehicle.dto.ts` e `test/vehicles.e2e-spec.ts`. Não foram alterados para não misturar escopos. |
| 🟡 | CI | Ainda não há pipeline que rode `test`, `test:e2e` e `lint` (Roadmap Fase 1). |
