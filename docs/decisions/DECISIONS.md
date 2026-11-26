# Registro de decisões — Mov+

Última consolidação: 26/11/2026 (decisões do Product Owner para a Release 4).

Legenda:
- **CONFIRMED:** explicitamente decidido.
- **PROPOSED:** recomendação técnica/produto ainda não aprovada.
- **PENDING:** depende de nova definição.

## D-026 — Cancelamento administrativo de participação
**Status: CONFIRMED — Product Owner, 26/11/2026**

Antes do início da viagem, ADMIN pode cancelar logicamente uma participação com motivo, autor e instante registrados pelo backend. O registro é preservado e as vagas do paciente e acompanhante são liberadas. A participação cancelada não é removida nem alterada; permanece a unicidade de paciente por viagem. Não há cancelamento automático por ausência ou falta de confirmação.

A remoção administrativa de acompanhante preserva seu registro com `removedAt` e gera auditoria; somente acompanhantes não removidos de participações não canceladas contam na ocupação. O gerenciamento planejado ocorre antes do início. Substitui a exclusão física anterior do acompanhante; não recupera registros já excluídos.

## D-001 — Stack
**Status: CONFIRMED**

Backend Node.js + NestJS + TypeScript; Express como adaptador HTTP do NestJS; frontend React + TypeScript; PostgreSQL; Prisma; API REST.

Organização do código: **monorepo** neste repositório. Frontend e backend permanecem aplicações distintas (`apps/web` e `apps/api`), com `package.json` e deploy separados, no mesmo Git. Documentação de produto fica em `docs/`.

**PROPOSED:** gerenciador de pacotes `npm` (já vem com o Node e é o padrão dos CLIs do Nest e do Vite). A equipe pode confirmar depois.

## D-002 — Papéis
**Status: CONFIRMED**

Papéis iniciais `ADMIN` e `MOTORISTA`. ADMIN representa a Secretaria Municipal de Saúde, responsável pela administração operacional.

## D-003 — Conta do motorista
**Status: CONFIRMED**

Cada motorista terá conta individual vinculada ao cadastro Driver em relação 1:1.

## D-004 — Viagem como operação de ida e volta
**Status: CONFIRMED**

Uma Trip representa a operação municipal de ida e volta. Horário de saída da ida e horário de início do retorno são programados como horários fixos da viagem. Cada paciente, porém, pode ter situação independente na ida e na volta.

## D-005 — Horários reais
**Status: CONFIRMED**

O motorista inicia e finaliza a viagem por ações na aplicação. Backend define os horários reais. Não confiar no relógio do celular. Correção administrativa de horário real exige justificativa e auditoria.

## D-006 — Alteração de horários planejados
**Status: CONFIRMED**

Somente ADMIN pode alterar horários planejados e somente antes do início da viagem. Registrar valores anteriores e novos na auditoria.

## D-007 — Estados gerais da viagem
**Status: CONFIRMED**

`SCHEDULED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`, `INTERRUPTED`. Cancelamento antes do início; interrupção após início quando não houver conclusão normal. Interrupção registra motivo, instante, ator e providência.

## D-008 — Capacidade
**Status: CONFIRMED**

Capacidade do veículo considera pacientes e acompanhantes; motorista não conta como passageiro.

## D-009 — Cadastro de paciente e minimização
**Status: CONFIRMED**

Nome obrigatório; data de nascimento em vez de idade; idade calculada. Endereço opcional. Cartão SUS opcional. Não coletar tipo sanguíneo. Evitar diagnóstico e dados clínicos desnecessários. Utilizar indicadores operacionais objetivos de acessibilidade/embarque e observação limitada.

**Histórico:** a obrigatoriedade de telefone/contato e a necessidade de CPF estavam pendentes. Na Release 4, o Product Owner confirmou nome, data de nascimento e telefone como obrigatórios e CPF como opcional. Demais campos não definidos continuam sujeitos às decisões existentes.

