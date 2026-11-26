# Arquitetura do Mov+

## 1. Visão geral

O Mov+ é uma aplicação web para planejamento e acompanhamento do transporte municipal de pacientes. A Secretaria Municipal de Saúde administra viagens, pacientes, motoristas, veículos, rotas, confirmações e ocorrências.

## 2. Arquitetura lógica

**CONFIRMED — tecnologias escolhidas**
- Backend: Node.js + NestJS + TypeScript.
- Adaptador HTTP: Express, utilizado pelo NestJS como adaptador padrão, não como um segundo backend.
- Frontend: React + TypeScript.
- Persistência: PostgreSQL.
- ORM: Prisma.
- Integração: API REST.
- Monorepo: `apps/api` (NestJS) e `apps/web` (React) no mesmo repositório Git; aplicações e deploys permanecem separados.

**PROPOSED — organização do backend**
- `Auth`: autenticação, sessão/token e autorização.
- `Users`: contas e papéis.
- `Patients`: cadastro e dados mínimos de pacientes.
- `Drivers`: cadastro operacional de motoristas.
- `Vehicles`: frota e disponibilidade.
- `Trips`: planejamento, execução e encerramento de viagens.
- `TripStops`: paradas e sequência da rota.
- `PatientTrips`: participação, prioridade, confirmação e estados de ida/volta.
- `Companions`: acompanhantes associados à participação.
- `Notifications`: integração de confirmação por WhatsApp.
- `Audit`: trilha de auditoria.
- `Health/Monitoring`: saúde operacional da API.

A divisão em módulos deve refletir os limites de domínio, não necessariamente uma aplicação distribuída em microserviços. Para o MVP, recomenda-se um monólito modular NestJS.

## 3. Componentes externos

- WhatsApp Business Platform / Cloud API: envio de mensagens e recebimento de respostas por webhook.
- Serviço de geocodificação/rotas: não será utilizado no MVP. O ADMIN organiza as paradas, e a sequência de retorno é apresentada em ordem inversa à ida.
- Hospedagem: proposta inicial de Vercel para frontend, Render para backend e Supabase PostgreSQL. Confirmar limites e adequação antes de uso. Esta combinação é apenas para MVP/demonstração com dados fictícios.

## 4. Fluxos principais

### 4.1 Planejamento ------
1. Administrador cadastra ou seleciona pacientes.
2. Cria uma viagem com horário fixo de saída municipal, horário fixo de início do retorno e chegada prevista ao município de origem, fim planejado da ocupação do veículo.
3. Designa motorista e veículo.
4. Adiciona pacientes e acompanhantes.
5. Define prioridade de cada participação.
6. Informa o estabelecimento/consulta de cada paciente.
7. Administrador organiza manualmente e aprova as paradas; o retorno segue a ordem inversa da ida.
8. Sistema solicita confirmações automáticas pelo WhatsApp, quando a integração estiver habilitada.

### 4.2 Ida
1. Motorista consulta a viagem e a rota aprovada.
2. Motorista inicia a viagem no sistema.
3. Backend registra `actualDepartureAt`.
4. Motorista segue a sequência aprovada e registra os eventos de embarque/desembarque necessários.

### 4.3 Retorno
1. O retorno começa no horário fixo definido na viagem.
2. Motorista percorre a rota de recolhimento.
3. Se o paciente tiver informado previamente que não retornará, a participação fica marcada como `NOT_RETURNING`.
4. Se o paciente estiver ausente, o motorista tenta contato com paciente ou acompanhante.
5. O motorista pode prosseguir após registrar ocorrência e justificativa.
6. Backend registra o encerramento real da viagem.

### 4.4 Interrupção
Uma viagem iniciada que não possa ser concluída normalmente deve ser marcada como `INTERRUPTED`, com motivo, horário, usuário responsável e providência. Não usar `CANCELLED` após início.

## 5. Regras transversais

- A autorização é aplicada no backend.
- A integridade de agenda deve ser garantida em transação.
- Horários reais são gerados pelo servidor.
- Alterações administrativas críticas são auditadas.
- Dados sensíveis são minimizados.
- Não resposta no WhatsApp não significa desistência.
- O sistema não deve decidir sozinho que um paciente perdeu o transporte.

## 6. Decisões ainda pendentes

- Regras de timeout/tempo máximo de espera no retorno.
- Escolha do provedor de e-mail para recuperação de senha.
- Política de autenticação e duração de sessão/token.
- Política de retenção e descarte de dados.
- Ambiente definitivo de produção e requisitos operacionais da Secretaria.
