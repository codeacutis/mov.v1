# Modelo conceitual de dados

> Este é um modelo conceitual inicial. Nomes, tipos, cardinalidades e restrições finais devem ser validados antes de gerar migrations Prisma.

## Entidades

### User
- `id`
- `name`
- `email` (ou identificador de login definido pela equipe)
- `passwordHash`
- `role`: `ADMIN | MOTORISTA`
- `isActive`
- timestamps

### Driver
- `id`
- `userId` (único; relação 1:1 com User)
- dados operacionais mínimos
- `isActive`

### Vehicle
- `id`
- identificação/placa
- descrição/modelo
- `capacity` (quantidade de passageiros; não inclui motorista)
- `status` (ex.: `ACTIVE`, `IN_MAINTENANCE`, `INACTIVE`)

### Patient
- `id`
- `name` obrigatório
- `birthDate` obrigatório
- `phone` obrigatório
- `cpf` opcional
- `susCardNumber` opcional
- endereço opcional
- indicadores operacionais: `usesWheelchair`, `hasReducedMobility`, `needsBoardingAssistance`
- observação operacional limitada
- `isActive`
- timestamps

Idade deve ser calculada a partir de `birthDate`; não persistir idade como dado mutável.

### Trip
- `id`
- `vehicleId`
- `driverId`
- `municipalPickupPoint` ou referência a ponto cadastrado
- `plannedDepartureAt`
- `plannedReturnStartAt` (horário fixo de início do percurso de retorno)
- horário previsto de chegada ao município de origem (fim planejado da ocupação; nome técnico a definir)
- `actualDepartureAt`
- `actualReturnStartAt`: início real da etapa de retorno, registrado pelo servidor.
- `actualReturnAt`
- `status`: `SCHEDULED | IN_PROGRESS | COMPLETED | CANCELLED | INTERRUPTED`
- campos de cancelamento/interrupção: motivo, instante, ator e observação, conforme necessário
- timestamps

A viagem representa uma operação municipal de ida e volta, não uma consulta individual.

### PatientTrip
- `cancelledAt`, `cancellationReason`, `cancelledByUserId`: cancelamento lógico antes do início (D-026).
- `id`
- `tripId`
- `patientId`
- `appointmentLocationName`
- `appointmentAddress`
- `appointmentMunicipality`
- `appointmentAt`: na criação/edição, igual ou posterior a `Trip.plannedDepartureAt` (D-027). Reagendar a saída preserva essa ordem nas participações ativas.
- `priority`: `HIGH | MEDIUM | LOW`
- `priorityJustification`
- `priorityDefinedByUserId`
- `priorityDefinedAt`
- `confirmationStatus`: `PENDING | CONFIRMED | DECLINED | NO_RESPONSE`
- `outboundStatus`: `PLANNED | BOARDED | NO_SHOW`
- `returnStatus`: `EXPECTED | RETURNED | NOT_RETURNING | NO_SHOW`
- `returnAbsenceReason`
- `returnAbsenceReportedAt`
- `returnAbsenceReportedBy`
- vínculo com parada de ida e parada de retorno, se necessário
- timestamps

A prioridade é contextual à consulta/viagem e não deve ficar em `Patient`.

Para novos registros pela API, `NOT_RETURNING` representa aviso prévio e `NO_SHOW` representa ausência constatada no retorno. Ambos exigem motivo, com instante e usuário registrador definidos pelo backend. Uma correção de estado mantém a alteração na auditoria. Registros antigos de `NO_SHOW` podem existir sem esses metadados.

### TripStop
- `id`
- `tripId`
- `sequence`
- `name`
- `address`
- `municipality`
- `latitude` e `longitude` opcionais
- `stopType` ou papel operacional da parada
- `plannedArrivalAt` opcional
- `notes` operacionais não sensíveis