**Confirmado pelo produto:** nome e telefone são obrigatórios para acompanhante. Cada PatientTrip aceita no máximo um acompanhante.

## D-010 — Acompanhantes
**Status: CONFIRMED**

Acompanhante é associado à participação do paciente na viagem, com nome e telefone. Não há cadastro global obrigatório no MVP.

## D-011 — Acesso do motorista
**Status: CONFIRMED**

Motorista vê nome e telefone de pacientes/acompanhantes e indicadores operacionais mínimos necessários. Não vê CPF, Cartão SUS, endereço completo ou diagnóstico.

## D-012 — Confirmação por WhatsApp
**Status: CONFIRMED — comportamento desejado**

Confirmação automática via integração oficial WhatsApp Business Platform/Cloud API. Mensagem informa data, destino e ponto de embarque, sem informação clínica sensível. Webhook recebe respostas e atualiza a participação.

Estados propostos: `PENDING`, `CONFIRMED`, `DECLINED`, `NO_RESPONSE`. Não resposta não significa desistência e não remove o paciente automaticamente. Deve haver lembrete e alerta administrativo.

**PENDING:** opt-in/base legal e política de contato; uso de responsável/acompanhante; templates, janelas e custos; configuração de número/WABA/webhook. Para entregas acadêmicas iniciais, pode-se implementar interface de provider e mock/teste antes da integração produtiva.

## D-013 — Prioridade da consulta
**Status: CONFIRMED**

ADMIN da Secretaria de Saúde define criticidade/prioridade da consulta. Valores `HIGH`, `MEDIUM`, `LOW`. Prioridade é registrada em PatientTrip, com responsável, instante e justificativa. Alterações devem ser auditadas. Sistema não calcula diagnóstico nem remove automaticamente pacientes.

## D-014 — Paradas e sequência de rota
**Status: CONFIRMED**

Cada paciente pode ter estabelecimento diferente. Destino da consulta é contextual à participação/viagem, não atributo permanente do paciente. O ADMIN organiza manualmente a ordem das paradas e aprova a rota; o retorno segue a ordem inversa da ida. Motorista consulta a rota aprovada antes da viagem. Não se exige Waze, navegação curva a curva, trânsito em tempo real ou reotimização no MVP.

**Histórico:** a sugestão simples pelo sistema e a definição da estratégia de sequência estavam previstas anteriormente; foram substituídas pela organização manual e retorno inverso confirmados para a Release 4. Conforme decisão de produto registrada abaixo em D-018, não haverá provedor de mapas no MVP.

**Implementação (26/11/2026):** preservado o modelo existente `TripStop` por direção, com `PatientTrip.outboundStopId` e `returnStopId` (não existe entidade `PatientTripStop` no schema atual). A ida é organizada manualmente; alterações nela sincronizam os locais e vínculos do retorno. A mesma chave `sequence` identifica a posição nos dois sentidos, percorrida em ordem crescente na ida e decrescente no retorno. Horários previstos do retorno são próprios, sem copiar o horário da ida. A aprovação valida o espelhamento e os vínculos dos participantes ativos. Cadastro, edição, exclusão, reordenação e aprovação só ocorrem em `SCHEDULED`.

Alterações de paradas, sequência, endereço ou vínculos invalidam `routeApprovedAt` e o responsável na mesma transação. Inclusão/cancelamento de participação, alteração da consulta e edição do planejamento da viagem também exigem revisão. A sequência e seus vínculos ficam indisponíveis ao motorista até nova aprovação; dados operacionais dos participantes continuam sujeitos à minimização existente. Aprovação e mutações usam o mesmo bloqueio transacional.

## D-015 — Ponto de embarque
**Status: CONFIRMED**

Embarque inicial em ponto municipal, sem coleta domiciliar no MVP. Possibilidade futura de mais de um ponto municipal deve ser tratada como evolução.

