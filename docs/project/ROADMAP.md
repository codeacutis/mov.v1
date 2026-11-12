# Roadmap

## Princípio

Separar o que é necessário para uma demonstração acadêmica do que representa uma solução operacional pronta para uso real pela Secretaria de Saúde.

## Fase 0 — Fechamento de decisões
- [x] Stack principal.
- [x] Papéis iniciais.
- [x] Viagem municipal de ida e volta.
- [x] Prioridade definida pelo ADMIN da Secretaria.
- [x] Ponto municipal de embarque no MVP.
- [x] Horários fixos de saída e início do retorno.
- [x] Participação individual com estados separados de ida e volta.
- [x] Confirmação automática por WhatsApp como comportamento desejado.
- [ ] Definir campos obrigatórios de paciente.
- [ ] Definir política de espera e escalonamento no retorno.
- [ ] Definir modelo final das sequências de ida e retorno.
- [ ] Definir política de retenção e segurança para produção.

## Fase 1 — Base técnica
- Monorepo padronizado (`apps/api` e `apps/web`).
- NestJS modular, React e PostgreSQL.
- Prisma e migrations iniciais.
- Autenticação e autorização.
- Pipeline de CI básico.
- Seeds fictícios.

## Fase 2 — MVP operacional acadêmico
- Cadastro de usuários, motoristas, veículos e pacientes.
- Criação de viagens e alocação sem conflitos.
- Participantes e acompanhantes.
- Capacidade do veículo.
- Registro de consultas/estabelecimentos.
- Prioridade administrativa.
- Sequência simples de paradas e aprovação.
- Visão da viagem para motorista.
- Início/finalização com horários do servidor.
- Estados independentes de ida e volta.
- Registro de paciente que não retornará.
- Registro de ausência, contato e ocorrência.

## Fase 3 — Confirmação por WhatsApp
- Interface de provider e mock.
- Templates e configuração oficial.
- Webhook autenticado e idempotente.
- Atualização de confirmação.
- Lembrete e alerta administrativo.
- Testes de falha e reenvio.

A integração oficial em produção depende de conta, número, templates, configuração e avaliação de custos/políticas da Meta.

## Fase 4 — Evoluções
- Mais de um ponto municipal de embarque.
- Otimização avançada de rotas e janelas de tempo.
- Integração com provedor de mapas/geocodificação.
- Relatórios gerenciais e indicadores.
- Exportações PDF/Excel.
- Melhorias de acessibilidade e experiência do motorista.

## Fora do escopo inicial
- Navegação curva a curva como Waze.
- Trânsito em tempo real.
- Diagnóstico ou prontuário clínico.
- Decisão clínica automatizada.
- Remoção automática de paciente por falta de resposta.
- Operação com dados reais antes da avaliação formal de privacidade, segurança e infraestrutura.
