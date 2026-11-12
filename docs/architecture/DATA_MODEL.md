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
- `name`
- `birthDate`
- `phone` e/ou contato alternativo (**PENDING** obrigatoriedade)
- `cpf` opcional (**PENDING** necessidade)
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
- `plannedReturnEndAt` (**PROPOSED**, D-023: fim planejado; delimita a ocupação de motorista e veículo)
- `actualDepartureAt`
- `actualReturnAt`
- `status`: `SCHEDULED | IN_PROGRESS | COMPLETED | CANCELLED | INTERRUPTED`
- campos de cancelamento/interrupção: motivo, instante, ator e observação, conforme necessário
- timestamps

A viagem representa uma operação municipal de ida e volta, não uma consulta individual.

### PatientTrip
- `id`
- `tripId`
- `patientId`
- `appointmentLocationName`
- `appointmentAddress`
- `appointmentMunicipality`
- `appointmentAt`
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

**PENDING:** confirmar se uma parada representa um estabelecimento físico e se a mesma parada é usada para desembarque na ida e embarque na volta. A modelagem deve permitir a sequência de ida e a sequência de retorno, que podem ser inversas ou diferentes.

### TripCompanion
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

## Relacionamentos principais

- User 1:0..1 Driver; todo User `MOTORISTA` deve possuir Driver.
- Driver 1:N Trip.
- Vehicle 1:N Trip.
- Trip 1:N PatientTrip.
- Patient 1:N PatientTrip.
- Trip 1:N TripStop.
- PatientTrip 1:N TripCompanion.
- PatientTrip 1:N ConfirmationLog.
- User 1:N AuditLog.

## Integridade e regras

- Não permitir sobreposição de viagens para o mesmo motorista ou veículo.
- Considerar o intervalo total da operação, da saída até o retorno planejado/real.
- Veículo inativo ou em manutenção não pode ser alocado.
- Total de passageiros = pacientes + acompanhantes; motorista não entra na capacidade.
- Impedir duplicidade do mesmo paciente na mesma viagem, salvo decisão explícita em contrário.
- Atualizações concorrentes de agenda precisam ser protegidas por transação e mecanismo de integridade no PostgreSQL.
- Preservar histórico; preferir inativação lógica a exclusão física de registros operacionais.
- Horários reais são definidos pelo servidor.
- A participação na ida não implica obrigatoriamente participação na volta.

## Pontos que exigem validação antes das migrations

1. Campos obrigatórios definitivos de Patient.
2. Modelagem de uma parada usada em dois sentidos ou duas sequências independentes.
3. Política para mais de um acompanhante por paciente.
4. Política para paciente que não embarca na ida.
5. Cardinalidade e unicidade dos registros de confirmação.
6. Regras de retenção e anonimização.

## Implementação atual (apps/api/prisma)

Migration `trips_agendamento` implementa: `User`, `Driver`, `Vehicle`, `Patient`, `Trip`, `PatientTrip`, `TripCompanion` e `AuditLog`. **Ainda não implementados:** `TripStop` e `ConfirmationLog` (dependem de decisões PENDING).

Garantias no PostgreSQL (extensão `btree_gist`):
- `EXCLUDE` impedindo sobreposição de motorista e de veículo entre viagens `SCHEDULED`/`IN_PROGRESS`;
- `CHECK` na ordem saída < início do retorno < fim do retorno;
- `CHECK` de capacidade positiva e de motivo/instante no cancelamento;
- `UNIQUE (tripId, patientId)`.

A capacidade é garantida na API, em transação, com a linha da viagem travada (`SELECT … FOR UPDATE`).
