# Segurança e privacidade

## 1. Princípios

- Finalidade específica: organizar transporte municipal de pacientes.
- Minimização: coletar apenas o necessário para identificar, contatar e transportar.
- Menor privilégio: cada papel acessa somente o necessário.
- Rastreabilidade: ações críticas identificam ator e instante.
- Segurança desde o projeto: controles devem existir no backend e banco.

## 2. Dados pessoais

O sistema pode tratar dados pessoais e, dependendo dos campos e do contexto, dados pessoais sensíveis. A Secretaria de Saúde e os responsáveis pelo projeto devem validar base legal, finalidade, transparência, retenção e responsabilidades antes de utilizar dados reais.

Não incluir diagnósticos, tipo sanguíneo ou histórico clínico no escopo atual. Indicadores de acessibilidade devem ser objetivos e limitados à necessidade operacional do transporte.

## 3. Controle de acesso

### ADMIN
Acesso administrativo às funções necessárias para gerenciar pacientes, viagens, frota, prioridades, rotas, confirmações e ocorrências.

### MOTORISTA
Acesso apenas às viagens atribuídas e às informações operacionais necessárias: nome, telefone, acompanhantes/contatos e indicadores mínimos de embarque/acessibilidade. Não deve visualizar CPF, Cartão SUS, endereço completo ou diagnóstico.

## 4. Autenticação e credenciais

- Armazenar somente hash de senha com algoritmo apropriado.
- Nunca armazenar senha em texto puro.
- Usar HTTPS em ambientes publicados.
- Guardar segredos em variáveis de ambiente/secret manager.
- Não versionar `.env`.
- Planejar recuperação de senha com tokens de uso único, expiração e armazenamento seguro.

## 5. Logs e auditoria

- Não registrar senhas, tokens, conteúdo integral de mensagens ou payloads com dados pessoais desnecessários.
- Auditoria deve registrar ator, ação, entidade, instante e justificativa quando aplicável.
- Limitar mudanças armazenadas ao necessário para comprovar a operação.
- Proteger logs contra acesso e alteração indevidos.

## 6. WhatsApp

- Utilizar integração oficial.
- Validar autenticidade dos webhooks conforme documentação do provedor.
- Implementar idempotência para eventos repetidos.
- Não incluir dados clínicos em mensagens.
- Registrar eventos técnicos mínimos, não conversas completas.
- Definir opt-in/base legal e quem está autorizado a responder pelo paciente.

## 7. Dados de desenvolvimento

Usar dados inteiramente fictícios. Não copiar planilhas, cadastros ou contatos reais para ambientes acadêmicos, testes, ferramentas de IA ou serviços gratuitos.

## 8. Pendências obrigatórias antes de produção

- Avaliação formal de privacidade/LGPD pela Secretaria e responsáveis.
- Definição de base legal, aviso de privacidade e canal para titulares.
- Política de retenção, descarte, backup e restauração.
- Controle de acesso administrativo e revisão periódica.
- Plano de resposta a incidentes.
- Avaliação de hospedagem, operadores, contratos e transferências internacionais, quando aplicável.