## D-016 — Horários e operação da rota
**Status: CONFIRMED**

Saída da ida ocorre em horário fixo municipal (exemplo: 06h). Início do retorno também é fixo (exemplo: 12h). Na ida, motorista deixa pacientes nos estabelecimentos conforme rota. No retorno, recolhe os pacientes nos estabelecimentos conforme sequência planejada. O horário de início do retorno não significa que todos serão recolhidos simultaneamente.

## D-017 — Paciente que não retorna
**Status: CONFIRMED**

Paciente pode utilizar o transporte na ida e não retornar no veículo municipal. Se avisar previamente, registrar `NOT_RETURNING`, motivo, instante e responsável pela comunicação. A participação não deve ser removida da viagem; estado da ida permanece independente do estado da volta.

## D-018 — Paciente ausente no recolhimento
**Status: CONFIRMED**

**Release 4 — CONFIRMED:** se o paciente estiver ausente no recolhimento, o motorista tenta contato com paciente ou acompanhante e pode prosseguir após registrar ocorrência e justificativa. Não há desistência ou remoção automática por falta de resposta.

**Histórico — substituído na Release 4:** anteriormente previa-se aguardar a chegada/disponibilidade e seguir mediante orientação ou situação que indicasse não aguardar; estavam pendentes o procedimento sem contato e quem autorizaria seguir. A nova decisão permite ao motorista prosseguir após tentativa de contato, ocorrência e justificativa. Limite de espera e detalhes não especificados permanecem pendentes; não estabelecer timeout arbitrário.

**Implementação atual:** o ADMIN pode documentar a ausência constatada como `NO_SHOW`, com motivo obrigatório e identificação do registro. Esse lançamento é distinto do aviso prévio `NOT_RETURNING`. A atuação do motorista conforme a Release 4 ainda depende de implementação.

**Confirmado pelo produto:** sem aviso prévio e sem contato, o motorista registra uma observação da viagem e segue o caminho. O retorno só pode ser utilizado por paciente que tenha embarcado na ida.

**Confirmado pelo produto:** não haverá provedor de mapas. O ADMIN organiza a ordem das paradas, e o retorno é apresentado em ordem inversa à ida. Estabelecimentos podem ser compartilhados entre participações.

## D-019 — Deploy acadêmico
**Status: PROPOSED**

Vercel (frontend), Render (backend) e Supabase (PostgreSQL) como opções para MVP/demonstração. Avaliar limites, suspensão por inatividade, backups, disponibilidade, custos e segurança. Usar somente dados fictícios até avaliação formal para produção.

## D-020 — Auditoria
**Status: CONFIRMED**

Alterações relevantes de prioridade, horários, alocação, cancelamento/interrupção e estados operacionais devem ser auditadas. Evitar payloads completos e dados sensíveis nos logs.

## D-021 — Conflitos de agenda
**Status: CONFIRMED**

Não permitir sobreposição de viagens para o mesmo motorista ou veículo. A proteção deve suportar requisições concorrentes, não apenas uma validação simples na interface.

**Release 4 — CONFIRMED:** adicionar à viagem o horário previsto de chegada ao município de origem, como fim planejado da ocupação do veículo. O intervalo planejado começa na saída municipal. A implementação atual ainda utiliza o início do retorno como fim do intervalo e deve ser adequada; a decisão não altera retroativamente o código.

## D-022 — Otimização avançada de rota
**Status: PROPOSED / FUTURO**

Não implementar inicialmente otimização avançada do tipo VRP com janelas de tempo. A proposta anterior de começar com sugestão simples foi substituída pela organização manual e aprovação pelo ADMIN (D-014, Release 4). Evoluções permanecem propostas, não confirmadas.

## D-023 — Autenticação (sessão no servidor + JWT)
**Status: PROPOSED** (política de sessão/token segue PENDING em `ARCHITECTURE.md` §6)

