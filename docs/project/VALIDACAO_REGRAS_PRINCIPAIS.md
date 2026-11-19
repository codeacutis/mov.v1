# Validação das regras principais

Data da execução: 19/11/2026.

## Escopo

Esta rodada validou regras confirmadas de conflito de horários, capacidade,
cancelamento, interrupção e retorno individual. Os testes usam somente dados
fictícios e um PostgreSQL separado, com nome terminado em `_test`.

Suíte automatizada: `apps/api/test/business-rules-validation.e2e-spec.ts`.

## Cenários executados

| Área | Cenário | Resultado |
| --- | --- | --- |
| Agenda | Bloqueio de sobreposição parcial para o mesmo veículo | Aprovado |
| Agenda | Liberação de veículo e motorista após cancelamento | Aprovado |
| Agenda | Dez tentativas concorrentes com os mesmos recursos geram uma viagem | Aprovado |
| Capacidade | Pacientes e acompanhantes ocupam exatamente a capacidade | Aprovado |
| Capacidade | Inclusão acima da capacidade retorna conflito | Aprovado |
| Capacidade | Cinco inclusões concorrentes para uma vaga geram um acompanhante | Aprovado após correção |
| Ciclo de vida | Cancelamento registra estado, motivo, ator e auditoria | Aprovado |
| Ciclo de vida | Interrupção registra estado, motivo, providência, ator e auditoria | Aprovado |
| Ciclo de vida | Interrupção de viagem ainda agendada é rejeitada | Aprovado |
| Retorno | Um paciente pode embarcar na ida e não retornar | Aprovado no modelo e na consulta do motorista |
| Retorno | O estado de retorno de um paciente não altera os demais | Aprovado no modelo e na consulta do motorista |

Resultado da suíte focada: 8 testes aprovados de 8.

Resultado da suíte completa após as correções: 139 testes aprovados de 139,
distribuídos em 10 suítes.

## Problemas encontrados

### VR-001 — Capacidade vulnerável a inclusões concorrentes

**Severidade:** crítica  
**Situação:** corrigido e validado

Com uma vaga disponível, requisições concorrentes conseguiam cadastrar dois
acompanhantes. A verificação e a criação eram operações separadas, sem
serialização por viagem.

A correção colocou a verificação e a criação na mesma transação e adquiriu um
bloqueio transacional por viagem antes de calcular a ocupação. O cenário passou
com uma resposta de sucesso, quatro conflitos e apenas um acompanhante gravado.

### VR-002 — Não há operação para incluir paciente na viagem

**Severidade:** crítica  
**Situação:** aberto

O modelo possui `PatientTrip`, mas a API não expõe uma operação para criar a
participação. A tela de nova viagem consulta pacientes e informa que eles serão
adicionados depois, enquanto a tela de paradas apenas atualiza participações já
existentes. Por isso, os cenários de capacidade precisaram preparar
`PatientTrip` diretamente no banco de testes.

Correção necessária: implementar a inclusão administrativa do paciente na
viagem em transação, com prioridade, capacidade, unicidade e auditoria.

### VR-003 — Estados individuais não podem ser registrados pela API

**Severidade:** crítica  
**Situação:** aberto e já relacionado às pendências de operações do motorista

Os estados `outboundStatus` e `returnStatus` existem e são retornados na
consulta do motorista, mas não há endpoint para registrar embarque, ausência,
retorno ou `NOT_RETURNING`. O cenário comprovou a independência dos estados
após preparação controlada no banco, mas o fluxo operacional ainda não pode ser
executado pela aplicação.

Correção necessária: criar comandos autorizados para as transições confirmadas,
com horário do servidor e auditoria. A política de espera sem contato continua
dependente da decisão registrada em D-018.

### VR-004 — Garantia de agenda ainda depende da aplicação

**Severidade:** crítica  
**Situação:** aberto

O cenário de dez criações concorrentes produziu uma viagem nesta execução.
Mesmo assim, a implementação faz consulta seguida de inserção e não possui
constraint de exclusão no PostgreSQL. D-021 e RNF-04 exigem proteção consistente
sob concorrência. Também falta a definição do término planejado da operação,
pois o intervalo atual termina no início programado do retorno.

Correção necessária: após a decisão do campo de término planejado, criar
migration com proteção de sobreposição no banco e manter o teste concorrente
como regressão.

### VR-005 — Teste de veículos incompatível com a paginação

**Severidade:** baixa  
**Situação:** corrigido e validado

O teste de veículos esperava que `GET /vehicles` retornasse um array, embora o
contrato atual retorne `data`, `total`, `page` e `limit`. A expectativa foi
atualizada e a suíte voltou a passar.

## Comandos de reprodução

```powershell
cd apps/api
$env:TEST_DATABASE_URL = "postgresql://USUARIO@localhost:5432/mov_test"
npm run test:e2e:prepare
npm run test:e2e -- --runInBand test/business-rules-validation.e2e-spec.ts
```

O banco indicado deve ser descartável e terminar em `_test`.
