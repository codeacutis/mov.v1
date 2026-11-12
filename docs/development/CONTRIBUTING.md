# Contribuição

## 1. Fluxo de trabalho

1. Consultar o quadro do projeto.
2. Selecionar tarefa priorizada e atribuída.
3. Criar branch a partir da branch principal.
4. Implementar uma alteração pequena e focada.
5. Adicionar/atualizar testes.
6. Atualizar documentação quando regra ou contrato mudar.
7. Abrir Pull Request.
8. Solicitar revisão de outro integrante.
9. Integrar somente após validação.

## 2. Branches

**PROPOSED:** `main` protegida; branches `feat/<assunto>`, `fix/<assunto>`, `docs/<assunto>` e `chore/<assunto>`. A equipe deve confirmar a convenção.

## 3. Pull Requests

Descrever:
- objetivo;
- mudanças realizadas;
- como testar;
- screenshots quando houver mudança visual;
- migrations e impacto em dados;
- decisões assumidas;
- riscos e pendências.

## 4. Qualidade

- Não incluir segredos ou dados reais.
- Não ignorar testes que falham sem justificativa.
- Evitar PRs grandes e misturando tarefas sem relação.
- Toda regra de negócio deve estar coberta por teste.
- Mudanças de contrato da API devem ser comunicadas ao frontend.

## 5. Gestão

O Trello é utilizado para acompanhar Backlog, A fazer, Em andamento, Em revisão e Concluído. Atualizar o cartão correspondente e registrar bloqueios.
