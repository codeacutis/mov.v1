# Auditoria e histórico operacional

As alterações operacionais continuam usando `AuditService.record` na mesma transação Prisma da operação. Um interceptor que grave depois do handler não compartilha essa transação e produziria registros duplicados para operações já cobertas; por isso não foi aplicado genericamente. O evento identifica ator, ação, entidade, identificador e instante; alterações são minimizadas. Registros antigos não são modificados nem recriados.

`GET /audit` é restrito a ADMIN, somente leitura, paginado, com busca por nome do responsável, ação ou entidade, além de filtros de ação, entidade, responsável e intervalo de instantes (`start` inclusivo, `end` exclusivo). `GET /trips/:id/observations` é restrito a ADMIN e retorna ocorrências com autor e vínculo à participação quando disponível.

`PATCH /trips/:id/actual-times` exige ADMIN, justificativa e pelo menos um horário real previamente registrado. Não cria evento operacional ausente. Os horários corrigidos não podem estar no futuro e devem respeitar a ordem cronológica dos horários existentes. Mudança e auditoria (antes/depois e justificativa) são atômicas e usam o mesmo bloqueio operacional das demais alterações da viagem. A correção não altera o estado da viagem. Os horários originais podem ser recuperados nos eventos de auditoria, inclusive após múltiplas correções.

Observações e justificativas são texto livre operacional; o usuário deve evitar dados clínicos ou pessoais desnecessários. A consulta de auditoria pode apresentar conteúdo legado já registrado, sem promessa de saneamento retroativo.
