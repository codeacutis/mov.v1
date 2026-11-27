# Histórias de usuário — Mov+

## Administração

- **US-01:** Como ADMIN, quero cadastrar pacientes com nome, data de nascimento e telefone obrigatórios e CPF opcional para organizar o transporte.
- **US-02:** Como ADMIN, quero cadastrar e consultar veículos, editar seus dados e inativá-los para manter a frota atualizada sem perder o histórico.
- **US-03:** Como ADMIN, quero criar uma viagem com horários de saída, início do retorno e chegada prevista ao município de origem para planejar a ocupação.
- **US-04:** Como ADMIN, quero alocar motorista e veículo sem conflitos de agenda.
- **US-05:** Como ADMIN, quero adicionar pacientes e acompanhantes respeitando a capacidade.
- **US-06:** Como ADMIN, quero registrar estabelecimento e horário da consulta de cada paciente, usando a data da viagem como referência e impedindo consulta anterior à saída planejada (D-027).
- **US-07:** Como ADMIN, quero definir prioridade para organizar as demandas.
- **US-08:** Como ADMIN, quero organizar manualmente e aprovar a sequência de paradas, com retorno em ordem inversa.
  - Posso editar locais, associar participantes ativos e mover paradas para cima/baixo antes do início. Vejo ida e retorno completos para revisão; alterações invalidam a aprovação anterior e o motorista só recebe a sequência novamente após aprovação.
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
- **US-19:** Como MOTORISTA, quero tentar contato com o paciente ausente e registrar ocorrência e justificativa para poder prosseguir no retorno.
- **US-20:** Como MOTORISTA, quero finalizar a viagem e registrar o horário real automaticamente.

## Paciente/acompanhante e notificações

- **US-21:** Como paciente ou responsável autorizado, quero confirmar ou recusar a participação por WhatsApp.
- **US-22:** Como ADMIN, quero que a ausência de resposta gere lembrete e alerta, sem excluir automaticamente o paciente.

## Critérios transversais de aceite

- Como ADMIN, quero gerenciar consulta, prioridade e acompanhante nos detalhes da viagem e consultar a ocupação atualizada.
- Como ADMIN, quero cancelar participação antes do início com motivo, liberando vagas e preservando histórico (D-026).

- A autorização deve ser validada no backend.
- Alterações críticas devem gerar auditoria.
- Não resposta não pode alterar automaticamente a participação para desistência.
- A situação da ida não deve ser sobrescrita pela situação da volta.
- Dados exibidos ao motorista devem respeitar o princípio do menor privilégio.
- Após login e restauração da sessão, ADMIN abre o painel e MOTORISTA abre sua área operacional, sem menu administrativo.
- O motorista registra o início real do retorno por ação específica. Botões de embarque e ausência respeitam a etapa persistida na API; após cada operação, os dados são recarregados.
- Conflitos de agenda devem ser impedidos mesmo em solicitações simultâneas.
