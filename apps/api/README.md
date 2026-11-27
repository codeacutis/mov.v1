<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://coveralls.io/github/nestjs/nest?branch=master" target="_blank"><img src="https://coveralls.io/repos/github/nestjs/nest/badge.svg?branch=master#9" alt="Coverage" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).

## Participações em viagens

As rotas abaixo exigem o papel `ADMIN`.

| Rota | Operação |
| --- | --- |
| `GET /trips/:tripId/patient-trips` | Lista participações e prioridades. |
| `POST /trips/:tripId/patient-trips` | Inclui paciente ativo em viagem agendada, com dados da consulta, prioridade e justificativa. Cada paciente só pode aparecer uma vez na viagem. Pacientes e acompanhantes ocupam vagas. |
| `PATCH /patient-trips/:id` | Atualiza dados planejados antes do início. Para definir prioridade, envie `priority` e `priorityJustification`. |
| `PATCH /patient-trips/:id/cancel` | Cancela logicamente antes do início com `reason` obrigatório, autor e instante do servidor, liberando vagas sem excluir o registro. |
| `PATCH /patient-trips/:id/outbound-status` | Altera somente o estado de ida da participação indicada. |
| `PATCH /patient-trips/:id/return-status` | Altera somente o estado de retorno da participação indicada. |

As rotas de estado recebem `status`. No retorno, envie também `reason` para `NOT_RETURNING` (aviso prévio) ou `NO_SHOW` (ausência constatada). O backend registra autor e horário. A participação continua na viagem e a ida permanece independente. A falta de confirmação não aciona alteração automática. O registro administrativo de ausência não define quando o motorista pode seguir viagem.

A tela **Participantes e detalhes** centraliza consulta, prioridade, acompanhante e ocupação; confirmação é somente leitura. A participação cancelada permanece única por paciente/viagem, sem reinclusão automática. A remoção de acompanhante agora mantém o registro com `removedAt` e gera auditoria. Participações canceladas e acompanhantes removidos não ocupam vagas nem integram a lista operacional do motorista. Alterações planejadas de acompanhantes exigem participação ativa e viagem agendada. Registros excluídos antes desta versão não são recuperados.

Aplicar a migration `20261126150000_participation_history` antes de executar esta versão.

### Portal operacional do motorista

Após login ou restauração, `/auth/me` determina o perfil e a área inicial. Sessão inválida/expirada remove o token local e retorna ao login. O portal utiliza exclusivamente os contratos operacionais abaixo, sem consultas administrativas.

| Método | Endpoint | Contrato |
| --- | --- | --- |
| GET | `/driver/trips` | Array de viagens atribuídas ao Driver ativo |
| GET | `/driver/trips/:id` | Detalhe operacional com participantes e rota aprovada |
| PATCH | `/driver/trips/:id/start` | Iniciar ida com rota aprovada |
| PATCH | `/driver/trips/:id/start-return` | Registrar início real do retorno uma única vez |
| PATCH | `/driver/trips/:id/complete` | Concluir após início do retorno |
| PATCH | `/driver/trips/:id/participants/:participationId/outbound-status` | `{ status: "BOARDED" ou "NO_SHOW" }`, durante a ida |
| PATCH | `/driver/trips/:id/participants/:participationId/return-status` | `{ status: "RETURNED", "NOT_RETURNING" ou "NO_SHOW", reason?, contactAttempt? }` |
| POST | `/driver/trips/:id/observations` | `{ type: "INCIDENT" ou "CONTACT_ATTEMPT", description, patientTripId? }` |

Mutações respondem `204`; os dados atualizados são recarregados pelo GET operacional. O vínculo é validado dentro da transação, usando os serviços compartilhados de viagens e participações. Outro motorista recebe `404`; ADMIN usa os endpoints administrativos. Ida e retorno permanecem independentes. `NOT_RETURNING` exige motivo e pode ser informado durante a viagem; embarque e ausência no retorno exigem retorno iniciado. `NO_SHOW` no retorno exige motivo e descrição da tentativa de contato e preserva duas observações na mesma transação. Tentativa de contato avulsa exige participação da mesma viagem.

Todos os horários reais e de auditoria são gerados no servidor. Não há timeout, autorização adicional de saída nem mudança automática de participantes pendentes. A consulta não inclui notas livres de paradas, textos de ocorrências, parentesco, prioridade, confirmação ou dados pessoais além dos necessários à operação.

Aplicar a migration `20261126190000_driver_operations` antes de executar o portal; registros antigos mantêm início real do retorno nulo e observações anteriores ficam com tipo `INCIDENT`.

### Paradas e aprovação da rota

Rotas exclusivas do ADMIN, sob `/trips/:tripId/stops`:

| Método | Caminho relativo | Operação |
| --- | --- | --- |
| GET | `/` | Paradas e participantes ativos associados |
| POST | `/` | Cadastrar parada |
| PATCH | `/:stopId` | Editar parada com o contrato completo de criação |
| DELETE | `/:stopId` | Remover parada planejada e desfazer vínculos |
| PATCH | `/reorder` | `{ direction: "OUTBOUND", stopIds: [...] }`, lista completa em ordem manual |
| POST | `/rebuild-return` | Sincronizar novamente o retorno inverso a partir da ida |

