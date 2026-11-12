# Histórias de usuário — Mov+

## Administração

- **US-01:** Como ADMIN, quero cadastrar pacientes para organizar o transporte.
- **US-02:** Como ADMIN, quero cadastrar motoristas e veículos para administrar a frota.
- **US-03:** Como ADMIN, quero criar uma viagem com horários fixos de ida e retorno.
- **US-04:** Como ADMIN, quero alocar motorista e veículo sem conflitos de agenda.
- **US-05:** Como ADMIN, quero adicionar pacientes e acompanhantes respeitando a capacidade.
- **US-06:** Como ADMIN, quero registrar estabelecimento e horário da consulta de cada paciente.
- **US-07:** Como ADMIN, quero definir prioridade para organizar as demandas.
- **US-08:** Como ADMIN, quero visualizar e aprovar a sequência de paradas.
- **US-09:** Como ADMIN, quero acompanhar confirmações de presença e não respostas.
- **US-10:** Como ADMIN, quero alterar horário planejado antes do início e manter histórico.
- **US-11:** Como ADMIN, quero cancelar uma viagem ainda não iniciada.
- **US-12:** Como ADMIN, quero registrar interrupção de uma viagem já iniciada.

## Motorista

- **US-13:** Como MOTORISTA, quero consultar as viagens atribuídas a mim.
- **US-14:** Como MOTORISTA, quero visualizar a rota aprovada e os dados necessários dos passageiros.
- **US-15:** Como MOTORISTA, quero iniciar a viagem e registrar o horário real automaticamente.
- **US-16:** Como MOTORISTA, quero registrar embarque e ausência na ida.
- **US-17:** Como MOTORISTA, quero registrar que um paciente não retornará, quando comunicado previamente.
- **US-18:** Como MOTORISTA, quero consultar os contatos de paciente/acompanhante para tratar uma ausência no recolhimento.
- **US-19:** Como MOTORISTA, quero registrar tentativa de contato, espera e ocorrência no retorno.
- **US-20:** Como MOTORISTA, quero finalizar a viagem e registrar o horário real automaticamente.

## Paciente/acompanhante e notificações

- **US-21:** Como paciente ou responsável autorizado, quero confirmar ou recusar a participação por WhatsApp.
- **US-22:** Como ADMIN, quero que a ausência de resposta gere lembrete e alerta, sem excluir automaticamente o paciente.

## Critérios transversais de aceite

- A autorização deve ser validada no backend.
- Alterações críticas devem gerar auditoria.
- Não resposta não pode alterar automaticamente a participação para desistência.
- A situação da ida não deve ser sobrescrita pela situação da volta.
- Dados exibidos ao motorista devem respeitar o princípio do menor privilégio.
- Conflitos de agenda devem ser impedidos mesmo em solicitações simultâneas.