- **Login:** e-mail + senha; senha armazenada com bcrypt (custo 12); resposta idêntica para e-mail inexistente e senha errada.
- **Sessão:** cada login cria um registro `Session` com expiração (`SESSION_TTL_SECONDS`, padrão 3600). O JWT carrega só `sub` e `sid`.
- **Logout:** revoga a `Session` (`revokedAt`); o token deixa de valer na hora. O guard confere a sessão, a expiração e se o usuário está ativo a cada requisição; o papel é lido do banco.
- **Cadastro:** `POST /auth/bootstrap` cria o primeiro ADMIN e só funciona enquanto não houver usuários (serializado por advisory lock). Depois, só ADMIN cadastra usuários (`POST /users`). Não há autocadastro público, para impedir escalada de privilégio.
- **Senha:** mínimo 10 e máximo 72 caracteres (limite do bcrypt). Política provisória.
- **Não incluído:** refresh token, recuperação de senha, limite de tentativas de login, limpeza de sessões expiradas, vínculo `Driver` 1:1 (D-003) para contas `MOTORISTA`.

## D-024 — Recuperação de senha
**Status: PROPOSED**

- **Solicitação:** `POST /auth/forgot-password` responde sempre 202 com a mesma mensagem, exista ou não a conta (sem enumeração de e-mails). Usuário inativo não recebe token.
- **Token:** 32 bytes aleatórios (base64url). O banco guarda apenas o hash SHA-256 (`PasswordResetToken`); o valor em claro só existe no link entregue. Validade padrão de 30 min (`PASSWORD_RESET_TTL_SECONDS`).
- **Uso único:** a redefinição consome o token por um `UPDATE` condicional atômico (`usedAt IS NULL AND expiresAt > now`), seguro sob requisições simultâneas. Mensagem de erro única para token inexistente, usado ou expirado.
- **Invalidação:** nova solicitação invalida tokens pendentes anteriores. Intervalo mínimo de 60 s entre solicitações do mesmo usuário (anti-flood).
- **Efeitos da redefinição:** troca o hash da senha (bcrypt, mesma política de 10–72 caracteres), **revoga todas as sessões** do usuário e invalida outros tokens pendentes. Senha fraca é recusada sem consumir o token.
- **Auditoria:** `PASSWORD_RESET_REQUESTED` e `PASSWORD_RESET_COMPLETED`, sem token nem senha.
- **PENDING — entrega do link:** não há provedor de e-mail escolhido. A entrega passa pela abstração `PasswordResetNotifier` (como o WhatsApp). A implementação padrão **não envia nada**; só em desenvolvimento, com `PASSWORD_RESET_DEV_LOG=true`, imprime o link no console. Antes de produção é preciso decidir provedor, custo e política de contato.
- **Release 4:** o Product Owner mantém pendente a escolha do provedor de e-mail; esta indicação não confirma os demais itens propostos de D-024.
- **Não incluído:** tela no front (`/redefinir-senha`), limite de tentativas por IP, limpeza periódica de tokens expirados.

## D-025 — Autorização fail-closed e rotas do motorista
**Status: PROPOSED**

- `RolesGuard` passa a **negar por padrão**: rota sem `@Public()`, `@Authenticated()` ou `@Roles(...)` retorna 403. Antes, rota sem `@Roles` era liberada a qualquer usuário autenticado.
- Rotas exclusivas do MOTORISTA em `/driver/trips` (lista e detalhe das viagens atribuídas), separadas das rotas do ADMIN em `/trips`. Viagem de outro motorista responde 404. As paradas só aparecem após `routeApprovedAt` (RN-07).
- Matriz de acesso documentada em `docs/security/ACCESS_CONTROL.md` e verificada por testes (varredura de todas as rotas + acesso negado).
- **Fora do escopo desta revisão:** início/finalização de viagem e registros de ida/volta pelo motorista (ainda não implementados na API).
