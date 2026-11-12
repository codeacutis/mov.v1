# Instruções para agentes de desenvolvimento

## Objetivo

Estas instruções orientam agentes de IA e colaboradores que trabalhem no repositório do Mov+. A documentação de produto é a referência para regras de negócio; não invente regras ausentes. O código da API fica em `apps/api`; o frontend em `apps/web`.

## Antes de alterar código

1. Leia este arquivo e o `README.md`.
2. Leia `docs/decisions/DECISIONS.md`, `docs/architecture/ARCHITECTURE.md`, `DOMAINS.md` e `DATA_MODEL.md`.
3. Identifique o status da regra: `CONFIRMED`, `PROPOSED` ou `PENDING`.
4. Se uma implementação depender de decisão `PENDING`, não escolha silenciosamente. Registre a dúvida e solicite decisão do responsável pelo produto.
5. Verifique o estado real do repositório antes de afirmar que algo existe ou está implementado.

## Regras fundamentais

- A Secretaria Municipal de Saúde é a administradora operacional do sistema.
- Uma `Trip` representa a operação municipal planejada de ida e volta.
- A participação de cada paciente é individualizada em `PatientTrip`.
- Ida e volta possuem estados independentes por paciente.
- A saída municipal da ida e o início programado do retorno são horários fixos da viagem.
- Na ida, o motorista segue a rota aprovada e deixa cada paciente no estabelecimento correspondente.
- No retorno, o motorista percorre os estabelecimentos para recolher os pacientes, respeitando a programação.
- Se o paciente não comunicou previamente que não retornará ou que estará ausente, o motorista deve aguardar sua chegada/disponibilidade. Pode utilizar os contatos registrados na participação para tentar contato com paciente ou acompanhante. Se não for para aguardar, segue a viagem normalmente conforme a orientação operacional aplicável.
- Não tratar falta de resposta a confirmação como desistência automática.
- Não remover paciente automaticamente da viagem por ausência ou falta de confirmação.
- Não armazenar diagnósticos ou informações clínicas desnecessárias.
- O motorista acessa somente os dados necessários à execução do transporte.
- Toda alteração administrativa relevante deve gerar trilha de auditoria.
- Horários reais de início e término são definidos pelo backend, não pelo relógio do dispositivo.
- Não permitir conflitos de agenda de veículo ou motorista.

## Segurança e privacidade

- Nunca inserir credenciais, tokens, senhas ou dados pessoais reais em código, commits, logs ou exemplos.
- Usar variáveis de ambiente e arquivos `.env` ignorados pelo Git.
- Validar autorização no backend; ocultar elementos no frontend não é controle de segurança.
- Minimizar dados retornados pela API conforme o papel do usuário.
- Não registrar payloads completos contendo dados pessoais em logs.
- Usar apenas dados fictícios em desenvolvimento, testes, demonstrações e ambientes acadêmicos.

## Engenharia

- Manter TypeScript com tipagem estrita sempre que possível.
- Respeitar os módulos e limites de domínio definidos na arquitetura.
- Validar dados na borda da API.
- Aplicar regras críticas no backend e no banco, não apenas na interface.
- Usar transações para operações que alterem simultaneamente viagem, passageiros, disponibilidade e auditoria.
- Criar migrations versionadas; não alterar o banco manualmente como substituto de migration.
- Escrever testes para regras de negócio, autorização, conflitos de agenda e transições de estado.
- Não introduzir dependências ou serviços externos sem justificar custo, segurança e disponibilidade.

## Documentação

Ao alterar uma regra confirmada, atualize `DECISIONS.md`, `REQUIREMENTS.md`, `USER_STORIES.md` e/ou `DATA_MODEL.md`, conforme necessário. Não transforme propostas em decisões confirmadas sem aprovação explícita.

## Entrega

Antes de concluir uma tarefa, informe:
- o que foi alterado;
- arquivos afetados;
- decisões assumidas;
- testes executados e seus resultados;
- limitações e pendências.
