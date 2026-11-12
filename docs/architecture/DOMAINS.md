# Domínios do Mov+

## 1. Gestão de acesso
Responsável por autenticação, usuários, papéis e autorização.

Papéis confirmados:
- `ADMIN`: representa o administrador operacional da Secretaria Municipal de Saúde.
- `MOTORISTA`: executa viagens e consulta somente informações necessárias à operação.

## 2. Pacientes
Mantém o cadastro mínimo necessário para identificação e contato. Não é um prontuário eletrônico.

Dados propostos:
- nome;
- data de nascimento;
- telefone ou contato alternativo;
- CPF opcional, sujeito à confirmação de necessidade;
- Cartão SUS opcional;
- endereço opcional;
- indicadores operacionais de acessibilidade/embarque;
- observação curta e controlada.

Não coletar tipo sanguíneo nem diagnóstico clínico para o escopo atual.

## 3. Motoristas e usuários
Cada motorista possui cadastro operacional `Driver` e conta individual `User`, em relação 1:1. A conta com papel `MOTORISTA` deve estar vinculada a um motorista.

## 4. Frota
Gerencia veículos, capacidade, situação e disponibilidade. Veículo inativo ou em manutenção não pode ser alocado.

## 5. Viagens
Representa a operação municipal de ida e volta. Contém horário fixo planejado de saída, horário fixo planejado de início do retorno, motorista, veículo e estado geral.

## 6. Participação do paciente
`PatientTrip` representa a inclusão de um paciente em uma viagem. É o local dos dados contextuais daquela participação:
- prioridade;
- estabelecimento e horário da consulta;
- estado de confirmação;
- estado independente da ida e da volta;
- informação de acompanhante;
- ocorrência de ausência/retorno por outro meio.

A mesma pessoa pode ter prioridades e confirmações diferentes em viagens distintas.

## 7. Paradas e rota
`TripStop` representa cada parada física na rota, com sequência e endereço. O MVP não exige navegação em tempo real. O sistema pode sugerir uma ordem simples e o administrador aprova.

A rota precisa contemplar:
- saída do ponto municipal;
- entrega dos pacientes nos estabelecimentos;
- recolhimento dos pacientes nos estabelecimentos no retorno;
- retorno ao ponto municipal.

A associação de uma participação à parada correspondente deve ser explícita.

## 8. Acompanhantes
Acompanhante é contextual à participação do paciente, sem cadastro global obrigatório no MVP. `TripCompanion` registra nome e telefone e se vincula a `PatientTrip`.

## 9. Confirmações e notificações
Confirmação automática via WhatsApp oficial. Uma confirmação pertence a `PatientTrip`, não ao paciente globalmente. Eventos de envio, entrega, falha, resposta e reenvio devem ser registrados sem armazenar conversas completas.

## 10. Auditoria
Registra ator, ação, entidade, identificador, instante, justificativa e mudanças relevantes, evitando armazenar dados pessoais completos ou segredos.
