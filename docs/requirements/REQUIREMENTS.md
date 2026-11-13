# Requisitos do Mov+

## 1. Objetivo

Apoiar a Secretaria Municipal de Saúde na organização do transporte de pacientes para consultas, exames e procedimentos em outros municípios.

## 2. Requisitos funcionais

- **RF-01 — Autenticação:** permitir acesso por conta individual.
- **RF-02 — Papéis:** distinguir ADMIN e MOTORISTA.
- **RF-03 — Usuários/motoristas:** manter vínculo 1:1 entre conta de motorista e cadastro operacional.
- **RF-04 — Pacientes:** cadastrar e manter dados mínimos necessários.
- **RF-05 — Veículos:** permitir ao ADMIN cadastrar, consultar, editar e inativar veículos; validar capacidade positiva e situação operacional, mantendo histórico por inativação lógica.
- **RF-06 — Viagens:** criar viagem de ida e volta com saída municipal e início de retorno planejados.
- **RF-07 — Alocação:** designar um motorista e um veículo por viagem.
- **RF-08 — Participantes:** adicionar pacientes à viagem e registrar acompanhantes.
- **RF-09 — Capacidade:** impedir lotação acima da capacidade, contando pacientes e acompanhantes.
- **RF-10 — Consulta:** registrar estabelecimento, endereço e horário de consulta por participação.
- **RF-11 — Prioridade:** permitir ao ADMIN classificar prioridade HIGH/MEDIUM/LOW e justificar.
- **RF-12 — Rota:** sugerir sequência de paradas e permitir revisão/aprovação pelo ADMIN.
- **RF-13 — Visualização do motorista:** exibir rota aprovada e dados operacionais permitidos.
- **RF-14 — Confirmação:** solicitar confirmação automática por WhatsApp quando integração estiver habilitada.
- **RF-15 — Webhook:** receber resposta e atualizar estado de confirmação.
- **RF-16 — Lembrete:** permitir reenvio/lembrete e alertar ADMIN sobre não resposta.
- **RF-17 — Início:** permitir ao motorista iniciar viagem e registrar horário real no servidor.
- **RF-18 — Finalização:** permitir finalizar viagem e registrar horário real no servidor.
- **RF-19 — Ida:** registrar embarque/ausência de cada paciente na ida.
- **RF-20 — Volta:** registrar retorno individual ou informação prévia de que não retornará.
- **RF-21 — Ausência no retorno:** permitir registrar tentativa de contato, espera e ocorrência; seguir fluxo conforme orientação operacional.
- **RF-22 — Cancelamento:** permitir cancelar viagem antes de iniciada, com motivo e auditoria.
- **RF-23 — Interrupção:** permitir interromper viagem iniciada, com motivo, horário, responsável e providência.
- **RF-24 — Auditoria:** registrar alterações administrativas e eventos críticos.
- **RF-25 — Histórico:** preservar histórico operacional.

## 3. Requisitos não funcionais

- **RNF-01 — Segurança:** autenticação e autorização no backend.
- **RNF-02 — Privacidade:** minimização de dados e acesso por necessidade.
- **RNF-03 — Integridade:** transações para operações críticas.
- **RNF-04 — Agenda:** impedir conflitos de veículo/motorista mesmo sob concorrência.
- **RNF-05 — Rastreabilidade:** registrar ator e instante de ações críticas.
- **RNF-06 — Usabilidade:** interface responsiva e simples para ADMIN e MOTORISTA.
- **RNF-07 — Manutenibilidade:** módulos organizados por domínio e código tipado.
- **RNF-08 — Testabilidade:** regras de negócio cobertas por testes automatizados.
- **RNF-09 — Disponibilidade:** comunicar falhas de integração sem perder o estado operacional.
- **RNF-10 — LGPD:** estabelecer base legal, finalidade, retenção, controles e atendimento aos direitos dos titulares antes de operar com dados reais.

## 4. Regras de negócio

- **RN-01:** ADMIN representa a Secretaria Municipal de Saúde.
- **RN-02:** uma Trip representa a operação municipal de ida e volta.
- **RN-03:** cada PatientTrip possui estado independente de ida e volta.
- **RN-04:** saída da ida e início do retorno são horários fixos planejados.
- **RN-05:** a rota de ida entrega pacientes nos estabelecimentos; a rota de retorno recolhe pacientes nos estabelecimentos.
- **RN-06:** o sistema sugere rota simples; ADMIN aprova.
- **RN-07:** motorista consulta rota aprovada; navegação em tempo real não é requisito do MVP.
- **RN-08:** se paciente não avisou previamente que não retornará/estará ausente, motorista aguarda e tenta contato com paciente/acompanhante.
- **RN-09:** se não for para aguardar, motorista segue viagem e registra ocorrência/orientação.
- **RN-10:** ausência de resposta no WhatsApp não equivale a desistência.
- **RN-11:** capacidade inclui pacientes e acompanhantes, exclui motorista.
- **RN-12:** motorista não acessa CPF, Cartão SUS, endereço completo ou diagnóstico.
- **RN-13:** horário real é definido pelo servidor.
- **RN-14:** alteração de horários planejados só por ADMIN e antes do início.
- **RN-15:** correção de horário real exige ADMIN, justificativa e auditoria.
- **RN-16:** viagem iniciada e não concluída normalmente deve ser interrompida, não cancelada.
- **RN-17:** veículo inativo/em manutenção não pode ser alocado.
- **RN-18:** não pode haver sobreposição de agenda de motorista ou veículo.

## 5. Pendências

Ver `DECISIONS.md` e `ROADMAP.md`. Em especial: campos obrigatórios do paciente, política de espera, provedor de WhatsApp, provedor de mapas/rotas, retenção de dados e política de autenticação.