Alterações da ida sincronizam automaticamente locais e vínculos do retorno. A sequência é crescente na ida e decrescente no retorno. O retorno pode receber previsão de chegada própria; horários da ida não são copiados. Ao mudar o local correspondente, a previsão anterior do retorno é limpa para revisão. A interface seleciona somente participantes ativos desta viagem, usando `patientId` no campo `patients`; os vínculos persistem em `PatientTrip.outboundStopId` e `returnStopId`.

`PATCH /trips/:id/approve-route` valida os dois sentidos e os vínculos de todos os participantes ativos. Somente viagens `SCHEDULED` aceitam mutações e aprovação. Mudanças de paradas, endereços, sequência ou vínculos invalidam aprovação e responsável na mesma transação, com auditoria. Inclusão/cancelamento de participante, alteração de consulta e edição da viagem também invalidam a aprovação. A consulta do motorista usa o mesmo bloqueio transacional e oculta paradas e seus vínculos enquanto não houver nova aprovação.

Não há mapas, GPS ou sugestão automática; a decisão mais recente D-014 substitui a proposta anterior.


### Manuten??o administrativa de motoristas

`POST /users` recusa `MOTORISTA`: utilize `POST /drivers`, que cria conta e cadastro em uma transa??o com auditoria. A edi??o em `PATCH /drivers/:id` inclui dados da conta e habilita??o. A inativa??o mant?m o hist?rico e desativa Driver e User juntos.

`GET /drivers/inconsistencies` ? exclusivo do ADMIN e retorna identificadores de contas MOTORISTA sem Driver e v?nculos com papel ou situa??o divergentes. ? uma consulta para revis?o manual; n?o remove nem corrige registros existentes automaticamente.

As listagens administrativas aceitam `q`, `page` e `limit`, com ordena??o definida no servidor. N?o h? contrato para filtros adicionais ou ordena??o escolhida pelo cliente. A interface de viagens utiliza essa busca paginada e oferece edi??o/cancelamento em `SCHEDULED` e interrup??o em `IN_PROGRESS`; o backend revalida a situa??o em cada opera??o.

## Documentação automática da API

O Swagger usa `@nestjs/swagger`, com identificação **Mov+**, versão **1.0**, tags por módulo e autenticação Bearer JWT. A interface fica em `/api/docs`; os contratos em `/api/docs-json` e `/api/docs-yaml`, na mesma origem da API. As rotas de negócio mantêm seus caminhos atuais, sem prefixo `/api`.

`SWAGGER_ENABLED=true` habilita a publicação da documentação; `false` a desabilita, incluindo JSON, YAML e recursos da interface. Sem a variável, fica habilitada fora de `NODE_ENV=production` e desabilitada em produção. Valores diferentes de `true`/`false` impedem a inicialização. Habilitar em ambiente publicado torna a documentação pública: configure essa opção conforme a política do ambiente e, se necessário, restrinja o acesso na infraestrutura.

Para testar: execute `POST /auth/login` com uma conta fictícia autorizada, copie `accessToken`, clique em **Authorize** e informe somente o token. A interface envia `Authorization: Bearer …`. A autorização não persiste após recarregar a página. Os guards continuam verificando sessão, perfil e vínculo com a viagem; disponibilizar o Swagger não concede acesso aos endpoints. `POST /auth/bootstrap` só cria o primeiro ADMIN e exige o cabeçalho de inicialização configurado em produção; nunca salve seu valor na documentação.

Os DTOs documentam campos obrigatórios/opcionais, limites e enums. As respostas têm schemas distintos das entidades de persistência, sem hashes, sessões internas ou segredos. Endpoints do motorista apresentam somente os dados operacionais retornados por seus serviços. Os principais erros seguem `{ statusCode, message }`: **400** validação/regra de negócio, **401** autenticação, **403** permissão, **404** registro inacessível/inexistente e **409** conflito de agenda, capacidade, duplicidade ou estado. Erros **500** não incluem detalhes internos. Sucessos usam **200**, **201**, **202** ou **204**, conforme cada operação.

As listagens paginadas retornam `{ data, total, page, limit }`, com `page=1`, `limit=20` e máximo de 100. Busca, filtros e ordenação estão descritos nas operações; não há parâmetro genérico de ordenação. Listas do motorista, participações, acompanhantes, paradas, agenda e relatórios não usam paginação. Períodos de dashboard, agenda e relatórios usam início inclusivo e fim exclusivo. A exportação XLSX tem conteúdo binário e o mesmo conjunto de filtros do relatório JSON.

Esta documentação representa os contratos **implementados**, sem promover decisões pendentes ou alterar validações. Lacunas preexistentes em relação à Release 4 permanecem visíveis: telefone ainda é opcional no DTO de paciente, CPF não é aceito por esse DTO e chegada prevista ao município ainda não integra o DTO de viagem. Não enviar campos ausentes do contrato: a validação recusa propriedades desconhecidas.

Manutenção: ao mudar contratos, atualize os decoradores nos controllers/DTOs e os schemas de saída em `src/documentation/response-schemas.ts`. Os testes em `src/documentation/swagger.spec.ts` verificam geração, referências, rotas publicadas/desabilitadas, paginação, JWT, respostas e preservação dos guards. A configuração segue a [documentação oficial do NestJS](https://docs.nestjs.com/openapi/introduction).

A dependência Swagger 7 é compatível com NestJS 10. O override específico de `@nestjs/mapped-types` reutiliza a versão já adotada pelo projeto, compatível com `class-validator` 0.15, evitando o conflito de peer dependency da versão transitiva antiga.