O ADMIN organiza e aprova a sequência de ida; o retorno segue a ordem inversa. A implementação utiliza os registros `TripStop` existentes com `direction` e `sequence`, e as relações `PatientTrip.outboundStopId`/`returnStopId`, sem entidade adicional `PatientTripStop`. Cada local da ida possui correspondente no retorno com a mesma sequência; o retorno é percorrido em ordem decrescente. Locais e vínculos são sincronizados a partir da ida; horários previstos são próprios de cada sentido. Estabelecimentos podem ser compartilhados entre participações.

`Trip.routeApprovedAt` e `routeApprovedByUserId` são limpos atomicamente após mudanças no planejamento/rota, consulta ou participantes. A aprovação exige viagem agendada, correspondência entre ida/retorno e vínculos completos dos participantes ativos. Mutações da rota após o início são bloqueadas, preservando a operação executada.

### TripCompanion
- `removedAt`: remoção lógica; somente registros não removidos ocupam vaga.
- `id`
- `patientTripId`
- `name`
- `phone`
- `relationship` opcional
- timestamps

### ConfirmationLog
- `id`
- `patientTripId`
- `eventType`: solicitado, enviado, entregue, falha, resposta, reenvio
- `providerMessageId` quando disponível
- `occurredAt`
- metadados técnicos mínimos, sem armazenar conversa inteira

### AuditLog
- `id`
- `actorUserId`
- `action`
- `entityType`
- `entityId`
- `occurredAt`
- `reason` quando necessário
- `changes` minimizadas e sem dados sensíveis desnecessários

### TripObservation
- `id`
- `tripId`
- `authorId`
- `type`: `INCIDENT | CONTACT_ATTEMPT`; registros anteriores permanecem `INCIDENT`.
- `patientTripId` opcional: vínculo com uma participação da mesma viagem; obrigatório para tentativa de contato pelo motorista.
- `description`
- `createdAt`

Usada para registrar ausência no retorno e outras observações operacionais sem alterar automaticamente os estados de outras participações. O lançamento de `NO_SHOW` no retorno pelo motorista grava tentativa e ocorrência na mesma transação da participação e auditoria. O texto livre não integra os GETs do portal operacional.

## Relacionamentos principais

- User 1:0..1 Driver; todo User `MOTORISTA` deve possuir Driver.
- Driver 1:N Trip.
- Vehicle 1:N Trip.
- Trip 1:N PatientTrip.
- Patient 1:N PatientTrip.
- Trip 1:N TripStop.
- PatientTrip 1:0..1 TripCompanion.
- PatientTrip 1:N ConfirmationLog.
- User 1:N AuditLog.

## Integridade e regras

- Não permitir sobreposição de viagens para o mesmo motorista ou veículo.
- Para a ocupação planejada do veículo, considerar da saída municipal à chegada prevista ao município de origem. A adequação da implementação existente permanece pendente.
- Veículo inativo ou em manutenção não pode ser alocado.
- Total de passageiros = pacientes + acompanhantes; motorista não entra na capacidade.
- Na ocupação, excluir participações canceladas e seus acompanhantes; excluir acompanhantes removidos. Cancelamento preserva unicidade paciente/viagem e histórico.
- Impedir duplicidade do mesmo paciente na mesma viagem, salvo decisão explícita em contrário.
- Atualizações concorrentes de agenda precisam ser protegidas por transação e mecanismo de integridade no PostgreSQL.
- Preservar histórico; preferir inativação lógica a exclusão física de registros operacionais.
- Horários reais são definidos pelo servidor.
- A participação na ida não implica obrigatoriamente participação na volta.
- A participação na volta só pode ser marcada como utilizada quando a ida estiver `BOARDED`.

## Pontos que exigem validação antes das migrations

1. Detalhes de validação dos campos de Patient não definidos pela decisão da Release 4.
2. Evoluções na representação das paradas: a implementação atual reutiliza registros por direção e vínculos explícitos, respeitando a ordem inversa confirmada.
3. Política para mais de um acompanhante por paciente.
4. Política para paciente que não embarca na ida.
5. Cardinalidade e unicidade dos registros de confirmação.
6. Regras de retenção e anonimização.
