# Estratégia de testes

## 1. Pirâmide

- Unitários: regras de domínio e transições.
- Integração: serviços, Prisma e PostgreSQL.
- API/e2e: autenticação, autorização e fluxos completos.
- Frontend: componentes e fluxos críticos.
- Testes manuais: usabilidade com dados fictícios.

## 2. Casos prioritários

### Viagens e agenda
- Não permitir motorista em duas viagens sobrepostas.
- Não permitir veículo em duas viagens sobrepostas.
- Testar requisições concorrentes de alocação.
- Bloquear veículo inativo ou em manutenção.
- Impedir alteração de horário planejado após início.

### Capacidade
- Contar pacientes e acompanhantes.
- Não contar motorista.
- Rejeitar inclusão que exceda capacidade.

### Participação
- Ida e volta têm estados independentes.
- Paciente pode embarcar na ida e não retornar no veículo.
- `NOT_RETURNING` não remove a participação nem apaga a ida.
- Não resposta de WhatsApp não remove o paciente.
- Ausência no retorno permite registrar tentativa de contato e ocorrência.

### Autorização e privacidade
- MOTORISTA só acessa viagens atribuídas.
- MOTORISTA não recebe CPF, Cartão SUS, endereço completo ou diagnóstico.
- ADMIN consegue executar operações administrativas permitidas.
- Toda correção de horário real exige justificativa e auditoria.

### WhatsApp
- Webhook válido atualiza confirmação.
- Webhook inválido é rejeitado.
- Evento repetido não duplica efeitos.
- Falha de envio não perde a participação.
- `NO_RESPONSE` não é tratado como `DECLINED`.

### Estados da viagem
- `CANCELLED` permitido somente antes do início.
- Viagem iniciada não pode ser cancelada como se nunca tivesse ocorrido.
- `INTERRUPTED` exige motivo e registro de providência.
- Horários reais são gerados no servidor.

## 3. Dados

Todos os dados de teste devem ser fictícios. Não usar nomes, telefones, documentos ou endereços reais de pacientes.
