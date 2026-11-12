# Registro de decisões — Mov+

Última consolidação: 12/11/2026.

Legenda:
- **CONFIRMED:** explicitamente decidido.
- **PROPOSED:** recomendação técnica/produto ainda não aprovada.
- **PENDING:** depende de nova definição.

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

**PENDING:** obrigatoriedade de telefone/contato, necessidade de CPF e campos finais do cadastro.

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

Cada paciente pode ter estabelecimento diferente. Destino da consulta é contextual à participação/viagem, não atributo permanente do paciente. Sistema apresenta sequência simples sugerida; ADMIN revisa e aprova. Motorista consulta a rota aprovada antes da viagem. Não se exige Waze, navegação curva a curva, trânsito em tempo real ou reotimização no MVP.

**PENDING:** provedor geográfico, se necessário; estratégia de sequência e representação separada das sequências de ida e retorno.

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

Se não houver comunicação prévia de ausência/não retorno, motorista deve aguardar a chegada/disponibilidade do paciente. Pode utilizar os contatos cadastrados na participação para contatar paciente ou acompanhante e entender a situação. Se houver orientação/situação que indique que não deve aguardar, segue a viagem normalmente, registrando ocorrência.

**PENDING:** definir limite de espera, procedimento para ausência sem contato, quem autoriza seguir e como registrar a orientação. Não implementar timeout arbitrário sem decisão da Secretaria.

## D-019 — Deploy acadêmico
**Status: PROPOSED**

Vercel (frontend), Render (backend) e Supabase (PostgreSQL) como opções para MVP/demonstração. Avaliar limites, suspensão por inatividade, backups, disponibilidade, custos e segurança. Usar somente dados fictícios até avaliação formal para produção.

## D-020 — Auditoria
**Status: CONFIRMED**

Alterações relevantes de prioridade, horários, alocação, cancelamento/interrupção e estados operacionais devem ser auditadas. Evitar payloads completos e dados sensíveis nos logs.

## D-021 — Conflitos de agenda
**Status: CONFIRMED**

Não permitir sobreposição de viagens para o mesmo motorista ou veículo. A proteção deve suportar requisições concorrentes, não apenas uma validação simples na interface.

## D-022 — Otimização avançada de rota
**Status: PROPOSED / FUTURO**

Não implementar inicialmente otimização avançada do tipo VRP com janelas de tempo. Começar com sugestão simples e aprovação administrativa. Evoluir após validar regras e dados operacionais.

## D-023 — Fim planejado da operação (intervalo de ocupação)
**Status: PROPOSED**

O modelo original só tinha `plannedDepartureAt` e `plannedReturnStartAt`, o que não delimita o intervalo em que motorista e veículo ficam ocupados. Foi adicionado `Trip.plannedReturnEndAt` (fim planejado do retorno). O conflito de agenda (D-021) usa o intervalo semiaberto `[plannedDepartureAt, plannedReturnEndAt)`; viagens que apenas encostam no limite não conflitam. Somente viagens `SCHEDULED` e `IN_PROGRESS` ocupam a agenda; `CANCELLED`, `COMPLETED` e `INTERRUPTED` liberam.

**Limitação:** o intervalo usa horários planejados; uma viagem em andamento que ultrapasse o fim planejado ainda não bloqueia a agenda além dele. **Aguarda aprovação do responsável pelo produto.**

## D-024 — Justificativa obrigatória da prioridade
**Status: PROPOSED**

Decorre de D-013 ("responsável, instante e justificativa"): `priorityJustification` é obrigatória ao definir ou alterar a prioridade de uma `PatientTrip`.

## D-025 — Autenticação provisória
**Status: PROPOSED (política de sessão segue PENDING)**

Login por e-mail/senha (hash bcrypt) com JWT de acesso (`JWT_EXPIRES_IN`, padrão 1h). Sem refresh token, recuperação de senha ou limite de tentativas. O papel e a situação ativa do usuário são relidos do banco a cada requisição.
